// POST /api/automations/process-scheduled — Vercel Cron handler
//
// Called hourly by Vercel Cron. Processes all active time-based and SLA rules.
// Protected by CRON_SECRET — Vercel injects it automatically as:
//   Authorization: Bearer <CRON_SECRET>
//
// Returns: { rulesChecked, entitiesEvaluated, actionsTriggered }

import { NextResponse } from 'next/server';
import {
  listActiveRulesByTrigger,
  getLastRunForEntity,
  fetchStageItemsForRule,
  fetchOverdueTasksForRule,
} from '@/lib/db/automations';
import { runAutomations } from '@/lib/automations/engine';
import { config } from '@/lib/config';
import { SCHEDULED_TRIGGER_TYPES } from '@/lib/constants/automations';
import type { AutomationTriggerType } from '@/lib/types/automations';

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

function isCronAuthorized(request: Request): boolean {
  const secret = config.cronSecret;
  if (!secret) return false;
  const auth = request.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let rulesChecked      = 0;
  let entitiesEvaluated = 0;
  let actionsTriggered  = 0;

  try {
    for (const triggerType of SCHEDULED_TRIGGER_TYPES) {
      const { data: rules, error } = await listActiveRulesByTrigger(
        triggerType as AutomationTriggerType,
      );
      if (error || !rules || rules.length === 0) continue;

      for (const rule of rules) {
        rulesChecked++;

        if (triggerType === 'sla.stage_time_exceeded') {
          const { pipelineId, stageId, thresholdHours } = rule.triggerConfig as {
            pipelineId: string;
            stageId: string;
            thresholdHours: number;
          };
          if (!pipelineId || !stageId || !thresholdHours) continue;

          const candidates = await fetchStageItemsForRule(pipelineId, stageId, thresholdHours);

          for (const item of candidates) {
            entitiesEvaluated++;

            // SLA dedup: skip if already fired for this item after it entered the current stage
            const { data: lastRun } = await getLastRunForEntity(rule.id, item.id);
            if (lastRun && lastRun.executedAt > item.entered_stage_at) continue;

            actionsTriggered++;
            void runAutomations('sla.stage_time_exceeded', {
              id:              item.id,
              itemId:          item.id,
              pipelineId:      item.pipeline_id,
              stageId:         item.stage_id,
              enteredStageAt:  item.entered_stage_at,
              title:           item.title,
            });
          }
        }

        if (triggerType === 'sla.task_overdue') {
          const { thresholdHours, priority } = rule.triggerConfig as {
            thresholdHours: number;
            priority?: string;
          };
          if (!thresholdHours) continue;

          const candidates = await fetchOverdueTasksForRule(thresholdHours, priority);

          for (const task of candidates) {
            entitiesEvaluated++;

            // SLA dedup: skip if already fired within the threshold window
            const { data: lastRun } = await getLastRunForEntity(rule.id, task.id);
            if (lastRun) {
              const windowStart = new Date(Date.now() - thresholdHours * 60 * 60 * 1000).toISOString();
              if (lastRun.executedAt > windowStart) continue;
            }

            actionsTriggered++;
            void runAutomations('sla.task_overdue', {
              id:       task.id,
              taskId:   task.id,
              dueDate:  task.due_date ?? '',
              priority: task.priority,
              assignee: task.assignee_id ?? '',
            });
          }
        }

        if (triggerType === 'schedule.daily') {
          entitiesEvaluated++;

          // Dedup: skip if already fired within the last 23 hours
          const { data: lastRun } = await getLastRunForEntity(rule.id, 'daily');
          if (lastRun) {
            const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();
            if (lastRun.executedAt > twentyThreeHoursAgo) continue;
          }

          actionsTriggered++;
          void runAutomations('schedule.daily', {
            id:          'daily',
            scheduledAt: new Date().toISOString(),
            timezone:    (rule.triggerConfig.timezone as string) ?? 'UTC',
          });
        }
      }
    }

    return NextResponse.json({ rulesChecked, entitiesEvaluated, actionsTriggered });
  } catch (err) {
    console.error('[POST /api/automations/process-scheduled]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
