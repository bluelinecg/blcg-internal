// Sentry edge runtime initialisation.
// Runs in Vercel's edge network (middleware, edge API routes).
// Loaded via instrumentation.ts — do not import directly.
//
// The edge runtime is a restricted environment — keep this config minimal.
// Replay and Node.js-specific integrations are not available here.

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === 'production',
});
