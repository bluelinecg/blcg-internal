// Action executor for the Automation Engine.
// executeAction() handles each supported action type, calling existing lib/db functions.
// send_notification and send_email are stubs that log intent — no delivery yet.
// send_webhook dispatches via the existing webhook delivery infrastructure.

import { createTask, updateTask } from '@/lib/db/tasks';
import { updateItem } from '@/lib/db/pipelines';
import { updateProposal } from '@/lib/db/proposals';
import { dispatchWebhookEvent } from '@/lib/utils/webhook-delivery';
import { insertNotification } from '@/lib/db/notifications';
import type { AutomationAction, ActionResult } from '@/lib/types/automations';
import type { WebhookEventType } from '@/lib/types/webhooks';

/**
 * Resolves template variables in a string.
 * Supported: {{item.title}}, {{item.id}}, {{task.title}}, {{task.id}},
 *            {{proposal.title}}, {{proposal.id}}
 */
function resolveTemplate(template: string, triggerData: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, key: string) => {
    const parts = key.trim().split('.');
    // Flatten nested access: item.title → triggerData.title or triggerData.item.title
    const direct = triggerData[parts[parts.length - 1]];
    return direct !== undefined ? String(direct) : '';
  });
}

/**
 * Executes a single automation action.
 * Returns an ActionResult summary — never throws.
 */
export async function executeAction(
  action: AutomationAction,
  triggerData: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    switch (action.type) {

      case 'create_task': {
        const cfg = action.config;
        const title = resolveTemplate(String(cfg.title ?? 'Untitled task'), triggerData);
        const { error } = await createTask({
          title,
          description: cfg.description ? resolveTemplate(String(cfg.description), triggerData) : undefined,
          status:      'todo',
          priority:    (cfg.priority as 'urgent' | 'high' | 'medium' | 'low') ?? 'medium',
          assignee:    cfg.assigneeId ? String(cfg.assigneeId) : undefined,
          dueDate:     cfg.dueOffset ? resolveDueDate(Number(cfg.dueOffset)) : undefined,
          recurrence:  'none',
          checklist:   [],
          blockedBy:   [],
        });
        if (error) return { type: action.type, status: 'failed', error };
        return { type: action.type, status: 'success' };
      }

      case 'move_to_stage': {
        const itemId  = String(triggerData.itemId ?? triggerData.id ?? '');
        const stageId = String(action.config.stageId ?? '');
        if (!itemId || !stageId) {
          return { type: action.type, status: 'failed', error: 'Missing itemId or stageId' };
        }
        const { error } = await updateItem(itemId, { stageId });
        if (error) return { type: action.type, status: 'failed', error };
        return { type: action.type, status: 'success' };
      }

      case 'update_status': {
        // Determine entity type from trigger data shape and update accordingly.
        // Proposals have a status field; tasks have a status field.
        const status = String(action.config.status ?? '');
        if (!status) return { type: action.type, status: 'failed', error: 'Missing status' };

        const entityId = String(triggerData.id ?? triggerData.taskId ?? triggerData.proposalId ?? '');
        if (!entityId) return { type: action.type, status: 'failed', error: 'Missing entity id in trigger data' };

        // If triggerData indicates a proposal context, update proposal.
        // If it indicates task context (taskId present), update task.
        // Otherwise, try to update as pipeline item (though they don't have a status field).
        if (triggerData.proposalId || triggerData.proposalNumber) {
          const { error } = await updateProposal(entityId, { status: status as Parameters<typeof updateProposal>[1]['status'] });
          if (error) return { type: action.type, status: 'failed', error };
        } else if (triggerData.taskId) {
          const { error } = await updateTask(entityId, { status: status as Parameters<typeof updateTask>[1]['status'] });
          if (error) return { type: action.type, status: 'failed', error };
        } else {
          // Pipeline item context - just pass through and let DB validation handle it
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await updateItem(entityId, { status } as any);
          if (error) return { type: action.type, status: 'failed', error };
        }
        return { type: action.type, status: 'success' };
      }

      case 'assign_user': {
        const idToUpdate = String(triggerData.itemId ?? triggerData.taskId ?? triggerData.id ?? '');
        const userId = String(action.config.userId ?? '');
        if (!idToUpdate || !userId) {
          return { type: action.type, status: 'failed', error: 'Missing id or userId' };
        }
        // Determine entity type from trigger data
        if (triggerData.proposalId || triggerData.proposalNumber) {
          // Proposals don't support direct assignment in the same way
          return { type: action.type, status: 'failed', error: 'Cannot assign users to proposals' };
        } else if (triggerData.taskId) {
          // Task context
          const { error } = await updateTask(idToUpdate, { assignee: userId });
          if (error) return { type: action.type, status: 'failed', error };
        } else {
          // Pipeline item context (default)
          const { error } = await updateItem(idToUpdate, { assigneeId: userId } as unknown as Parameters<typeof updateItem>[1]);
          if (error) return { type: action.type, status: 'failed', error };
        }
        return { type: action.type, status: 'success' };
      }

      case 'send_notification': {
        const body        = resolveTemplate(String(action.config.message ?? ''), triggerData);
        const title       = action.config.title
          ? resolveTemplate(String(action.config.title), triggerData)
          : 'Automation notification';
        const recipientId = action.config.recipientId
          ? String(action.config.recipientId)
          : String(triggerData.assigneeId ?? triggerData.actorId ?? triggerData.userId ?? '');

        if (!recipientId) {
          return { type: action.type, status: 'failed', error: 'No recipient resolved for send_notification' };
        }

        const { error } = await insertNotification({
          userId: recipientId,
          type:   'automation',
          title,
          body,
        });
        if (error) return { type: action.type, status: 'failed', error };
        return { type: action.type, status: 'success' };
      }

      case 'send_email': {
        // Stub — logs intent. Replace with real email delivery in a future phase.
        const subject     = resolveTemplate(String(action.config.subject ?? ''), triggerData);
        const recipientId = action.config.recipientId ? String(action.config.recipientId) : 'unknown';
        console.error(`[automation:send_email] STUB — to: ${recipientId}, subject: ${subject}`);
        return { type: action.type, status: 'success' };
      }

      case 'send_webhook': {
        // Dispatches to registered outbound webhook endpoints via the existing delivery system.
        // event_type is passed as a pipeline.item_stage_changed or similar known type.
        const eventType = String(action.config.eventType ?? 'pipeline.item_stage_changed') as WebhookEventType;
        await dispatchWebhookEvent(eventType, triggerData);
        return { type: action.type, status: 'success' };
      }

      default: {
        const exhaustiveCheck: never = action.type;
        return { type: exhaustiveCheck, status: 'failed', error: `Unknown action type: ${String(exhaustiveCheck)}` };
      }
    }
  } catch (err) {
    return {
      type:   action.type,
      status: 'failed',
      error:  err instanceof Error ? err.message : 'Unexpected error',
    };
  }
}

/** Returns an ISO date string offset by daysAhead from now. */
function resolveDueDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0] + 'T00:00:00Z';
}
