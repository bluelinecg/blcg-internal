import { z } from 'zod';

// ---------------------------------------------------------------------------
// Condition
// ---------------------------------------------------------------------------
export const ConditionSchema = z.object({
  field:    z.string().min(1, 'Condition field is required'),
  operator: z.enum(['is', 'is_not']),
  value:    z.string().min(1, 'Condition value is required'),
});

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------
export const AutomationActionSchema = z.object({
  type: z.enum([
    'create_task',
    'move_to_stage',
    'update_status',
    'assign_user',
    'send_notification',
    'send_email',
    'send_webhook',
  ] as const),
  config: z.record(z.string(), z.unknown()),
});

// ---------------------------------------------------------------------------
// Automation Rule — create
// ---------------------------------------------------------------------------
export const AutomationRuleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
  triggerType: z.enum([
    'pipeline.item_stage_changed',
    'task.status_changed',
    'task.completed',
    'proposal.status_changed',
    'sla.stage_time_exceeded',
    'sla.task_overdue',
    'schedule.daily',
  ] as const),
  triggerConfig: z.record(z.string(), z.unknown()).optional().default({}),
  conditions: z.array(ConditionSchema).default([]),
  actions: z.array(AutomationActionSchema).min(1, 'At least one action is required'),
});

// ---------------------------------------------------------------------------
// Automation Rule — update (all fields optional)
// ---------------------------------------------------------------------------
export const UpdateAutomationRuleSchema = AutomationRuleSchema.partial();

// ---------------------------------------------------------------------------
// Inferred input types
// ---------------------------------------------------------------------------
export type AutomationRuleInput = z.infer<typeof AutomationRuleSchema>;
export type UpdateAutomationRuleInput = z.infer<typeof UpdateAutomationRuleSchema>;
