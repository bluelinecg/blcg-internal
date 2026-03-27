// GET  /api/invoices — list invoices (paginated, sortable)
// POST /api/invoices — create an invoice with line items
//
// Auth: requires a valid Clerk session + admin role.
// Response shape: { data: T | null, total: number | null, error: string | null }

import { NextResponse } from 'next/server';
import { listInvoices, createInvoice } from '@/lib/db/finances';
import { InvoiceSchema } from '@/lib/validations/finances';
import { guardAdmin } from '@/lib/auth/roles';
import { parseListParams } from '@/lib/utils/parse-list-params';
import { logAction } from '@/lib/utils/audit';
import { dispatchWebhookEvent } from '@/lib/utils/webhook-delivery';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

export async function GET(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardAdmin();
    if (guard) return guard;

    const options = parseListParams(new URL(request.url).searchParams);
    const { data, total, error } = await listInvoices(options);
    if (error) return apiError(error, 500);

    return NextResponse.json({ data, total, error: null });
  } catch (err) {
    console.error('[GET /api/invoices]', err);
    return apiError('Failed to load invoices', 500);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardAdmin();
    if (guard) return guard;

    const parsed = InvoiceSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { data, error } = await createInvoice(parsed.data);
    if (error) return apiError(error, 500);

    if (data) {
      void dispatchWebhookEvent('invoice.created', data as unknown as Record<string, unknown>);
      void logAction({ entityType: 'invoice', entityId: data.id, entityLabel: data.invoiceNumber, action: 'created' });
    }

    return apiOk(data, 201);
  } catch (err) {
    console.error('[POST /api/invoices]', err);
    return apiError('Failed to create invoice', 500);
  }
}
