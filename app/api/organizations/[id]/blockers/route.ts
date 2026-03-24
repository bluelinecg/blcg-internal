// GET /api/organizations/[id]/blockers
// Returns a list of human-readable strings describing why this organization cannot be deleted.
// An empty array means deletion is safe to proceed.
//
// Used by the frontend to populate ConfirmDialog's blockedBy prop before opening.
// Auth: requires a valid Clerk session.

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getOrganizationContactCount } from '@/lib/db/organizations';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
    }

    const { id } = await params;
    const { count, error } = await getOrganizationContactCount(id);

    if (error) return NextResponse.json({ data: null, error }, { status: 500 });

    const blockers: string[] = [];
    if (count && count > 0) {
      blockers.push(
        `${count} contact${count > 1 ? 's' : ''} linked to this organization (reassign or delete them first)`,
      );
    }

    return NextResponse.json({ data: blockers, error: null });
  } catch (err) {
    console.error('[GET /api/organizations/[id]/blockers]', err);
    return NextResponse.json({ data: null, error: 'Failed to check dependencies' }, { status: 500 });
  }
}
