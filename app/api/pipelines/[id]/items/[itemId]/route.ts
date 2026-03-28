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
import { bus } from '@/lib/events';
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
    return apiError('Failed to load item', 500);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const guard = await guardMember();
    if (guard) return guard;

    const { id: pipelineId, itemId } = await params;

    const parsed = UpdatePipelineItemSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    // Capture previous stageId before update for change detection
    const { data: existing } = await getItemById(itemId);
    const previousStageId = existing?.stageId;

    const { data, error } = await updateItem(itemId, parsed.data);
    if (error) return apiError(error, 500);
    if (!data) return apiError('Item not found', 404);

    const stageChanged = parsed.data.stageId !== undefined && parsed.data.stageId !== previousStageId;

    if (stageChanged) {
      void bus.publish('pipeline.item_stage_changed', {
        actorId:     userId,
        entityType:  'pipeline_item',
        entityId:    itemId,
        entityLabel: data.title,
        action:      'status_changed',
        data: {
          id:              data.id,
          itemId:          data.id,
          pipelineId,
          stageId:         data.stageId,
          previousStageId: previousStageId ?? null,
          title:           data.title,
        },
        metadata: { to: data.stageId, from: previousStageId },
      });
    } else {
      void bus.publish('pipeline.item_updated', {
        actorId:     userId,
        entityType:  'pipeline_item',
        entityId:    itemId,
        entityLabel: data.title,
        action:      'updated',
        data:        data as unknown as Record<string, unknown>,
      });
    }

    return apiOk(data);
  } catch (err) {
    return apiError('Failed to update item', 500);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const guard = await guardAdmin();
    if (guard) return guard;

    const { itemId } = await params;

    const { data: item } = await getItemById(itemId);

    const { error } = await deleteItem(itemId);
    if (error) return apiError(error, 500);

    void bus.publish('pipeline.item_deleted', {
      actorId:     userId,
      entityType:  'pipeline_item',
      entityId:    itemId,
      entityLabel: item?.title ?? itemId,
      action:      'deleted',
      data:        item as unknown as Record<string, unknown> ?? { id: itemId },
    });

    return apiOk({ id: itemId });
  } catch (err) {
    return apiError('Failed to delete item', 500);
  }
}
