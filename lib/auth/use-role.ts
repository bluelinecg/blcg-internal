'use client';

/**
 * Client-side hook that returns the current user's role.
 * Reads from Clerk's publicMetadata — available instantly from the cached user object.
 * Returns 'member' as the safe default while loading or if unset.
 *
 * @example
 * const role = useRole();
 * const isAdmin = role === 'admin';
 */

import { useUser } from '@clerk/nextjs';
import type { Role } from './roles';

export function useRole(): Role {
  const { user } = useUser();
  return user?.publicMetadata?.role === 'admin' ? 'admin' : 'member';
}
