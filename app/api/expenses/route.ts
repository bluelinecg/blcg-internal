// GET  /api/expenses — list all expenses
// POST /api/expenses — create an expense
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, error: string | null }

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { listExpenses, createExpense } from '@/lib/db/finances';
import { ExpenseSchema } from '@/lib/validations/finances';
import { guardAdmin } from '@/lib/auth/roles';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
    }

    const guard = await guardAdmin();
    if (guard) return guard;

    const { data, error } = await listExpenses();
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('[GET /api/expenses]', err);
    return NextResponse.json({ data: null, error: 'Failed to load expenses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
    }

    const guard = await guardAdmin();
    if (guard) return guard;

    const parsed = ExpenseSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return NextResponse.json({ data: null, error }, { status: 400 });
    }

    const { data, error } = await createExpense(parsed.data);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });

    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/expenses]', err);
    return NextResponse.json({ data: null, error: 'Failed to create expense' }, { status: 500 });
  }
}
