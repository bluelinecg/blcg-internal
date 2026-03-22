import { z } from 'zod';

export const ClientStatusSchema = z.enum(['active', 'inactive', 'prospect']);

export const ClientSchema = z.object({
  name:    z.string().min(1, 'Name is required'),
  email:   z.string().email('Enter a valid email address'),
  phone:   z.string().optional(),
  company: z.string().optional(),
  status:  ClientStatusSchema,
  notes:   z.string().optional(),
});

// All fields optional on update except the identity fields
export const UpdateClientSchema = ClientSchema.partial();

export type ClientInput = z.infer<typeof ClientSchema>;
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;
