import { z } from 'zod';

export const TimeEntrySchema = z.object({
  hours:       z.number().positive('Hours must be greater than 0').max(24, 'Hours cannot exceed 24'),
  date:        z.string().min(1, 'Date is required'),
  description: z.string().min(1, 'Description is required'),
  projectId:   z.string().uuid().optional(),
  taskId:      z.string().uuid().optional(),
  isBillable:  z.boolean().default(true),
});

export const UpdateTimeEntrySchema = TimeEntrySchema.partial();

export type TimeEntryInput = z.infer<typeof TimeEntrySchema>;
export type UpdateTimeEntryInput = z.infer<typeof UpdateTimeEntrySchema>;
