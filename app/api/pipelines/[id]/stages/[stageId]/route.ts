// PATCH  /api/pipelines/[id]/stages/[stageId] — update a stage
// DELETE /api/pipelines/[id]/stages/[stageId] — delete a stage (blocked if items exist)
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, error: string | null }

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { updateStage, deleteStage, getStageItemCount } from '@/lib/db/pipelines';
import { UpdatePipelineStageSchema } from '@/lib/validations/pipelines';
import { guardAdmin, guardMember } from '@/lib/auth/roles';

interface RouteContext {
  params: Promise<{ id: string; stageId: string }>;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });

    const guard = await guardMember();
    if (guard) return guard;

    const { stageId } = await params;

    const parsed = UpdatePipelineStageSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return NextResponse.json({ data: null, error }, { status: 400 });
    }

    const { data, error } = await updateStage(stageId, parsed.data);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });
    if (!data) return NextResponse.json({ data: null, error: 'Stage not found' }, { status: 404 });

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('[PATCH /api/pipelines/[id]/stages/[stageId]]', err);
    return NextResponse.json({ data: null, error: 'Failed to update stage' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });

    const guard = await guardAdmin();
    if (guard) return guard;

    const { stageId } = await params;

    const { count, error: countErr } = await getStageItemCount(stageId);
    if (countErr) return NextResponse.json({ data: null, error: countErr }, { status: 500 });

    if (count > 0) {
      return NextResponse.json(
        { data: null, error: `Cannot delete stage: ${count} item${count > 1 ? 's' : ''} are in this stage (move them first)` },
        { status: 409 },
      );
    }

    const { error } = await deleteStage(stageId);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });

    return NextResponse.json({ data: { id: stageId }, error: null });
  } catch (err) {
    console.error('[DELETE /api/pipelines/[id]/stages/[stageId]]', err);
    return NextResponse.json({ data: null, error: 'Failed to delete stage' }, { status: 500 });
  }
}
