/**
 * GET /api/auth/gmail/callback
 * Temporary OAuth callback route. Exchanges the authorization code for tokens
 * and displays the refresh token on screen so it can be copied into env vars.
 *
 * Delete this route and /api/auth/gmail/[account]/route.ts once all three
 * refresh tokens have been captured and saved.
 */

import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { config } from '@/lib/config';

const ACCOUNT_ENV_NAMES: Record<string, string> = {
  ryan:  'GMAIL_REFRESH_TOKEN_RYAN',
  nick:  'GMAIL_REFRESH_TOKEN_NICK',
  gmail: 'GMAIL_REFRESH_TOKEN_GMAIL',
};

const ACCOUNT_EMAILS: Record<string, string> = {
  ryan:  'ryan@bluelinecg.com',
  nick:  'nick@bluelinecg.com',
  gmail: 'bluelinecgllc@gmail.com',
};

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const code    = searchParams.get('code');
  const account = searchParams.get('state');
  const error   = searchParams.get('error');

  if (error) {
    return new NextResponse(`<pre>OAuth error: ${error}</pre>`, {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  if (!code || !account) {
    return new NextResponse('<pre>Missing code or state parameter.</pre>', {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  if (!config.gmail.clientId || !config.gmail.clientSecret) {
    return new NextResponse('<pre>GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set.</pre>', {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  const oauth2Client = new google.auth.OAuth2(
    config.gmail.clientId,
    config.gmail.clientSecret,
    `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/auth/gmail/callback`,
  );

  const { tokens } = await oauth2Client.getToken(code);
  const refreshToken = tokens.refresh_token;
  const envVar = ACCOUNT_ENV_NAMES[account] ?? 'UNKNOWN';
  const email  = ACCOUNT_EMAILS[account] ?? account;

  const html = `<!DOCTYPE html>
<html>
<head><title>Gmail Token — ${email}</title>
<style>
  body { font-family: monospace; max-width: 800px; margin: 40px auto; padding: 0 20px; }
  .token { background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 6px; padding: 16px; word-break: break-all; font-size: 14px; }
  .step { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 16px 0; }
  h2 { color: #0f172a; }
  code { background: #e2e8f0; padding: 2px 6px; border-radius: 3px; }
</style>
</head>
<body>
  <h2>✅ Refresh token for ${email}</h2>
  ${refreshToken ? `
  <div class="token">${refreshToken}</div>
  <div class="step">
    <strong>1. Copy the token above.</strong><br><br>
    <strong>2. Add to .env.local:</strong><br>
    <code>${envVar}=${refreshToken}</code><br><br>
    <strong>3. Add to Vercel:</strong> Dashboard → Settings → Environment Variables → add <code>${envVar}</code>
  </div>
  ` : `
  <p style="color:red">⚠️ No refresh token returned. This usually means the account was already authorised.
  Go back and visit <code>/api/auth/gmail/${account}</code> again — Google only returns a refresh token
  on the first authorisation or when <code>prompt=consent</code> is used.</p>
  `}
  <div class="step">
    <strong>Next:</strong> Authorise the remaining accounts, then delete
    <code>app/api/auth/gmail/</code> from the codebase.
  </div>
</body>
</html>`;

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
}
