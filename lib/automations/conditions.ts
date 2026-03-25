// Pure condition evaluator for the Automation Engine.
// No DB calls — takes conditions and trigger data, returns boolean.
// Designed to be fully testable without mocks.

import type { Condition } from '@/lib/types/automations';

/**
 * Evaluates all conditions against the trigger data payload.
 * Returns true if ALL conditions pass (AND logic), or if conditions is empty.
 * A missing field in triggerData is treated as a non-match.
 */
export function evaluateConditions(
  conditions: Condition[],
  triggerData: Record<string, unknown>,
): boolean {
  if (conditions.length === 0) return true;

  return conditions.every((condition) => {
    const fieldValue = String(triggerData[condition.field] ?? '');
    const condValue  = condition.value;

    switch (condition.operator) {
      case 'is':     return fieldValue === condValue;
      case 'is_not': return fieldValue !== condValue;
      default:       return false;
    }
  });
}
