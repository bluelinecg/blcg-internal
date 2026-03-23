/**
 * GET /api/auth/gmail/[account]
 * Temporary route for generating Gmail OAuth refresh tokens.
 * Redirects to Google's OAuth consent screen for the given account.
 *
 * Usage: visit /api/auth/gmail/ryan, /api/auth/gmail/nick, /api/auth/gmail/gmail
 * After authorising, the refresh token is displayed at the callback URL.
 * Copy each token into your .env.local and Vercel environment variables.
 * Delete this route once all three tokens are captured.
 */

import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { config } from '@/lib/config';

const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ account: string }> },
): Promise<NextResponse> {
  const { account } = await params;

  if (!['ryan', 'nick', 'gmail'].includes(account)) {
    return NextResponse.json({ error: `Unknown account "${account}". Use ryan, nick, or gmail.` }, { status: 400 });
  }

  if (!config.gmail.clientId || !config.gmail.clientSecret) {
    return NextResponse.json({ error: 'GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set.' }, { status: 500 });
  }

  const oauth2Client = new google.auth.OAuth2(
    config.gmail.clientId,
    config.gmail.clientSecret,
    `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/auth/gmail/callback`,
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state: account,
  });

  return NextResponse.redirect(url);
}
