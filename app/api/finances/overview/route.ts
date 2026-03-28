// GET /api/finances/overview — aggregated KPI stats for the Finance Overview tab.
//
// Optional query params:
//   from  — ISO date string, filter records on or after this date
//   to    — ISO date string, filter records on or before this date
//
// Auth: requires a valid Clerk session + admin role.
// Response shape: { data: FinancesOverview | null, total: null, error: string | null }

import { NextResponse } from 'next/server';
import { getFinancesOverview } from '@/lib/db/finances';
import { guardAdmin } from '@/lib/auth/roles';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

export async function GET(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardAdmin();
    if (guard) return guard;

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from') ?? undefined;
    const to   = searchParams.get('to') ?? undefined;

    const { data, error } = await getFinancesOverview({ from, to });
    if (error) return apiError(error, 500);

    return apiOk(data);
  } catch (err) {
    console.error('[GET /api/finances/overview]', err);
    return apiError('Failed to load finances overview', 500);
  }
}
