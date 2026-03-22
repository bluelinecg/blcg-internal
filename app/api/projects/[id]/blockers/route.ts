// GET /api/projects/[id]/blockers
// Returns a list of strings describing why this project cannot be deleted.
// An empty array means deletion is safe to proceed.
//
// Auth: requires a valid Clerk session.

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getProjectDependencyCounts } from '@/lib/db/projects';

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
    const { outstandingInvoices, error } = await getProjectDependencyCounts(id);

    if (error) return NextResponse.json({ data: null, error }, { status: 500 });

    const blockers: string[] = [];
    if (outstandingInvoices > 0) {
      blockers.push(
        `${outstandingInvoices} outstanding invoice${outstandingInvoices > 1 ? 's' : ''} linked to this project (resolve them first)`,
      );
    }

    return NextResponse.json({ data: blockers, error: null });
  } catch (err) {
    console.error('[GET /api/projects/[id]/blockers]', err);
    return NextResponse.json({ data: null, error: 'Failed to check dependencies' }, { status: 500 });
  }
}
