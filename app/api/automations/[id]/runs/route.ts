// GET /api/automations/[id]/runs — fetch run history for a rule (last 20)
//
// Auth: requires a valid Clerk session. Admin only (run log is sensitive).
// Response shape: { data: T | null, error: string | null }

import { NextResponse } from 'next/server';
import { getRunsForRule } from '@/lib/db/automations';
import { guardAdmin } from '@/lib/auth/roles';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardAdmin();
    if (guard) return guard;

    const { id } = await params;
    const { data, error } = await getRunsForRule(id);

    if (error) return apiError(error, 500);

    return apiOk(data);
  } catch (err) {
    console.error('[GET /api/automations/[id]/runs]', err);
    return apiError('Failed to load run history', 500);
  }
}
