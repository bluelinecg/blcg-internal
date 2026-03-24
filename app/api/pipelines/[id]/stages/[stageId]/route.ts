// PATCH  /api/pipelines/[id]/stages/[stageId] — update a stage
// DELETE /api/pipelines/[id]/stages/[stageId] — delete a stage (blocked if items exist)
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, error: string | null }

import { NextResponse } from 'next/server';
import { updateStage, deleteStage, getStageItemCount } from '@/lib/db/pipelines';
import { UpdatePipelineStageSchema } from '@/lib/validations/pipelines';
import { guardAdmin, guardMember } from '@/lib/auth/roles';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

interface RouteContext {
  params: Promise<{ id: string; stageId: string }>;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardMember();
    if (guard) return guard;

    const { stageId } = await params;

    const parsed = UpdatePipelineStageSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { data, error } = await updateStage(stageId, parsed.data);
    if (error) return apiError(error, 500);
    if (!data) return apiError('Stage not found', 404);

    return apiOk(data);
  } catch (err) {
    console.error('[PATCH /api/pipelines/[id]/stages/[stageId]]', err);
    return apiError('Failed to update stage', 500);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardAdmin();
    if (guard) return guard;

    const { stageId } = await params;

    const { count, error: countErr } = await getStageItemCount(stageId);
    if (countErr) return apiError(countErr, 500);

    if (count > 0) {
      return apiError(`Cannot delete stage: ${count} item${count > 1 ? 's' : ''} are in this stage (move them first)`, 409);
    }

    const { error } = await deleteStage(stageId);
    if (error) return apiError(error, 500);

    return apiOk({ id: stageId });
  } catch (err) {
    console.error('[DELETE /api/pipelines/[id]/stages/[stageId]]', err);
    return apiError('Failed to delete stage', 500);
  }
}
