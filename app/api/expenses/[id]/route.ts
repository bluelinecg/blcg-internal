// GET    /api/expenses/[id] — fetch a single expense
// PATCH  /api/expenses/[id] — update an expense
// DELETE /api/expenses/[id] — delete an expense (no dependency restrictions)
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, error: string | null }

import { NextResponse } from 'next/server';
import { getExpenseById, updateExpense, deleteExpense } from '@/lib/db/finances';
import { UpdateExpenseSchema } from '@/lib/validations/finances';
import { guardAdmin } from '@/lib/auth/roles';
import { logAction } from '@/lib/utils/audit';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardAdmin();
    if (guard) return guard;

    const { id } = await params;

    const parsed = UpdateExpenseSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { data, error } = await updateExpense(id, parsed.data);
    if (error) return apiError(error, 500);
    if (!data) return apiError('Expense not found', 404);

    void logAction({ entityType: 'expense', entityId: id, entityLabel: data.description, action: 'updated' });

    return apiOk(data);
  } catch (err) {
    console.error('[PATCH /api/expenses/[id]]', err);
    return apiError('Failed to update expense', 500);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardAdmin();
    if (guard) return guard;

    const { id } = await params;

    // Fetch entity label before deletion for audit log
    const { data: expense } = await getExpenseById(id);

    const { error } = await deleteExpense(id);
    if (error) return apiError(error, 500);

    void logAction({ entityType: 'expense', entityId: id, entityLabel: expense?.description ?? id, action: 'deleted' });

    return apiOk({ id });
  } catch (err) {
    console.error('[DELETE /api/expenses/[id]]', err);
    return apiError('Failed to delete expense', 500);
  }
}
