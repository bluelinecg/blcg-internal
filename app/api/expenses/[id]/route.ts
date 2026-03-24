// GET    /api/expenses/[id] — fetch a single expense
// PATCH  /api/expenses/[id] — update an expense
// DELETE /api/expenses/[id] — delete an expense (no dependency restrictions)
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, error: string | null }

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getExpenseById, updateExpense, deleteExpense } from '@/lib/db/finances';
import { UpdateExpenseSchema } from '@/lib/validations/finances';
import { guardAdmin } from '@/lib/auth/roles';
import { logAction } from '@/lib/utils/audit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
    }

    const guard = await guardAdmin();
    if (guard) return guard;

    const { id } = await params;

    const parsed = UpdateExpenseSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return NextResponse.json({ data: null, error }, { status: 400 });
    }

    const { data, error } = await updateExpense(id, parsed.data);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });
    if (!data) return NextResponse.json({ data: null, error: 'Expense not found' }, { status: 404 });

    void logAction({ entityType: 'expense', entityId: id, entityLabel: data.description, action: 'updated' });

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('[PATCH /api/expenses/[id]]', err);
    return NextResponse.json({ data: null, error: 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
    }

    const guard = await guardAdmin();
    if (guard) return guard;

    const { id } = await params;

    // Fetch entity label before deletion for audit log
    const { data: expense } = await getExpenseById(id);

    const { error } = await deleteExpense(id);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });

    void logAction({ entityType: 'expense', entityId: id, entityLabel: expense?.description ?? id, action: 'deleted' });

    return NextResponse.json({ data: { id }, error: null });
  } catch (err) {
    console.error('[DELETE /api/expenses/[id]]', err);
    return NextResponse.json({ data: null, error: 'Failed to delete expense' }, { status: 500 });
  }
}
