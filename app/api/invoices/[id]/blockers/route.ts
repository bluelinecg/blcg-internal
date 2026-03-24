// GET /api/invoices/[id]/blockers
// Returns a list of strings describing why this invoice cannot be deleted.
// An empty array means deletion is safe to proceed.
//
// Auth: requires a valid Clerk session.

import { NextResponse } from 'next/server';
import { getInvoiceById } from '@/lib/db/finances';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const BLOCKED_STATUSES = ['sent', 'viewed', 'overdue'];

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const { data: invoice, error } = await getInvoiceById(id);

    if (error) return apiError(error, 500);
    if (!invoice) return apiError('Invoice not found', 404);

    const blockers: string[] = [];
    if (BLOCKED_STATUSES.includes(invoice.status)) {
      blockers.push(`Invoice is "${invoice.status}" — mark it as cancelled before deleting`);
    }

    return apiOk(blockers);
  } catch (err) {
    console.error('[GET /api/invoices/[id]/blockers]', err);
    return apiError('Failed to check dependencies', 500);
  }
}
