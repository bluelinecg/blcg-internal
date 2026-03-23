/**
 * GET /api/emails
 * Returns a merged, date-sorted list of email thread metadata from all 3 Gmail accounts.
 * Message bodies are not included — fetch /api/emails/[id] for full thread content.
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import {
  ACCOUNT_KEYS,
  getGmailClient,
  threadFromGmailMetadata,
} from '@/lib/integrations/gmail';
import type { EmailThread } from '@/lib/types/emails';

const THREADS_PER_ACCOUNT = 20;

export async function GET(): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });

    const results = await Promise.all(
      ACCOUNT_KEYS.map(async (accountKey) => {
        const gmail = getGmailClient(accountKey);

        const listRes = await gmail.users.threads.list({
          userId: 'me',
          maxResults: THREADS_PER_ACCOUNT,
          labelIds: ['INBOX', 'SENT'],
        });

        const threadIds = listRes.data.threads ?? [];

        const threads = await Promise.all(
          threadIds.map(async (t) => {
            const detail = await gmail.users.threads.get({
              userId: 'me',
              id: t.id!,
              format: 'metadata',
              metadataHeaders: ['Subject', 'From', 'To', 'Date'],
            });
            return threadFromGmailMetadata(detail.data, accountKey);
          })
        );

        return threads;
      })
    );

    const merged: EmailThread[] = results
      .flat()
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    return NextResponse.json({ data: merged, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch emails';
    console.error('[GET /api/emails]', err);
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
