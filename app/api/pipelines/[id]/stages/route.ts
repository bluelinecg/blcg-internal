// GET  /api/pipelines/[id]/stages — list stages for a pipeline
// POST /api/pipelines/[id]/stages — create a new stage
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, error: string | null }

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { listStages, createStage } from '@/lib/db/pipelines';
import { PipelineStageSchema } from '@/lib/validations/pipelines';
import { guardMember } from '@/lib/auth/roles';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });

    const { id } = await params;
    const { data, error } = await listStages(id);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('[GET /api/pipelines/[id]/stages]', err);
    return NextResponse.json({ data: null, error: 'Failed to load stages' }, { status: 500 });
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
    const parsed = PipelineStageSchema.safeParse({ ...body, pipelineId: id });
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return NextResponse.json({ data: null, error }, { status: 400 });
    }

    const { data, error } = await createStage(parsed.data);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });

    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/pipelines/[id]/stages]', err);
    return NextResponse.json({ data: null, error: 'Failed to create stage' }, { status: 500 });
  }
}
