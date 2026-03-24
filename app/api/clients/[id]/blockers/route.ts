// GET /api/clients/[id]/blockers
// Returns a list of human-readable strings describing why this client cannot be deleted.
// An empty array means deletion is safe to proceed.
//
// Used by the frontend to populate ConfirmDialog's blockedBy prop before opening.
// Auth: requires a valid Clerk session.

import { NextResponse } from 'next/server';
import { getClientDependencyCounts } from '@/lib/db/clients';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const { activeProposals, activeProjects, activeInvoices, error } =
      await getClientDependencyCounts(id);

    if (error) return apiError(error, 500);

    const blockers: string[] = [];
    if (activeProposals > 0) {
      blockers.push(
        `${activeProposals} active proposal${activeProposals > 1 ? 's' : ''} (resolve or archive them first)`,
      );
    }
    if (activeProjects > 0) {
      blockers.push(
        `${activeProjects} active project${activeProjects > 1 ? 's' : ''} (complete or cancel them first)`,
      );
    }
    if (activeInvoices > 0) {
      blockers.push(
        `${activeInvoices} outstanding invoice${activeInvoices > 1 ? 's' : ''} (collect or void them first)`,
      );
    }

    return apiOk(blockers);
  } catch (err) {
    console.error('[GET /api/clients/[id]/blockers]', err);
    return apiError('Failed to check dependencies', 500);
  }
}
