/**
 * Temporary route — generates the Google OAuth authorization URL for a given account.
 * Visit /api/auth/gmail/ryan, /api/auth/gmail/nick, or /api/auth/gmail/gmail
 * to start the consent flow for each account.
 * Remove this route after all 3 refresh tokens have been captured.
 */

import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const VALID_ACCOUNTS = ['ryan', 'nick', 'gmail'] as const;
type Account = (typeof VALID_ACCOUNTS)[number];

interface RouteParams {
  params: Promise<{ account: string }>;
}

export async function GET(_req: Request, { params }: RouteParams): Promise<NextResponse> {
  const { account } = await params;

  if (!VALID_ACCOUNTS.includes(account as Account)) {
    return NextResponse.json(
      { error: `Unknown account "${account}". Valid values: ryan, nick, gmail` },
      { status: 400 }
    );
  }

  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const redirectUri = process.env.GMAIL_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: 'GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REDIRECT_URI must be set in .env.local' },
      { status: 500 }
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // forces refresh token to be returned even if previously authorized
    scope: ['https://www.googleapis.com/auth/gmail.modify'],
    state: account, // passed through to callback so we know which account was authorized
  });

  return NextResponse.redirect(authUrl);
}
