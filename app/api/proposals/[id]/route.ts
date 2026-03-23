// GET    /api/proposals/[id] — fetch a single proposal with line items
// PATCH  /api/proposals/[id] — update a proposal (replaces line items if provided)
// DELETE /api/proposals/[id] — delete a proposal (409 if a project is linked)
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, error: string | null }

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import {
  getProposalById,
  updateProposal,
  deleteProposal,
  getProposalDependencyCounts,
} from '@/lib/db/proposals';
import { UpdateProposalSchema } from '@/lib/validations/proposals';
import { guardAdmin } from '@/lib/auth/roles';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/proposals/[id]
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
    }

    const { id } = await params;
    const { data, error } = await getProposalById(id);

    if (error) return NextResponse.json({ data: null, error }, { status: 500 });
    if (!data) return NextResponse.json({ data: null, error: 'Proposal not found' }, { status: 404 });

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('[GET /api/proposals/[id]]', err);
    return NextResponse.json({ data: null, error: 'Failed to load proposal' }, { status: 500 });
  }
}

// PATCH /api/proposals/[id]
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
    }

    const { id } = await params;

    const parsed = UpdateProposalSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return NextResponse.json({ data: null, error }, { status: 400 });
    }

    const { data, error } = await updateProposal(id, parsed.data);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });
    if (!data) return NextResponse.json({ data: null, error: 'Proposal not found' }, { status: 404 });

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('[PATCH /api/proposals/[id]]', err);
    return NextResponse.json({ data: null, error: 'Failed to update proposal' }, { status: 500 });
  }
}

// DELETE /api/proposals/[id]
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
    }

    const guard = await guardAdmin();
    if (guard) return guard;

    const { id } = await params;

    const { linkedProjects, error: depError } = await getProposalDependencyCounts(id);
    if (depError) return NextResponse.json({ data: null, error: depError }, { status: 500 });

    if (linkedProjects > 0) {
      return NextResponse.json(
        { data: null, error: `Cannot delete proposal: linked to ${linkedProjects} project${linkedProjects > 1 ? 's' : ''}` },
        { status: 409 },
      );
    }

    const { error } = await deleteProposal(id);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });

    return NextResponse.json({ data: { id }, error: null });
  } catch (err) {
    console.error('[DELETE /api/proposals/[id]]', err);
    return NextResponse.json({ data: null, error: 'Failed to delete proposal' }, { status: 500 });
  }
}
