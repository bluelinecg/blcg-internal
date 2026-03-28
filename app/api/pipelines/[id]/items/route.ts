// GET  /api/pipelines/[id]/items — list items in a pipeline
// POST /api/pipelines/[id]/items — create a new pipeline item
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, error: string | null }

import { NextResponse } from 'next/server';
import { listItems, createItem } from '@/lib/db/pipelines';
import { PipelineItemSchema } from '@/lib/validations/pipelines';
import { guardMember } from '@/lib/auth/roles';
import { parseListParams } from '@/lib/utils/parse-list-params';
import { bus } from '@/lib/events';
import { requireAuth, apiError, apiOk, apiList } from '@/lib/api/utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const options = parseListParams(new URL(request.url).searchParams);
    const { data, total, error } = await listItems(id, options);
    if (error) return apiError(error, 500);

    return apiList(data, total);
  } catch (err) {
    console.error('[GET /api/pipelines/[id]/items]', err);
    return apiError('Failed to load items', 500);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const guard = await guardMember();
    if (guard) return guard;

    const { id } = await params;

    const body = await request.json() as Record<string, unknown>;
    const parsed = PipelineItemSchema.safeParse({ ...body, pipelineId: id });
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { data, error } = await createItem(parsed.data);
    if (error) return apiError(error, 500);

    if (data) {
      void bus.publish('pipeline.item_created', {
        actorId:     userId,
        entityType:  'pipeline_item',
        entityId:    data.id,
        entityLabel: data.title,
        action:      'created',
        data:        data as unknown as Record<string, unknown>,
      });
    }

    return apiOk(data, 201);
  } catch (err) {
    console.error('[POST /api/pipelines/[id]/items]', err);
    return apiError('Failed to create item', 500);
  }
}
