// GET    /api/invoices/[id] — fetch a single invoice with line items
// PATCH  /api/invoices/[id] — update an invoice
// DELETE /api/invoices/[id] — delete an invoice (409 if status is sent/viewed/overdue)
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, error: string | null }

import { NextResponse } from 'next/server';
import { getInvoiceById, updateInvoice, deleteInvoice } from '@/lib/db/finances';
import { UpdateInvoiceSchema } from '@/lib/validations/finances';
import { guardAdmin } from '@/lib/auth/roles';
import { bus } from '@/lib/events';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const BLOCKED_STATUSES = ['sent', 'viewed', 'overdue'];

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardAdmin();
    if (guard) return guard;

    const { id } = await params;
    const { data, error } = await getInvoiceById(id);

    if (error) return apiError(error, 500);
    if (!data) return apiError('Invoice not found', 404);

    return apiOk(data);
  } catch (err) {
    console.error('[GET /api/invoices/[id]]', err);
    return apiError('Failed to load invoice', 500);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const guard = await guardAdmin();
    if (guard) return guard;

    const { id } = await params;

    const parsed = UpdateInvoiceSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { data, error } = await updateInvoice(id, parsed.data);
    if (error) return apiError(error, 500);
    if (!data) return apiError('Invoice not found', 404);

    if (parsed.data.status !== undefined) {
      void bus.publish('invoice.status_changed', {
        actorId:     userId,
        entityType:  'invoice',
        entityId:    id,
        entityLabel: data.invoiceNumber,
        action:      'status_changed',
        data:        data as unknown as Record<string, unknown>,
        metadata:    { to: data.status, newStatus: data.status },
      });
    } else {
      void bus.publish('invoice.updated', {
        actorId:     userId,
        entityType:  'invoice',
        entityId:    id,
        entityLabel: data.invoiceNumber,
        action:      'updated',
        data:        data as unknown as Record<string, unknown>,
      });
    }

    return apiOk(data);
  } catch (err) {
    console.error('[PATCH /api/invoices/[id]]', err);
    return apiError('Failed to update invoice', 500);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const guard = await guardAdmin();
    if (guard) return guard;

    const { id } = await params;

    // Re-fetch to get current status for dependency check and audit label
    const { data: invoice, error: fetchErr } = await getInvoiceById(id);
    if (fetchErr) return apiError(fetchErr, 500);
    if (!invoice) return apiError('Invoice not found', 404);

    if (BLOCKED_STATUSES.includes(invoice.status)) {
      return apiError(`Cannot delete invoice: status is "${invoice.status}" — mark it as cancelled first`, 409);
    }

    const { error } = await deleteInvoice(id);
    if (error) return apiError(error, 500);

    void bus.publish('invoice.deleted', {
      actorId:     userId,
      entityType:  'invoice',
      entityId:    id,
      entityLabel: invoice.invoiceNumber,
      action:      'deleted',
      data:        invoice as unknown as Record<string, unknown>,
    });

    return apiOk({ id });
  } catch (err) {
    console.error('[DELETE /api/invoices/[id]]', err);
    return apiError('Failed to delete invoice', 500);
  }
}
