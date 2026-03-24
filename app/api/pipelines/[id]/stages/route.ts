// GET  /api/pipelines/[id]/stages — list stages for a pipeline
// POST /api/pipelines/[id]/stages — create a new stage
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, error: string | null }

import { NextResponse } from 'next/server';
import { listStages, createStage } from '@/lib/db/pipelines';
import { PipelineStageSchema } from '@/lib/validations/pipelines';
import { guardMember } from '@/lib/auth/roles';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const { data, error } = await listStages(id);
    if (error) return apiError(error, 500);

    return apiOk(data);
  } catch (err) {
    console.error('[GET /api/pipelines/[id]/stages]', err);
    return apiError('Failed to load stages', 500);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardMember();
    if (guard) return guard;

    const { id } = await params;

    const body = await request.json() as Record<string, unknown>;
    const parsed = PipelineStageSchema.safeParse({ ...body, pipelineId: id });
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { data, error } = await createStage(parsed.data);
    if (error) return apiError(error, 500);

    return apiOk(data, 201);
  } catch (err) {
    console.error('[POST /api/pipelines/[id]/stages]', err);
    return apiError('Failed to create stage', 500);
  }
}
