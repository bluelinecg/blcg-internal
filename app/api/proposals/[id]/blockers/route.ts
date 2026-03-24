// GET /api/proposals/[id]/blockers
// Returns a list of strings describing why this proposal cannot be deleted.
// An empty array means deletion is safe to proceed.
//
// Auth: requires a valid Clerk session.

import { NextResponse } from 'next/server';
import { getProposalDependencyCounts } from '@/lib/db/proposals';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const { linkedProjects, error } = await getProposalDependencyCounts(id);

    if (error) return apiError(error, 500);

    const blockers: string[] = [];
    if (linkedProjects > 0) {
      blockers.push(
        `Linked to ${linkedProjects} project${linkedProjects > 1 ? 's' : ''} — remove the proposal link from the project first`,
      );
    }

    return apiOk(blockers);
  } catch (err) {
    console.error('[GET /api/proposals/[id]/blockers]', err);
    return apiError('Failed to check dependencies', 500);
  }
}
