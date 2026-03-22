// User role hierarchy for BLCG Internal.
// Stored in Clerk publicMetadata as { role: UserRole }.
// Checked server-side on all /api/users routes.
export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

// AppUser is the shape returned by GET /api/users — a Clerk user with
// BLCG role metadata merged in. Components never call Clerk directly;
// they use this type via the /api/users routes.
export interface AppUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  imageUrl: string;
  role: UserRole;
  createdAt: string;
  lastSignInAt: string | null;
}
