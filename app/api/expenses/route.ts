// GET  /api/expenses — list expenses (paginated, sortable)
// POST /api/expenses — create an expense
//
// Auth: requires a valid Clerk session + admin role.
// Response shape: { data: T | null, total: number | null, error: string | null }

import { NextResponse } from 'next/server';
import { listExpenses, createExpense } from '@/lib/db/finances';
import { ExpenseSchema } from '@/lib/validations/finances';
import { guardAdmin } from '@/lib/auth/roles';
import { parseListParams } from '@/lib/utils/parse-list-params';
import { logAction } from '@/lib/utils/audit';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

export async function GET(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardAdmin();
    if (guard) return guard;

    const options = parseListParams(new URL(request.url).searchParams);
    const { data, total, error } = await listExpenses(options);
    if (error) return apiError(error, 500);

    return NextResponse.json({ data, total, error: null });
  } catch (err) {
    console.error('[GET /api/expenses]', err);
    return apiError('Failed to load expenses', 500);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardAdmin();
    if (guard) return guard;

    const parsed = ExpenseSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { data, error } = await createExpense(parsed.data);
    if (error) return apiError(error, 500);

    if (data) void logAction({ entityType: 'expense', entityId: data.id, entityLabel: data.description, action: 'created' });

    return apiOk(data, 201);
  } catch (err) {
    console.error('[POST /api/expenses]', err);
    return apiError('Failed to create expense', 500);
  }
}
