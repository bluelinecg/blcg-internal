// GET    /api/time-entries/[id] — fetch a single time entry
// PATCH  /api/time-entries/[id] — update a time entry
// DELETE /api/time-entries/[id] — delete a time entry
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, error: string | null }

import { NextResponse } from 'next/server';
import { getTimeEntryById, updateTimeEntry, deleteTimeEntry } from '@/lib/db/time-entries';
import { UpdateTimeEntrySchema } from '@/lib/validations/time-tracking';
import { guardAdmin, guardMember } from '@/lib/auth/roles';
import { dispatchWebhookEvent } from '@/lib/utils/webhook-delivery';
import { logAction } from '@/lib/utils/audit';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const { data, error } = await getTimeEntryById(id);

    if (error) return apiError(error, 500);
    if (!data) return apiError('Time entry not found', 404);

    return apiOk(data);
  } catch (err) {
    console.error('[GET /api/time-entries/[id]]', err);
    return apiError('Failed to load time entry', 500);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardMember();
    if (guard) return guard;

    const { id } = await params;

    const parsed = UpdateTimeEntrySchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { data, error } = await updateTimeEntry(id, parsed.data);
    if (error) return apiError(error, 500);
    if (!data) return apiError('Time entry not found', 404);

    void dispatchWebhookEvent('time_entry.updated', data as unknown as Record<string, unknown>);
    void logAction({
      entityType:  'time_entry',
      entityId:    id,
      entityLabel: data.description,
      action:      'updated',
    });

    return apiOk(data);
  } catch (err) {
    console.error('[PATCH /api/time-entries/[id]]', err);
    return apiError('Failed to update time entry', 500);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardAdmin();
    if (guard) return guard;

    const { id } = await params;

    const { data: entry } = await getTimeEntryById(id);

    const { error } = await deleteTimeEntry(id);
    if (error) return apiError(error, 500);

    void logAction({
      entityType:  'time_entry',
      entityId:    id,
      entityLabel: entry?.description ?? id,
      action:      'deleted',
    });

    return apiOk({ id });
  } catch (err) {
    console.error('[DELETE /api/time-entries/[id]]', err);
    return apiError('Failed to delete time entry', 500);
  }
}
