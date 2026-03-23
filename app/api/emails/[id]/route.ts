/**
 * GET /api/emails/[id]   — Returns full thread with message bodies.
 * DELETE /api/emails/[id] — Moves the thread to trash.
 *
 * [id] is a composite ID: "{accountKey}_{gmailThreadId}"
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import {
  getGmailClient,
  decodeThreadId,
  threadFromGmailFull,
} from '@/lib/integrations/gmail';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });

    const { id } = await params;
    const { accountKey, gmailThreadId } = decodeThreadId(id);
    const gmail = getGmailClient(accountKey);

    const res = await gmail.users.threads.get({
      userId: 'me',
      id: gmailThreadId,
      format: 'full',
    });

    const thread = threadFromGmailFull(res.data, accountKey);
    return NextResponse.json({ data: thread, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch thread';
    console.error('[GET /api/emails/[id]]', err);
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });

    const { id } = await params;
    const { accountKey, gmailThreadId } = decodeThreadId(id);
    const gmail = getGmailClient(accountKey);

    await gmail.users.threads.trash({ userId: 'me', id: gmailThreadId });

    return NextResponse.json({ data: { id }, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete thread';
    console.error('[DELETE /api/emails/[id]]', err);
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
