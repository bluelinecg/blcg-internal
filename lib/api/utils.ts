// Shared API route utilities.
// Extracted from the repeated scaffolding across ~35 route files.
//
// requireAuth() — verifies Clerk session, returns userId or a 401 NextResponse
// apiError()    — returns a typed { data: null, error } NextResponse
// apiOk()       — returns a typed { data, error: null } NextResponse

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/** Verifies the Clerk session.  Returns `{ userId }` on success, or a 401
 *  NextResponse that the caller must return immediately. */
export async function requireAuth(): Promise<{ userId: string } | NextResponse<{ data: null; error: string }>> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
  }
  return { userId };
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

/** Returns a NextResponse with `{ data: null, error }` and the given status. */
export function apiError(message: string, status: number): NextResponse<{ data: null; error: string }> {
  return NextResponse.json({ data: null, error: message }, { status });
}

/** Returns a NextResponse with `{ data, error: null }` and an optional status
 *  (defaults to 200). */
export function apiOk<T>(data: T, status = 200): NextResponse<{ data: T; error: null }> {
  return NextResponse.json({ data, error: null }, { status });
}
