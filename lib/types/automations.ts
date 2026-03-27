// TypeScript types for the Automation Engine.
// AutomationRule    — a user-configured trigger + conditions + actions rule.
// AutomationRunLog  — one execution record per rule evaluation.

export type AutomationTriggerType =
  // Event-based
  | 'pipeline.item_stage_changed'
  | 'task.status_changed'
  | 'task.completed'
  | 'proposal.created'
  | 'proposal.status_changed'
  | 'invoice.status_changed'
  // Time-based / SLA
  | 'sla.stage_time_exceeded'
  | 'sla.task_overdue'
  | 'schedule.daily';

export type AutomationActionType =
  | 'create_task'
  | 'move_to_stage'
  | 'update_status'
  | 'assign_user'
  | 'send_notification'
  | 'send_email'
  | 'send_webhook';

export type AutomationRunStatus = 'success' | 'failed' | 'skipped';

export type ConditionOperator = 'is' | 'is_not';

export interface Condition {
  field:    string;
  operator: ConditionOperator;
  value:    string;
}

export interface AutomationAction {
  type:   AutomationActionType;
  config: Record<string, unknown>;
}

export interface AutomationRule {
  id:            string;
  name:          string;
  description:   string | undefined;
  isActive:      boolean;
  triggerType:   AutomationTriggerType;
  triggerConfig: Record<string, unknown>;
  conditions:    Condition[];
  actions:       AutomationAction[];
  createdBy:     string;
  createdAt:     string;
  updatedAt:     string;
}

export interface AutomationRunLog {
  id:              string;
  ruleId:          string;
  triggerType:     AutomationTriggerType;
  entityId:        string;
  triggerData:     Record<string, unknown>;
  status:          AutomationRunStatus;
  errorMessage:    string | undefined;
  actionsExecuted: ActionResult[];
  executedAt:      string;
}

export interface ActionResult {
  type:    AutomationActionType;
  status:  'success' | 'failed' | 'skipped';
  error?:  string;
}
