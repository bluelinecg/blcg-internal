import { z } from 'zod';

export const OrganizationSchema = z.object({
  name:     z.string().min(1, 'Name is required'),
  website:  z.string().url('Enter a valid URL').optional().or(z.literal('')),
  phone:    z.string().optional(),
  industry: z.string().optional(),
  address:  z.string().optional(),
  notes:    z.string().optional(),
});

export const UpdateOrganizationSchema = OrganizationSchema.partial();

export type OrganizationInput = z.infer<typeof OrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>;
