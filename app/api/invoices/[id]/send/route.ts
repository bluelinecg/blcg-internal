/**
 * POST /api/invoices/[id]/send
 * Generates the invoice PDF and sends it as an email attachment via Gmail.
 *
 * Body: { to: string; cc?: string; subject?: string; body?: string; from?: EmailAccount }
 *
 * Auth: requires a valid Clerk session (member or admin).
 */

import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { z } from 'zod';
import { getInvoiceById } from '@/lib/db/finances';
import { InvoicePDF } from '@/lib/pdf/invoice-template';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';
import { guardMember } from '@/lib/auth/roles';
import { getGmailClient, EMAIL_TO_ACCOUNT_KEY } from '@/lib/integrations/gmail';
import { COMPANY_ADDRESS } from '@/lib/pdf/styles';
import type { EmailAccount } from '@/lib/types/emails';

const SendSchema = z.object({
  to:      z.string().email('Invalid recipient email'),
  cc:      z.string().optional(),
  subject: z.string().optional(),
  body:    z.string().optional(),
  from:    z.enum(['ryan@bluelinecg.com', 'bluelinecgllc@gmail.com']).optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardMember();
    if (guard) return guard;

    const { id } = await params;
    const { data: invoice, error: dbError } = await getInvoiceById(id);
    if (dbError || !invoice) return apiError('Invoice not found', 404);

    const json = await req.json() as unknown;
    const parsed = SendSchema.safeParse(json);
    if (!parsed.success) return apiError(parsed.error.issues[0].message, 400);

    const {
      to,
      cc,
      subject = `Invoice ${invoice.invoiceNumber}`,
      body    = buildDefaultBody(invoice.invoiceNumber, invoice.organization?.name),
      from    = 'ryan@bluelinecg.com',
    } = parsed.data;

    // Generate PDF buffer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(React.createElement(InvoicePDF, { invoice }) as any);
    const filename   = `Invoice-${invoice.invoiceNumber}.pdf`;

    // Send via Gmail with attachment
    const accountKey = EMAIL_TO_ACCOUNT_KEY[from as EmailAccount];
    if (!accountKey) return apiError('Unknown sender account', 400);

    const gmail = getGmailClient(accountKey);
    const raw   = buildMimeWithAttachment({ from, to, cc, subject, body, filename, pdfBuffer });

    const res = await gmail.users.messages.send({
      userId:      'me',
      requestBody: { raw },
    });

    return apiOk({ messageId: res.data.id }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send invoice';
    console.error('[POST /api/invoices/[id]/send]', err);
    return apiError(message, 500);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildDefaultBody(invoiceNumber: string, orgName: string | undefined): string {
  const greeting = orgName ? `Hi ${orgName},` : 'Hi,';
  return [
    greeting,
    '',
    `Please find attached Invoice ${invoiceNumber}.`,
    '',
    'Payment is due per the terms listed on the invoice. Please reach out if you have any questions.',
    '',
    `— ${COMPANY_ADDRESS.name}`,
  ].join('\n');
}

interface MimeOptions {
  from:      string;
  to:        string;
  cc?:       string;
  subject:   string;
  body:      string;
  filename:  string;
  pdfBuffer: Buffer;
}

/**
 * Builds a base64url-encoded RFC 2822 multipart/mixed message
 * containing a plain-text body and a PDF attachment.
 */
function buildMimeWithAttachment(opts: MimeOptions): string {
  const boundary = `----=_Part_${Date.now()}`;
  const pdfBase64 = opts.pdfBuffer.toString('base64');

  const lines: string[] = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    ...(opts.cc ? [`Cc: ${opts.cc}`] : []),
    `Subject: ${opts.subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=utf-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    opts.body,
    ``,
    `--${boundary}`,
    `Content-Type: application/pdf; name="${opts.filename}"`,
    `Content-Transfer-Encoding: base64`,
    `Content-Disposition: attachment; filename="${opts.filename}"`,
    ``,
    ...chunkBase64(pdfBase64),
    ``,
    `--${boundary}--`,
  ];

  return Buffer.from(lines.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function chunkBase64(b64: string): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < b64.length; i += 76) {
    chunks.push(b64.slice(i, i + 76));
  }
  return chunks;
}
