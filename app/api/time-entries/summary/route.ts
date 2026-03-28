// GET /api/time-entries/summary — aggregated time entry stats
//
// Query params: projectId?, startDate?, endDate?
// Auth: requires a valid Clerk session.
// Response shape: { data: TimeEntrySummary | null, error: string | null }

import { NextResponse } from 'next/server';
import { getTimeEntrySummary } from '@/lib/db/time-entries';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

export async function GET(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const url       = new URL(request.url);
    const projectId = url.searchParams.get('projectId') ?? undefined;
    const startDate = url.searchParams.get('startDate') ?? undefined;
    const endDate   = url.searchParams.get('endDate')   ?? undefined;

    const { data, error } = await getTimeEntrySummary({ projectId, startDate, endDate });
    if (error) return apiError(error, 500);

    return apiOk(data);
  } catch (err) {
    console.error('[GET /api/time-entries/summary]', err);
    return apiError('Failed to load time entry summary', 500);
  }
}
