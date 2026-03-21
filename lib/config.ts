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

export const config = {
  clerk: {
    publishableKey: requireEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
    secretKey: requireEnv("CLERK_SECRET_KEY"),
  },
} as const;
