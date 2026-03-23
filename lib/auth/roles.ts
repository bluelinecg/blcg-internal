/**
 * Server-side role utilities.
 * Reads the user's role from Clerk JWT session claims (no extra network call).
 * Role is stored in Clerk publicMetadata.role and injected into every JWT automatically.
 *
 * Usage in API routes:
 *   const guard = await guardAdmin();
 *   if (guard) return guard;
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export type Role = 'admin' | 'member';

/** Returns the authenticated user's role. Defaults to 'member' if unset. */
export async function getRole(): Promise<Role> {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;
  return role === 'admin' ? 'admin' : 'member';
}

/** Returns true if the authenticated user is an admin. */
export async function isAdmin(): Promise<boolean> {
  return (await getRole()) === 'admin';
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
