import { z } from 'zod';

export const UserRoleSchema = z.enum(['owner', 'admin', 'member', 'viewer']);

// POST /api/users — invite a new team member
export const InviteUserSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  role: UserRoleSchema,
});

// PATCH /api/users/[id] — change a user's role
export const UpdateRoleSchema = z.object({
  role: UserRoleSchema,
});

export type InviteUserInput = z.infer<typeof InviteUserSchema>;
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;
