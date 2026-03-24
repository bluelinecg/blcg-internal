'use client';

// Global error boundary — catches unhandled errors that escape the root layout.
// Next.js renders this instead of the root layout when an uncaught error occurs,
// so it must include its own <html> and <body> tags.
//
// Automatically reports the error to Sentry before showing the fallback UI.
// Extractable as-is to any Next.js App Router project using @sentry/nextjs.

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Something went wrong</h1>
          <p className="text-sm text-gray-500 max-w-sm">
            An unexpected error occurred. The team has been notified.
          </p>
          <button
            onClick={reset}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
