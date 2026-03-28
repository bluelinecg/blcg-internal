/**
 * GET /api/invoices/[id]/pdf
 * Generates and streams a branded PDF for the given invoice.
 * Returns the PDF as an inline attachment (application/pdf).
 *
 * Auth: requires a valid Clerk session (member or admin).
 */

import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { getInvoiceById } from '@/lib/db/finances';
import { InvoicePDF } from '@/lib/pdf/invoice-template';
import { requireAuth, apiError } from '@/lib/api/utils';
import { guardMember } from '@/lib/auth/roles';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardMember();
    if (guard) return guard;

    const { id } = await params;
    const { data: invoice, error: dbError } = await getInvoiceById(id);
    if (dbError || !invoice) return apiError('Invoice not found', 404);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(React.createElement(InvoicePDF, { invoice }) as any);

    const filename = `Invoice-${invoice.invoiceNumber}.pdf`;

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length':      String(buffer.length),
      },
    });
  } catch (err) {
    console.error('[GET /api/invoices/[id]/pdf]', err);
    return apiError('Failed to generate PDF', 500);
  }
}
