/**
 * POST /api/emails/send
 * Composes and sends a new email from one of the 3 BLCG Gmail accounts.
 *
 * Body: { from: EmailAccount; to: string; cc?: string; subject: string; body: string }
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getGmailClient, EMAIL_TO_ACCOUNT_KEY } from '@/lib/integrations/gmail';
import type { EmailAccount } from '@/lib/types/emails';
import { z } from 'zod';

const SendSchema = z.object({
  from: z.enum([
    'ryan@bluelinecg.com',
    'bluelinecgllc@gmail.com',
  ]),
  to: z.string().email('Invalid recipient email'),
  cc: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });

    const json = await req.json() as unknown;
    const parsed = SendSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { from, to, cc, subject, body } = parsed.data;
    const accountKey = EMAIL_TO_ACCOUNT_KEY[from as EmailAccount];
    if (!accountKey) {
      return NextResponse.json({ data: null, error: 'Unknown sender account' }, { status: 400 });
    }
    const gmail = getGmailClient(accountKey);

    const rawLines = [
      `From: ${from}`,
      `To: ${to}`,
      ...(cc ? [`Cc: ${cc}`] : []),
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      body,
    ];

    const raw = Buffer.from(rawLines.join('\r\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    return NextResponse.json({ data: { messageId: res.data.id }, error: null }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send email';
    console.error('[POST /api/emails/send]', err);
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
