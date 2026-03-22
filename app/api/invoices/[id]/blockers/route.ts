// GET /api/invoices/[id]/blockers
// Returns a list of strings describing why this invoice cannot be deleted.
// An empty array means deletion is safe to proceed.
//
// Auth: requires a valid Clerk session.

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getInvoiceById } from '@/lib/db/finances';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const BLOCKED_STATUSES = ['sent', 'viewed', 'overdue'];

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
    }

    const { id } = await params;
    const { data: invoice, error } = await getInvoiceById(id);

    if (error) return NextResponse.json({ data: null, error }, { status: 500 });
    if (!invoice) return NextResponse.json({ data: null, error: 'Invoice not found' }, { status: 404 });

    const blockers: string[] = [];
    if (BLOCKED_STATUSES.includes(invoice.status)) {
      blockers.push(`Invoice is "${invoice.status}" — mark it as cancelled before deleting`);
    }

    return NextResponse.json({ data: blockers, error: null });
  } catch (err) {
    console.error('[GET /api/invoices/[id]/blockers]', err);
    return NextResponse.json({ data: null, error: 'Failed to check dependencies' }, { status: 500 });
  }
}
