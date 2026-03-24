// GET    /api/pipelines/[id]/items/[itemId] — fetch a single item
// PATCH  /api/pipelines/[id]/items/[itemId] — update item fields or move to new stage
// DELETE /api/pipelines/[id]/items/[itemId] — delete an item (no dependency restrictions)
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, error: string | null }

import { NextResponse } from 'next/server';
import { getItemById, updateItem, deleteItem } from '@/lib/db/pipelines';
import { UpdatePipelineItemSchema } from '@/lib/validations/pipelines';
import { guardAdmin, guardMember } from '@/lib/auth/roles';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

interface RouteContext {
  params: Promise<{ id: string; itemId: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { itemId } = await params;
    const { data, error } = await getItemById(itemId);

    if (error) return apiError(error, 500);
    if (!data) return apiError('Item not found', 404);

    return apiOk(data);
  } catch (err) {
    console.error('[GET /api/pipelines/[id]/items/[itemId]]', err);
    return apiError('Failed to load item', 500);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardMember();
    if (guard) return guard;

    const { itemId } = await params;

    const parsed = UpdatePipelineItemSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { data, error } = await updateItem(itemId, parsed.data);
    if (error) return apiError(error, 500);
    if (!data) return apiError('Item not found', 404);

    return apiOk(data);
  } catch (err) {
    console.error('[PATCH /api/pipelines/[id]/items/[itemId]]', err);
    return apiError('Failed to update item', 500);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardAdmin();
    if (guard) return guard;

    const { itemId } = await params;

    const { error } = await deleteItem(itemId);
    if (error) return apiError(error, 500);

    return apiOk({ id: itemId });
  } catch (err) {
    console.error('[DELETE /api/pipelines/[id]/items/[itemId]]', err);
    return apiError('Failed to delete item', 500);
  }
}
