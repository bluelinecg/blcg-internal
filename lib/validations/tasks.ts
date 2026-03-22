import { z } from 'zod';

export const TaskStatusSchema = z.enum([
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'done',
]);

export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export const TaskSchema = z.object({
  title:       z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status:      TaskStatusSchema,
  priority:    TaskPrioritySchema,
  projectId:   z.string().optional(),
  // assignee is a Clerk user ID — plain string until user-lookup is wired
  assignee:    z.string().optional(),
  dueDate:     z.string().datetime({ offset: true }).optional(),
});

export const UpdateTaskSchema = TaskSchema.partial();

export type TaskInput = z.infer<typeof TaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
