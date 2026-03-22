import { z } from 'zod';

export const ProjectStatusSchema = z.enum([
  'active',
  'on_hold',
  'completed',
  'cancelled',
]);

export const MilestoneStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'blocked',
]);

export const MilestoneSchema = z.object({
  name:          z.string().min(1, 'Name is required'),
  description:   z.string().optional(),
  status:        MilestoneStatusSchema,
  dueDate:       z.string().datetime({ offset: true }).optional(),
  completedDate: z.string().datetime({ offset: true }).optional(),
  order:         z.number().int().nonnegative(),
});

export const ProjectSchema = z.object({
  clientId:      z.string().min(1, 'Client is required'),
  proposalId:    z.string().optional(),
  name:          z.string().min(1, 'Name is required'),
  status:        ProjectStatusSchema,
  startDate:     z.string().datetime({ offset: true }),
  targetDate:    z.string().datetime({ offset: true }).optional(),
  completedDate: z.string().datetime({ offset: true }).optional(),
  budget:        z.number().nonnegative('Budget cannot be negative'),
  milestones:    z.array(MilestoneSchema),
  notes:         z.string().optional(),
});

export const UpdateProjectSchema = ProjectSchema.partial();

export type MilestoneInput = z.infer<typeof MilestoneSchema>;
export type ProjectInput = z.infer<typeof ProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
