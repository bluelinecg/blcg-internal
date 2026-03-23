/**
 * PATCH /api/emails/[id]/read
 * Marks all messages in a thread as read by removing the UNREAD label.
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getGmailClient, decodeThreadId } from '@/lib/integrations/gmail';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(_req: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });

    const { id } = await params;
    const { accountKey, gmailThreadId } = decodeThreadId(id);
    const gmail = getGmailClient(accountKey);

    await gmail.users.threads.modify({
      userId: 'me',
      id: gmailThreadId,
      requestBody: { removeLabelIds: ['UNREAD'] },
    });

    return NextResponse.json({ data: { id }, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to mark thread as read';
    console.error('[PATCH /api/emails/[id]/read]', err);
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
