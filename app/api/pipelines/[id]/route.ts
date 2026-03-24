// GET    /api/pipelines/[id] — fetch a single pipeline with stages
// PATCH  /api/pipelines/[id] — update pipeline metadata
// DELETE /api/pipelines/[id] — delete pipeline (blocked if items exist)
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, error: string | null }

import { NextResponse } from 'next/server';
import { getPipelineById, updatePipeline, deletePipeline, getPipelineItemCount } from '@/lib/db/pipelines';
import { UpdatePipelineSchema } from '@/lib/validations/pipelines';
import { guardAdmin, guardMember } from '@/lib/auth/roles';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const { data, error } = await getPipelineById(id);

    if (error) return apiError(error, 500);
    if (!data) return apiError('Pipeline not found', 404);

    return apiOk(data);
  } catch (err) {
    console.error('[GET /api/pipelines/[id]]', err);
    return apiError('Failed to load pipeline', 500);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardMember();
    if (guard) return guard;

    const { id } = await params;

    const parsed = UpdatePipelineSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { data, error } = await updatePipeline(id, parsed.data);
    if (error) return apiError(error, 500);
    if (!data) return apiError('Pipeline not found', 404);

    return apiOk(data);
  } catch (err) {
    console.error('[PATCH /api/pipelines/[id]]', err);
    return apiError('Failed to update pipeline', 500);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardAdmin();
    if (guard) return guard;

    const { id } = await params;

    const { count, error: countErr } = await getPipelineItemCount(id);
    if (countErr) return apiError(countErr, 500);

    if (count > 0) {
      return apiError(`Cannot delete pipeline: ${count} item${count > 1 ? 's' : ''} exist (move or delete them first)`, 409);
    }

    const { error } = await deletePipeline(id);
    if (error) return apiError(error, 500);

    return apiOk({ id });
  } catch (err) {
    console.error('[DELETE /api/pipelines/[id]]', err);
    return apiError('Failed to delete pipeline', 500);
  }
}
