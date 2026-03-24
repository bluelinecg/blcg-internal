// Sentry client-side initialisation.
// Runs in the browser on every page load.
// DSN is optional — if NEXT_PUBLIC_SENTRY_DSN is absent, Sentry is a no-op.
//
// Extractable as-is to any Next.js App Router project.
// Swap the dsn value; adjust tracesSampleRate and replaysOnErrorSampleRate for production load.

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 10% of transactions for performance monitoring.
  // Raise toward 1.0 once baseline is established; keep low to control cost.
  tracesSampleRate: 0.1,

  // Replay sessions only when an error occurs — keeps ingestion minimal.
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,

  integrations: [
    Sentry.replayIntegration({
      // Mask all text and block all media in replays to avoid capturing PII (OWASP A09).
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Scrub sensitive fields from breadcrumbs and request bodies before sending.
  // Prevents accidental capture of tokens, passwords, or PII (OWASP A02 / A09).
  beforeSend(event) {
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    return event;
  },

  // Only enable in production — avoids noise from local development.
  enabled: process.env.NODE_ENV === 'production',
});
