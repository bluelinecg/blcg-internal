/**
 * GET /api/emails
 * Returns a merged, date-sorted list of email thread metadata from all 3 Gmail accounts.
 * Message bodies are not included — fetch /api/emails/[id] for full thread content.
 */

import { NextResponse } from 'next/server';
import {
  ACCOUNT_KEYS,
  getGmailClient,
  threadFromGmailMetadata,
} from '@/lib/integrations/gmail';
import type { EmailThread } from '@/lib/types/emails';
import { requireAuth, apiError } from '@/lib/api/utils';

const THREADS_PER_ACCOUNT = 20;

export async function GET(): Promise<NextResponse> {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const results = await Promise.all(
      ACCOUNT_KEYS.map(async (accountKey) => {
        const gmail = getGmailClient(accountKey);

        // Fetch inbox and sent separately — Gmail treats these as mutually exclusive labels
        const [inboxRes, sentRes] = await Promise.all([
          gmail.users.threads.list({ userId: 'me', maxResults: THREADS_PER_ACCOUNT, labelIds: ['INBOX'] }),
          gmail.users.threads.list({ userId: 'me', maxResults: THREADS_PER_ACCOUNT, labelIds: ['SENT'] }),
        ]);

        // Deduplicate by thread ID (a thread can appear in both if you replied)
        const seen = new Set<string>();
        const threadIds = [...(inboxRes.data.threads ?? []), ...(sentRes.data.threads ?? [])].filter(
          (t) => t.id && !seen.has(t.id) && seen.add(t.id)
        );

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
    return apiError(message, 500);
  }
}
