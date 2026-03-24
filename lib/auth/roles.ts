/**
 * Server-side role utilities.
 * Reads the user's role from Clerk publicMetadata via currentUser().
 * Role is stored in Clerk publicMetadata.role — set per user in the Clerk dashboard.
 *
 * Usage in API routes:
 *   const guard = await guardAdmin();
 *   if (guard) return guard;
 */

import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export type Role = 'admin' | 'member' | 'viewer';

/** Returns the authenticated user's role. Defaults to 'member' if unset. */
export async function getRole(): Promise<Role> {
  const user = await currentUser();
  const role = user?.publicMetadata?.role as string | undefined;
  return role === 'admin' ? 'admin' : 'member';
}

/** Returns true if the authenticated user is an admin. */
export async function isAdmin(): Promise<boolean> {
  return (await getRole()) === 'admin';
}

/**
 * Returns a 403 NextResponse if the user is a viewer (read-only), otherwise null.
 * Apply to all POST and PATCH routes that mutate data.
 *
 * @example
 * const guard = await guardMember();
 * if (guard) return guard;
 */
export async function guardMember(): Promise<NextResponse | null> {
  if ((await getRole()) === 'viewer') {
    return NextResponse.json(
      { data: null, error: 'Forbidden: read-only access' },
      { status: 403 },
    );
  }
  return null;
}

/**
 * Returns a 403 NextResponse if the user is not an admin, otherwise null.
 * Caller should return immediately if the result is non-null.
 *
 * @example
 * const guard = await guardAdmin();
 * if (guard) return guard;
 */
export async function guardAdmin(): Promise<NextResponse | null> {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { data: null, error: 'Forbidden: admin access required' },
      { status: 403 }
    );
  }
  return null;
}
