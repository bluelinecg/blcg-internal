/**
 * PATCH /api/emails/[id]/read
 * Marks all messages in a thread as read by removing the UNREAD label.
 */

import { NextResponse } from 'next/server';
import { getGmailClient, decodeThreadId } from '@/lib/integrations/gmail';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(_req: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const { accountKey, gmailThreadId } = decodeThreadId(id);
    const gmail = getGmailClient(accountKey);

    await gmail.users.threads.modify({
      userId: 'me',
      id: gmailThreadId,
      requestBody: { removeLabelIds: ['UNREAD'] },
    });

    return apiOk({ id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to mark thread as read';
    console.error('[PATCH /api/emails/[id]/read]', err);
    return apiError(message, 500);
  }
}
