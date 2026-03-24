// GET  /api/pipelines — list pipelines (paginated)
// POST /api/pipelines — create a new pipeline
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, error: string | null }

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { listPipelines, createPipeline } from '@/lib/db/pipelines';
import { PipelineSchema } from '@/lib/validations/pipelines';
import { guardMember } from '@/lib/auth/roles';
import { parseListParams } from '@/lib/utils/parse-list-params';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, total: null, error: 'Unauthorised' }, { status: 401 });
    }

    const options = parseListParams(new URL(request.url).searchParams);
    const { data, total, error } = await listPipelines(options);
    if (error) return NextResponse.json({ data: null, total: null, error }, { status: 500 });

    return NextResponse.json({ data, total, error: null });
  } catch (err) {
    console.error('[GET /api/pipelines]', err);
    return NextResponse.json({ data: null, total: null, error: 'Failed to load pipelines' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
    }

    const guard = await guardMember();
    if (guard) return guard;

    const parsed = PipelineSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return NextResponse.json({ data: null, error }, { status: 400 });
    }

    const { data, error } = await createPipeline(parsed.data);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });

    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/pipelines]', err);
    return NextResponse.json({ data: null, error: 'Failed to create pipeline' }, { status: 500 });
  }
}
