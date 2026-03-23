// GET /api/clients/[id]/blockers
// Returns a list of human-readable strings describing why this client cannot be deleted.
// An empty array means deletion is safe to proceed.
//
// Used by the frontend to populate ConfirmDialog's blockedBy prop before opening.
// Auth: requires a valid Clerk session.

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getClientDependencyCounts } from '@/lib/db/clients';

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
    const { activeProposals, activeProjects, activeInvoices, error } =
      await getClientDependencyCounts(id);

    if (error) {
      return NextResponse.json({ data: null, error }, { status: 500 });
    }

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

    return NextResponse.json({ data: blockers, error: null });
  } catch (err) {
    console.error('[GET /api/clients/[id]/blockers]', err);
    return NextResponse.json({ data: null, error: 'Failed to check dependencies' }, { status: 500 });
  }
}
