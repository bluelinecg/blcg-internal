// GET  /api/pipelines — list pipelines (paginated)
// POST /api/pipelines — create a new pipeline
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, error: string | null }

import { NextResponse } from 'next/server';
import { listPipelines, createPipeline } from '@/lib/db/pipelines';
import { PipelineSchema } from '@/lib/validations/pipelines';
import { guardMember } from '@/lib/auth/roles';
import { parseListParams } from '@/lib/utils/parse-list-params';
import { requireAuth, apiError, apiOk, apiList } from '@/lib/api/utils';

export async function GET(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const options = parseListParams(new URL(request.url).searchParams);
    const { data, total, error } = await listPipelines(options);
    if (error) return apiError(error, 500);

    return apiList(data, total);
  } catch (err) {
    console.error('[GET /api/pipelines]', err);
    return apiError('Failed to load pipelines', 500);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardMember();
    if (guard) return guard;

    const parsed = PipelineSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { data, error } = await createPipeline(parsed.data);
    if (error) return apiError(error, 500);

    return apiOk(data, 201);
  } catch (err) {
    console.error('[POST /api/pipelines]', err);
    return apiError('Failed to create pipeline', 500);
  }
}
