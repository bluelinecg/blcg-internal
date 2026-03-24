// GET    /api/pipelines/[id] — fetch a single pipeline with stages
// PATCH  /api/pipelines/[id] — update pipeline metadata
// DELETE /api/pipelines/[id] — delete pipeline (blocked if items exist)
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, error: string | null }

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getPipelineById, updatePipeline, deletePipeline, getPipelineItemCount } from '@/lib/db/pipelines';
import { UpdatePipelineSchema } from '@/lib/validations/pipelines';
import { guardAdmin, guardMember } from '@/lib/auth/roles';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });

    const { id } = await params;
    const { data, error } = await getPipelineById(id);

    if (error) return NextResponse.json({ data: null, error }, { status: 500 });
    if (!data) return NextResponse.json({ data: null, error: 'Pipeline not found' }, { status: 404 });

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('[GET /api/pipelines/[id]]', err);
    return NextResponse.json({ data: null, error: 'Failed to load pipeline' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });

    const guard = await guardMember();
    if (guard) return guard;

    const { id } = await params;

    const parsed = UpdatePipelineSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return NextResponse.json({ data: null, error }, { status: 400 });
    }

    const { data, error } = await updatePipeline(id, parsed.data);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });
    if (!data) return NextResponse.json({ data: null, error: 'Pipeline not found' }, { status: 404 });

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('[PATCH /api/pipelines/[id]]', err);
    return NextResponse.json({ data: null, error: 'Failed to update pipeline' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });

    const guard = await guardAdmin();
    if (guard) return guard;

    const { id } = await params;

    const { count, error: countErr } = await getPipelineItemCount(id);
    if (countErr) return NextResponse.json({ data: null, error: countErr }, { status: 500 });

    if (count > 0) {
      return NextResponse.json(
        { data: null, error: `Cannot delete pipeline: ${count} item${count > 1 ? 's' : ''} exist (move or delete them first)` },
        { status: 409 },
      );
    }

    const { error } = await deletePipeline(id);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });

    return NextResponse.json({ data: { id }, error: null });
  } catch (err) {
    console.error('[DELETE /api/pipelines/[id]]', err);
    return NextResponse.json({ data: null, error: 'Failed to delete pipeline' }, { status: 500 });
  }
}
