/**
 * Central environment variable configuration.
 * All env vars used in the application are validated and exported from here.
 * Import from this file rather than accessing process.env directly anywhere else.
 *
 * SERVER-SIDE ONLY — never import this in a "use client" component.
 * CLERK_SECRET_KEY must never be exposed to the browser.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Check .env.local (development) or Vercel dashboard (production).`
    );
  }
  return value;
}

function optionalEnv(name: string): string | null {
  return process.env[name] ?? null;
}

export const config = {
  clerk: {
    publishableKey: requireEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
    secretKey: requireEnv("CLERK_SECRET_KEY"),
  },
  supabase: {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  },
  // Gmail credentials are optional — the emails page shows a "not configured" state
  // when these are absent. See TASKS.md for the OAuth setup steps.
  gmail: {
    clientId: optionalEnv("GMAIL_CLIENT_ID"),
    clientSecret: optionalEnv("GMAIL_CLIENT_SECRET"),
    refreshTokenRyan: optionalEnv("GMAIL_REFRESH_TOKEN_RYAN"),
    refreshTokenGmail: optionalEnv("GMAIL_REFRESH_TOKEN_GMAIL"),
  },
} as const;
