// Next.js instrumentation hook — called once when the server starts.
// Registers the appropriate Sentry config for the current runtime.
//
// Next.js automatically picks up this file — no manual import needed.
// Must be at the project root (next to package.json), not inside /app.
//
// Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
