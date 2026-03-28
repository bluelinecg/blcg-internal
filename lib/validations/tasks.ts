import { z } from 'zod';

export const TaskStatusSchema = z.enum([
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'done',
]);

export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export const TaskRecurrenceSchema = z.enum(['none', 'daily', 'weekly', 'biweekly', 'monthly']);

export const TaskTypeSchema = z.enum([
  'feature',
  'bug',
  'refactor',
  'architecture',
  'automation',
  'ai',
  'infra',
  'data-integrity',
  'validation',
  'chore',
]);

export const TaskModuleSchema = z.enum([
  'core',
  'finance',
  'integrations',
  'automation',
  'pipelines',
  'crm',
  'tasks',
  'client-portal',
  'notifications',
  'operations',
  'documents',
  'ai',
]);

export const ChecklistItemSchema = z.object({
  id:        z.string(),
  text:      z.string().min(1),
  completed: z.boolean(),
});

export const TaskSchema = z.object({
  title:          z.string().min(1, 'Title is required'),
  description:    z.string().optional(),
  status:         TaskStatusSchema,
  priority:       TaskPrioritySchema,
  sortOrder:      z.number().int().min(0).optional(),
  projectId:      z.string().uuid().optional(),
  clientId:       z.string().uuid().optional(),
  // assignee is a Clerk user ID — plain string until user-lookup is wired
  assignee:       z.string().optional(),
  dueDate:        z.string().datetime({ offset: true }).optional(),
  recurrence:     TaskRecurrenceSchema.default('none'),
  checklist:      z.array(ChecklistItemSchema).default([]),
  blockedBy:      z.array(z.string().uuid()).default([]),
  taskType:       TaskTypeSchema.optional(),
  module:         TaskModuleSchema.optional(),
  epic:           z.string().optional(),
  estimatedHours: z.number().positive().optional(),
});

export const UpdateTaskSchema = TaskSchema.partial();

export const ReorderTasksSchema = z.object({
  status:     TaskStatusSchema,
  orderedIds: z.array(z.string().uuid()).min(1),
});

export type TaskInput = z.infer<typeof TaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type ReorderTasksInput = z.infer<typeof ReorderTasksSchema>;
