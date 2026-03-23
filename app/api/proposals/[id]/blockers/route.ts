// GET /api/proposals/[id]/blockers
// Returns a list of strings describing why this proposal cannot be deleted.
// An empty array means deletion is safe to proceed.
//
// Auth: requires a valid Clerk session.

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getProposalDependencyCounts } from '@/lib/db/proposals';

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
    const { linkedProjects, error } = await getProposalDependencyCounts(id);

    if (error) return NextResponse.json({ data: null, error }, { status: 500 });

    const blockers: string[] = [];
    if (linkedProjects > 0) {
      blockers.push(
        `Linked to ${linkedProjects} project${linkedProjects > 1 ? 's' : ''} — remove the proposal link from the project first`,
      );
    }

    return NextResponse.json({ data: blockers, error: null });
  } catch (err) {
    console.error('[GET /api/proposals/[id]/blockers]', err);
    return NextResponse.json({ data: null, error: 'Failed to check dependencies' }, { status: 500 });
  }
}
