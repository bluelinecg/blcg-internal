// GET  /api/invoices — list invoices (paginated, sortable)
// POST /api/invoices — create an invoice with line items
//
// Auth: requires a valid Clerk session + admin role.
// Response shape: { data: T | null, total: number | null, error: string | null }

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { listInvoices, createInvoice } from '@/lib/db/finances';
import { InvoiceSchema } from '@/lib/validations/finances';
import { guardAdmin } from '@/lib/auth/roles';
import { parseListParams } from '@/lib/utils/parse-list-params';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, total: null, error: 'Unauthorised' }, { status: 401 });
    }

    const guard = await guardAdmin();
    if (guard) return guard;

    const options = parseListParams(new URL(request.url).searchParams);
    const { data, total, error } = await listInvoices(options);
    if (error) return NextResponse.json({ data: null, total: null, error }, { status: 500 });

    return NextResponse.json({ data, total, error: null });
  } catch (err) {
    console.error('[GET /api/invoices]', err);
    return NextResponse.json({ data: null, total: null, error: 'Failed to load invoices' }, { status: 500 });
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

    const parsed = InvoiceSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return NextResponse.json({ data: null, error }, { status: 400 });
    }

    const { data, error } = await createInvoice(parsed.data);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });

    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/invoices]', err);
    return NextResponse.json({ data: null, error: 'Failed to create invoice' }, { status: 500 });
  }
}
