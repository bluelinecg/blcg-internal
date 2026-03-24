// GET    /api/pipelines/[id]/items/[itemId] — fetch a single item
// PATCH  /api/pipelines/[id]/items/[itemId] — update item fields or move to new stage
// DELETE /api/pipelines/[id]/items/[itemId] — delete an item (no dependency restrictions)
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, error: string | null }

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getItemById, updateItem, deleteItem } from '@/lib/db/pipelines';
import { UpdatePipelineItemSchema } from '@/lib/validations/pipelines';
import { guardAdmin, guardMember } from '@/lib/auth/roles';

interface RouteContext {
  params: Promise<{ id: string; itemId: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });

    const { itemId } = await params;
    const { data, error } = await getItemById(itemId);

    if (error) return NextResponse.json({ data: null, error }, { status: 500 });
    if (!data) return NextResponse.json({ data: null, error: 'Item not found' }, { status: 404 });

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('[GET /api/pipelines/[id]/items/[itemId]]', err);
    return NextResponse.json({ data: null, error: 'Failed to load item' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });

    const guard = await guardMember();
    if (guard) return guard;

    const { itemId } = await params;

    const parsed = UpdatePipelineItemSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return NextResponse.json({ data: null, error }, { status: 400 });
    }

    const { data, error } = await updateItem(itemId, parsed.data);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });
    if (!data) return NextResponse.json({ data: null, error: 'Item not found' }, { status: 404 });

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('[PATCH /api/pipelines/[id]/items/[itemId]]', err);
    return NextResponse.json({ data: null, error: 'Failed to update item' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });

    const guard = await guardAdmin();
    if (guard) return guard;

    const { itemId } = await params;

    const { error } = await deleteItem(itemId);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });

    return NextResponse.json({ data: { id: itemId }, error: null });
  } catch (err) {
    console.error('[DELETE /api/pipelines/[id]/items/[itemId]]', err);
    return NextResponse.json({ data: null, error: 'Failed to delete item' }, { status: 500 });
  }
}
