// GET    /api/invoices/[id] — fetch a single invoice with line items
// PATCH  /api/invoices/[id] — update an invoice
// DELETE /api/invoices/[id] — delete an invoice (409 if status is sent/viewed/overdue)
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, error: string | null }

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getInvoiceById, updateInvoice, deleteInvoice } from '@/lib/db/finances';
import { UpdateInvoiceSchema } from '@/lib/validations/finances';
import { guardAdmin } from '@/lib/auth/roles';
import { logAction } from '@/lib/utils/audit';

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

    const guard = await guardAdmin();
    if (guard) return guard;

    const { id } = await params;
    const { data, error } = await getInvoiceById(id);

    if (error) return NextResponse.json({ data: null, error }, { status: 500 });
    if (!data) return NextResponse.json({ data: null, error: 'Invoice not found' }, { status: 404 });

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('[GET /api/invoices/[id]]', err);
    return NextResponse.json({ data: null, error: 'Failed to load invoice' }, { status: 500 });
  }
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

    const parsed = UpdateInvoiceSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return NextResponse.json({ data: null, error }, { status: 400 });
    }

    const { data, error } = await updateInvoice(id, parsed.data);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });
    if (!data) return NextResponse.json({ data: null, error: 'Invoice not found' }, { status: 404 });

    if (parsed.data.status !== undefined) {
      void logAction({ entityType: 'invoice', entityId: id, entityLabel: data.invoiceNumber, action: 'status_changed', metadata: { to: data.status } });
    } else {
      void logAction({ entityType: 'invoice', entityId: id, entityLabel: data.invoiceNumber, action: 'updated' });
    }

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('[PATCH /api/invoices/[id]]', err);
    return NextResponse.json({ data: null, error: 'Failed to update invoice' }, { status: 500 });
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

    // Re-fetch to get current status for dependency check and audit label
    const { data: invoice, error: fetchErr } = await getInvoiceById(id);
    if (fetchErr) return NextResponse.json({ data: null, error: fetchErr }, { status: 500 });
    if (!invoice) return NextResponse.json({ data: null, error: 'Invoice not found' }, { status: 404 });

    if (BLOCKED_STATUSES.includes(invoice.status)) {
      return NextResponse.json(
        {
          data: null,
          error: `Cannot delete invoice: status is "${invoice.status}" — mark it as cancelled first`,
        },
        { status: 409 },
      );
    }

    const { error } = await deleteInvoice(id);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });

    void logAction({ entityType: 'invoice', entityId: id, entityLabel: invoice.invoiceNumber, action: 'deleted' });

    return NextResponse.json({ data: { id }, error: null });
  } catch (err) {
    console.error('[DELETE /api/invoices/[id]]', err);
    return NextResponse.json({ data: null, error: 'Failed to delete invoice' }, { status: 500 });
  }
}
