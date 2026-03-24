import { z } from 'zod';

export const ClientStatusSchema = z.enum(['active', 'inactive', 'prospect']);

export const ClientSchema = z.object({
  name:         z.string().min(1, 'Name is required'),
  contactName:  z.string().min(1, 'Contact name is required'),
  contactTitle: z.string().optional(),
  email:        z.string().email('Enter a valid email address'),
  phone:        z.string().optional(),
  industry:     z.string().optional(),
  address:      z.string().optional(),
  website:      z.string().url('Enter a valid URL').optional().or(z.literal('')),
  referredBy:     z.string().optional(),
  status:         ClientStatusSchema,
  notes:          z.string().optional(),
  organizationId: z.string().uuid().optional(),
});

export const UpdateClientSchema = ClientSchema.partial();

export type ClientInput = z.infer<typeof ClientSchema>;
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;
