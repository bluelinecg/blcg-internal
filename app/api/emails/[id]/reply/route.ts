/**
 * POST /api/emails/[id]/reply
 * Sends a reply within an existing Gmail thread.
 *
 * Body: { body: string }
 * The reply is sent from the account that owns the thread.
 */

import { NextRequest, NextResponse } from 'next/server';
import { guardMember } from '@/lib/auth/roles';
import { getGmailClient, decodeThreadId } from '@/lib/integrations/gmail';
import { z } from 'zod';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

const ReplySchema = z.object({
  body: z.string().min(1, 'Reply body is required'),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardMember();
    if (guard) return guard;

    const { id } = await params;
    const { accountKey, gmailThreadId } = decodeThreadId(id);
    const gmail = getGmailClient(accountKey);

    const json = await req.json() as unknown;
    const parsed = ReplySchema.safeParse(json);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, 400);
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

    return apiOk({ threadId: id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send reply';
    console.error('[POST /api/emails/[id]/reply]', err);
    return apiError(message, 500);
  }
}
