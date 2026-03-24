import { z } from 'zod';

export const ContactStatusSchema = z.enum(['lead', 'prospect', 'active', 'inactive']);

export const ContactSchema = z.object({
  organizationId: z.string().uuid().optional(),
  firstName:      z.string().min(1, 'First name is required'),
  lastName:       z.string().min(1, 'Last name is required'),
  email:          z.string().email('Enter a valid email address').optional().or(z.literal('')),
  phone:          z.string().optional(),
  title:          z.string().optional(),
  status:         ContactStatusSchema,
  notes:          z.string().optional(),
});

export const UpdateContactSchema = ContactSchema.partial();

export type ContactInput = z.infer<typeof ContactSchema>;
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>;
