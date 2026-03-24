/**
 * GET /api/emails/[id]   — Returns full thread with message bodies.
 * DELETE /api/emails/[id] — Moves the thread to trash.
 *
 * [id] is a composite ID: "{accountKey}_{gmailThreadId}"
 */

import { NextResponse } from 'next/server';
import {
  getGmailClient,
  decodeThreadId,
  threadFromGmailFull,
} from '@/lib/integrations/gmail';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const { accountKey, gmailThreadId } = decodeThreadId(id);
    const gmail = getGmailClient(accountKey);

    const res = await gmail.users.threads.get({
      userId: 'me',
      id: gmailThreadId,
      format: 'full',
    });

    const thread = threadFromGmailFull(res.data, accountKey);
    return apiOk(thread);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch thread';
    console.error('[GET /api/emails/[id]]', err);
    return apiError(message, 500);
  }
}

export async function DELETE(_req: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const { accountKey, gmailThreadId } = decodeThreadId(id);
    const gmail = getGmailClient(accountKey);

    await gmail.users.threads.trash({ userId: 'me', id: gmailThreadId });

    return apiOk({ id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete thread';
    console.error('[DELETE /api/emails/[id]]', err);
    return apiError(message, 500);
  }
}
