// GET /api/organizations/[id]/blockers
// Returns a list of human-readable strings describing why this organization cannot be deleted.
// An empty array means deletion is safe to proceed.
//
// Used by the frontend to populate ConfirmDialog's blockedBy prop before opening.
// Auth: requires a valid Clerk session.

import { NextResponse } from 'next/server';
import { getOrganizationContactCount } from '@/lib/db/organizations';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const { count, error } = await getOrganizationContactCount(id);

    if (error) return apiError(error, 500);

    const blockers: string[] = [];
    if (count && count > 0) {
      blockers.push(
        `${count} contact${count > 1 ? 's' : ''} linked to this organization (reassign or delete them first)`,
      );
    }

    return apiOk(blockers);
  } catch (err) {
    console.error('[GET /api/organizations/[id]/blockers]', err);
    return apiError('Failed to check dependencies', 500);
  }
}
