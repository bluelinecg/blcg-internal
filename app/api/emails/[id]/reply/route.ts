/**
 * POST /api/emails/[id]/reply
 * Sends a reply within an existing Gmail thread.
 *
 * Body: { body: string }
 * The reply is sent from the account that owns the thread.
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getGmailClient, decodeThreadId } from '@/lib/integrations/gmail';
import { z } from 'zod';

const ReplySchema = z.object({
  body: z.string().min(1, 'Reply body is required'),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });

    const { id } = await params;
    const { accountKey, gmailThreadId } = decodeThreadId(id);
    const gmail = getGmailClient(accountKey);

    const json = await req.json() as unknown;
    const parsed = ReplySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Fetch the thread to get the last message's headers for threading
    const threadRes = await gmail.users.threads.get({
      userId: 'me',
      id: gmailThreadId,
      format: 'metadata',
      metadataHeaders: ['Subject', 'From', 'To', 'Message-ID', 'References'],
    });

    const messages = threadRes.data.messages ?? [];
    const lastMsg = messages[messages.length - 1];
    const headers = lastMsg?.payload?.headers ?? [];

    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';

    const subject = getHeader('Subject');
    const replyTo = getHeader('From');
    const messageId = getHeader('Message-ID');
    const references = getHeader('References');

    // Compose RFC 2822 message
    const rawLines = [
      `To: ${replyTo}`,
      `Subject: ${subject.startsWith('Re:') ? subject : `Re: ${subject}`}`,
      `In-Reply-To: ${messageId}`,
      `References: ${references ? `${references} ${messageId}` : messageId}`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      parsed.data.body,
    ];

    const raw = Buffer.from(rawLines.join('\r\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw, threadId: gmailThreadId },
    });

    return NextResponse.json({ data: { threadId: id }, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send reply';
    console.error('[POST /api/emails/[id]/reply]', err);
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
