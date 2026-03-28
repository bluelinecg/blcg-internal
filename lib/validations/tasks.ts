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

export const ChecklistItemSchema = z.object({
  id:        z.string(),
  text:      z.string().min(1),
  completed: z.boolean(),
});

const TaskBaseSchema = z.object({
  title:       z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status:      TaskStatusSchema,
  priority:    TaskPrioritySchema,
  sortOrder:   z.number().int().min(0).optional(),
  projectId:   z.string().optional(),
  // assignee is a Clerk user ID — plain string until user-lookup is wired
  assignee:    z.string().optional(),
  dueDate:     z.string().datetime({ offset: true }).optional(),
  recurrence:  TaskRecurrenceSchema.default('none'),
  checklist:   z.array(ChecklistItemSchema).default([]),
  blockedBy:   z.array(z.string().uuid()).default([]),
});

export const TaskSchema = TaskBaseSchema.refine(
  (data) => data.recurrence === 'none' || !!data.dueDate,
  { message: 'Due date is required for recurring tasks', path: ['dueDate'] },
);

// UpdateTaskSchema uses the base object without the refinement.
// A PATCH payload may change only recurrence or only dueDate — the DB record
// holds the other field, so the refinement cannot be evaluated here.
export const UpdateTaskSchema = TaskBaseSchema.partial();

export const ReorderTasksSchema = z.object({
  status:     TaskStatusSchema,
  orderedIds: z.array(z.string().uuid()).min(1),
});

export type TaskInput = z.infer<typeof TaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type ReorderTasksInput = z.infer<typeof ReorderTasksSchema>;
