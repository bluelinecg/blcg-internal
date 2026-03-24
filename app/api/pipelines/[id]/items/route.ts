// GET  /api/pipelines/[id]/items — list items in a pipeline
// POST /api/pipelines/[id]/items — create a new pipeline item
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, error: string | null }

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { listItems, createItem } from '@/lib/db/pipelines';
import { PipelineItemSchema } from '@/lib/validations/pipelines';
import { guardMember } from '@/lib/auth/roles';
import { parseListParams } from '@/lib/utils/parse-list-params';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, total: null, error: 'Unauthorised' }, { status: 401 });

    const { id } = await params;
    const options = parseListParams(new URL(request.url).searchParams);
    const { data, total, error } = await listItems(id, options);
    if (error) return NextResponse.json({ data: null, total: null, error }, { status: 500 });

    return NextResponse.json({ data, total, error: null });
  } catch (err) {
    console.error('[GET /api/pipelines/[id]/items]', err);
    return NextResponse.json({ data: null, total: null, error: 'Failed to load items' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });

    const guard = await guardMember();
    if (guard) return guard;

    const { id } = await params;

    const body = await request.json() as Record<string, unknown>;
    const parsed = PipelineItemSchema.safeParse({ ...body, pipelineId: id });
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return NextResponse.json({ data: null, error }, { status: 400 });
    }

    const { data, error } = await createItem(parsed.data);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });

    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/pipelines/[id]/items]', err);
    return NextResponse.json({ data: null, error: 'Failed to create item' }, { status: 500 });
  }
}
