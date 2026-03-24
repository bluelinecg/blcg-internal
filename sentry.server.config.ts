// Sentry server-side initialisation.
// Runs in the Node.js runtime (API routes, Server Components, Server Actions).
// Loaded via instrumentation.ts — do not import directly.
//
// Extractable as-is to any Next.js App Router project.

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Lower sample rate on the server — API errors are the priority signal.
  tracesSampleRate: 0.1,

  // Scrub cookies and auth headers before sending to Sentry (OWASP A02 / A09).
  beforeSend(event) {
    if (event.request?.cookies) {
      event.request.cookies = '[Filtered]';
    }
    if (event.request?.headers?.authorization) {
      event.request.headers.authorization = '[Filtered]';
    }
    return event;
  },

  enabled: process.env.NODE_ENV === 'production',
});
