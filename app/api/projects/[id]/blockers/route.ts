// GET /api/projects/[id]/blockers
// Returns a list of strings describing why this project cannot be deleted.
// An empty array means deletion is safe to proceed.
//
// Auth: requires a valid Clerk session.

import { NextResponse } from 'next/server';
import { getProjectDependencyCounts } from '@/lib/db/projects';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const { outstandingInvoices, error } = await getProjectDependencyCounts(id);

    if (error) return apiError(error, 500);

    const blockers: string[] = [];
    if (outstandingInvoices > 0) {
      blockers.push(
        `${outstandingInvoices} outstanding invoice${outstandingInvoices > 1 ? 's' : ''} linked to this project (resolve them first)`,
      );
    }

    return apiOk(blockers);
  } catch (err) {
    console.error('[GET /api/projects/[id]/blockers]', err);
    return apiError('Failed to check dependencies', 500);
  }
}
