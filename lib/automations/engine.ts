// Automation Engine — the core dispatch loop.
//
// runAutomations() is designed to be fire-and-forget safe:
//   - Catches all errors internally; never throws or rejects
//   - Returns void — callers use `void runAutomations(...)`
//   - Same pattern as logAction() in lib/utils/audit.ts
//
// Usage:
//   void runAutomations('task.completed', { id: task.id, status: 'done', ... });

import { listActiveRulesByTrigger, insertRunLog } from '@/lib/db/automations';
import { evaluateConditions } from './conditions';
import { executeAction } from './actions';
import type { AutomationTriggerType, ActionResult } from '@/lib/types/automations';

/**
 * Dispatches all active rules for a trigger type against the provided trigger data.
 * Evaluates conditions, executes actions in order, and writes one run log row per rule.
 * Never throws — all errors are caught and logged internally.
 */
export async function runAutomations(
  triggerType: AutomationTriggerType,
  triggerData: Record<string, unknown>,
): Promise<void> {
  try {
    const { data: rules, error: rulesError } = await listActiveRulesByTrigger(triggerType);
    if (rulesError || !rules || rules.length === 0) return;

    for (const rule of rules) {
      try {
        const entityId = String(
          triggerData.id ??
          triggerData.itemId ??
          triggerData.taskId ??
          triggerData.proposalId ??
          'unknown',
        );

        // Evaluate conditions — skip if they don't pass
        const conditionsMet = evaluateConditions(rule.conditions, triggerData);
        if (!conditionsMet) {
          await insertRunLog({
            ruleId:          rule.id,
            triggerType,
            entityId,
            triggerData,
            status:          'skipped',
            actionsExecuted: [],
          });
          continue;
        }

        // Execute each action in order, collecting results
        const actionsExecuted: ActionResult[] = [];
        let ruleStatus: 'success' | 'failed' = 'success';
        let firstError: string | undefined;

        for (const action of rule.actions) {
          const result = await executeAction(action, triggerData);
          actionsExecuted.push(result);
          if (result.status === 'failed') {
            ruleStatus = 'failed';
            firstError = result.error;
            break; // Stop executing further actions on first failure
          }
        }

        await insertRunLog({
          ruleId:          rule.id,
          triggerType,
          entityId,
          triggerData,
          status:          ruleStatus,
          errorMessage:    firstError,
          actionsExecuted,
        });
      } catch (ruleErr) {
        // Individual rule errors must not prevent other rules from running
        console.error(`[runAutomations] Error processing rule ${rule.id}:`, ruleErr);
      }
    }
  } catch (err) {
    // Top-level catch — never crash the caller
    console.error('[runAutomations] Unexpected error:', err);
  }
}
