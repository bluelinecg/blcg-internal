/**
 * Temporary route — receives the OAuth callback from Google, exchanges the
 * authorization code for tokens, and displays the refresh token.
 * Copy the refresh token shown on screen into your .env.local file.
 * Remove this route after all 3 refresh tokens have been captured.
 */

import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const account = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return new NextResponse(
      `<html><body><h2>OAuth error</h2><pre>${error}</pre></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  if (!code || !account) {
    return new NextResponse(
      `<html><body><h2>Missing code or state</h2></body></html>`,
      { status: 400, headers: { 'Content-Type': 'text/html' } }
    );
  }

  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const redirectUri = process.env.GMAIL_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return new NextResponse(
      `<html><body><h2>Missing env vars</h2></body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const { tokens } = await oauth2Client.getToken(code);
  const refreshToken = tokens.refresh_token;

  const envKey = `GMAIL_REFRESH_TOKEN_${account.toUpperCase()}`;

  return new NextResponse(
    `<!DOCTYPE html>
<html>
<head><style>
  body { font-family: monospace; padding: 2rem; background: #0f172a; color: #f8fafc; }
  h2 { color: #38bdf8; }
  .token { background: #1e293b; padding: 1rem; border-radius: 6px; word-break: break-all; margin: 1rem 0; }
  .key { color: #86efac; font-weight: bold; }
  .value { color: #fde68a; }
  p { color: #94a3b8; }
</style></head>
<body>
  <h2>✓ Authorized: ${account}</h2>
  <p>Add this to your <strong>.env.local</strong> and Vercel environment variables:</p>
  <div class="token">
    <span class="key">${envKey}</span>=<span class="value">${refreshToken ?? '(no refresh token returned — try the flow again)'}</span>
  </div>
  <p>Once you have all 3 tokens, you can delete the <code>/api/auth/gmail</code> routes.</p>
</body>
</html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}
