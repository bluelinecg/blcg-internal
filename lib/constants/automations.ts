// Display labels and metadata for the Automation Engine.
// Used by the UI form modal and the automations list page.

import type { AutomationTriggerType, AutomationActionType, ConditionOperator } from '@/lib/types/automations';

export const TRIGGER_TYPES: Record<AutomationTriggerType, string> = {
  'pipeline.item_stage_changed': 'Pipeline Item — Stage Changed',
  'task.status_changed':         'Task — Status Changed',
  'task.completed':              'Task — Completed',
  'proposal.status_changed':     'Proposal — Status Changed',
  'sla.stage_time_exceeded':     'SLA — Item in Stage Too Long',
  'sla.task_overdue':            'SLA — Task Overdue',
  'schedule.daily':              'Schedule — Daily',
};

export const ACTION_TYPES: Record<AutomationActionType, string> = {
  create_task:       'Create Task',
  move_to_stage:     'Move to Stage',
  update_status:     'Update Status',
  assign_user:       'Assign User',
  send_notification: 'Send Notification',
  send_email:        'Send Email',
  send_webhook:      'Send Webhook',
};

export const CONDITION_OPERATORS: Record<ConditionOperator, string> = {
  is:     'is',
  is_not: 'is not',
};

// Fields available as condition targets, grouped by trigger category.
// The engine evaluates these against the triggerData payload at runtime.
export const CONDITION_FIELDS: Record<AutomationTriggerType, string[]> = {
  'pipeline.item_stage_changed': ['stageId', 'previousStageId', 'pipelineId', 'title'],
  'task.status_changed':         ['status', 'previousStatus', 'priority', 'assignee', 'projectId'],
  'task.completed':              ['priority', 'assignee', 'projectId', 'recurrence'],
  'proposal.status_changed':     ['status', 'previousStatus', 'organizationId'],
  'sla.stage_time_exceeded':     ['pipelineId', 'stageId'],
  'sla.task_overdue':            ['priority', 'assignee'],
  'schedule.daily':              [],
};

// Trigger types that require a pipelineId in their trigger_config.
export const PIPELINE_SCOPED_TRIGGERS: AutomationTriggerType[] = [
  'pipeline.item_stage_changed',
  'sla.stage_time_exceeded',
];

// Trigger types that are time-based (processed by the cron route).
export const SCHEDULED_TRIGGER_TYPES: AutomationTriggerType[] = [
  'sla.stage_time_exceeded',
  'sla.task_overdue',
  'schedule.daily',
];

// Trigger types that are event-based (fired inline from API routes).
export const EVENT_TRIGGER_TYPES: AutomationTriggerType[] = [
  'pipeline.item_stage_changed',
  'task.status_changed',
  'task.completed',
  'proposal.status_changed',
];
