// GET  /api/time-entries — list time entries (paginated, filterable)
// POST /api/time-entries — create a time entry
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, total: number | null, error: string | null }

import { NextResponse } from 'next/server';
import { listTimeEntries, createTimeEntry } from '@/lib/db/time-entries';
import { TimeEntrySchema } from '@/lib/validations/time-tracking';
import { guardMember } from '@/lib/auth/roles';
import { parseListParams } from '@/lib/utils/parse-list-params';
import { bus } from '@/lib/events';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

export async function GET(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const url = new URL(request.url);
    const options = parseListParams(url.searchParams);
    const projectId = url.searchParams.get('projectId') ?? undefined;
    const startDate = url.searchParams.get('startDate') ?? undefined;
    const endDate   = url.searchParams.get('endDate')   ?? undefined;

    const { data, total, error } = await listTimeEntries({ ...options, projectId, startDate, endDate });
    if (error) return apiError(error, 500);

    return NextResponse.json({ data, total, error: null });
  } catch (err) {
    console.error('[GET /api/time-entries]', err);
    return apiError('Failed to load time entries', 500);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardMember();
    if (guard) return guard;

    const parsed = TimeEntrySchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { data, error } = await createTimeEntry(parsed.data, authResult.userId);
    if (error) return apiError(error, 500);

    if (data) {
      void bus.publish('time_entry.created', {
        actorId:     authResult.userId,
        entityType:  'time_entry',
        entityId:    data.id,
        entityLabel: data.description,
        action:      'created',
        data:        data as unknown as Record<string, unknown>,
      });
    }

    return apiOk(data, 201);
  } catch (err) {
    console.error('[POST /api/time-entries]', err);
    return apiError('Failed to create time entry', 500);
  }
}
