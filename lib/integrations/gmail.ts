/**
 * Gmail API integration.
 *
 * Provides authenticated Gmail clients for each of the 3 BLCG accounts,
 * plus helpers to map Gmail API responses to our EmailThread / EmailMessage types.
 *
 * Thread IDs in this app are composite: "{accountKey}_{gmailThreadId}".
 * This allows any API route to identify which Gmail client to use for a given thread.
 */

import { google, gmail_v1 } from 'googleapis';
import { config } from '@/lib/config';
import type { EmailAccount, EmailFolder, EmailMessage, EmailThread } from '@/lib/types/emails';

export type AccountKey = 'ryan' | 'nick' | 'gmail';

export const ACCOUNT_KEY_TO_EMAIL: Record<AccountKey, EmailAccount> = {
  ryan: 'ryan@bluelinecg.com',
  nick: 'nick@bluelinecg.com',
  gmail: 'bluelinecgllc@gmail.com',
};

export const EMAIL_TO_ACCOUNT_KEY: Record<EmailAccount, AccountKey> = {
  'ryan@bluelinecg.com': 'ryan',
  'nick@bluelinecg.com': 'nick',
  'bluelinecgllc@gmail.com': 'gmail',
};

export const ACCOUNT_KEYS: AccountKey[] = ['ryan', 'nick', 'gmail'];

/** Returns an authenticated Gmail API client for the given account key.
 *  Throws a descriptive error if Gmail credentials have not been configured yet. */
export function getGmailClient(accountKey: AccountKey) {
  const { clientId, clientSecret } = config.gmail;
  const refreshTokens: Record<AccountKey, string | null> = {
    ryan: config.gmail.refreshTokenRyan,
    nick: config.gmail.refreshTokenNick,
    gmail: config.gmail.refreshTokenGmail,
  };

  if (!clientId || !clientSecret || !refreshTokens[accountKey]) {
    throw new Error(
      'Gmail integration not configured. Complete the OAuth setup in TASKS.md before using the emails page.'
    );
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshTokens[accountKey] });

  return google.gmail({ version: 'v1', auth });
}

/** Encodes an account key + Gmail thread ID into our app's composite thread ID. */
export function encodeThreadId(accountKey: AccountKey, gmailThreadId: string): string {
  return `${accountKey}_${gmailThreadId}`;
}

/** Decodes our composite thread ID into account key + Gmail thread ID. */
export function decodeThreadId(compositeId: string): { accountKey: AccountKey; gmailThreadId: string } {
  const idx = compositeId.indexOf('_');
  return {
    accountKey: compositeId.slice(0, idx) as AccountKey,
    gmailThreadId: compositeId.slice(idx + 1),
  };
}

/** Extracts a named header value from a list of Gmail message headers. */
export function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[],
  name: string
): string {
  return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
}

/** Recursively extracts the plain-text body from a Gmail message payload. */
export function extractBody(payload: gmail_v1.Schema$MessagePart): string {
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const body = extractBody(part);
      if (body) return body;
    }
  }
  return '';
}

/** Maps Gmail message label IDs to our EmailFolder type. */
function labelsToFolder(labelIds: string[]): EmailFolder {
  if (labelIds.includes('DRAFT')) return 'drafts';
  if (labelIds.includes('SENT')) return 'sent';
  return 'inbox';
}

/**
 * Maps a full Gmail thread (format: 'full') to our EmailThread type.
 * Includes complete message bodies. Use for thread detail view.
 */
export function threadFromGmailFull(
  thread: gmail_v1.Schema$Thread,
  accountKey: AccountKey
): EmailThread {
  const messages = thread.messages ?? [];
  const account = ACCOUNT_KEY_TO_EMAIL[accountKey];
  const lastMessage = messages[messages.length - 1];
  const allLabels = messages.flatMap((m) => m.labelIds ?? []);
  const isRead = !allLabels.includes('UNREAD');

  const mappedMessages: EmailMessage[] = messages.map((msg) => {
    const headers = msg.payload?.headers ?? [];
    const msgLabels = msg.labelIds ?? [];
    const toRaw = getHeader(headers, 'To');
    const ccRaw = getHeader(headers, 'Cc');

    return {
      id: msg.id ?? '',
      threadId: thread.id ?? '',
      from: getHeader(headers, 'From'),
      to: toRaw ? toRaw.split(',').map((s) => s.trim()) : [],
      cc: ccRaw ? ccRaw.split(',').map((s) => s.trim()) : undefined,
      subject: getHeader(headers, 'Subject'),
      body: msg.payload ? extractBody(msg.payload) : (msg.snippet ?? ''),
      timestamp: msg.internalDate
        ? new Date(parseInt(msg.internalDate)).toISOString()
        : new Date().toISOString(),
      isRead: !msgLabels.includes('UNREAD'),
      folder: labelsToFolder(msgLabels),
      account,
    };
  });

  const firstHeaders = messages[0]?.payload?.headers ?? [];
  const allParticipants = new Set<string>();
  mappedMessages.forEach((m) => {
    if (m.from) allParticipants.add(m.from);
    m.to.forEach((a) => allParticipants.add(a));
  });

  return {
    id: encodeThreadId(accountKey, thread.id ?? ''),
    subject: getHeader(firstHeaders, 'Subject') || '(no subject)',
    participants: Array.from(allParticipants),
    messages: mappedMessages,
    lastMessageAt: lastMessage?.internalDate
      ? new Date(parseInt(lastMessage.internalDate)).toISOString()
      : new Date().toISOString(),
    isRead,
    account,
    folder: labelsToFolder(lastMessage?.labelIds ?? []),
    preview: thread.snippet ?? '',
  };
}

/**
 * Maps a Gmail thread (format: 'metadata') to our EmailThread type.
 * Messages array is empty — only thread-level metadata is included.
 * Use for list views; fetch /api/emails/[id] for full message bodies.
 */
export function threadFromGmailMetadata(
  thread: gmail_v1.Schema$Thread,
  accountKey: AccountKey
): EmailThread {
  const messages = thread.messages ?? [];
  const account = ACCOUNT_KEY_TO_EMAIL[accountKey];
  const lastMessage = messages[messages.length - 1];
  const allLabels = messages.flatMap((m) => m.labelIds ?? []);
  const isRead = !allLabels.includes('UNREAD');

  const firstHeaders = messages[0]?.payload?.headers ?? [];
  const lastHeaders = lastMessage?.payload?.headers ?? [];

  const participants = [
    getHeader(firstHeaders, 'From'),
    getHeader(lastHeaders, 'To'),
  ].filter(Boolean);

  return {
    id: encodeThreadId(accountKey, thread.id ?? ''),
    subject: getHeader(firstHeaders, 'Subject') || '(no subject)',
    participants,
    messages: [],
    lastMessageAt: lastMessage?.internalDate
      ? new Date(parseInt(lastMessage.internalDate)).toISOString()
      : new Date().toISOString(),
    isRead,
    account,
    folder: labelsToFolder(lastMessage?.labelIds ?? []),
    preview: thread.snippet ?? '',
  };
}
