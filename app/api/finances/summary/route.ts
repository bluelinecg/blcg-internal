// GET /api/finances/summary — aggregate financial KPIs across all invoices and expenses.
//
// Auth: requires a valid Clerk session + admin role.
// Response shape: { data: FinanceSummary | null, error: string | null }

import { NextResponse } from 'next/server';
import { getFinanceSummary } from '@/lib/db/finances';
import { guardAdmin } from '@/lib/auth/roles';
import { requireAuth, apiError } from '@/lib/api/utils';

export async function GET(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardAdmin();
    if (guard) return guard;

    const { data, error } = await getFinanceSummary();
    if (error) return apiError(error, 500);

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('[GET /api/finances/summary]', err);
    return apiError('Failed to load finance summary', 500);
  }
}
