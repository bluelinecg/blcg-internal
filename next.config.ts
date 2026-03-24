import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {};

export default withSentryConfig(nextConfig, {
  // Suppress verbose Sentry build output.
  silent: !process.env.CI,

  // Tree-shake Sentry debug logging from the production bundle.
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
  },

  // Upload source maps to Sentry at build time so stack traces are readable.
  // Requires SENTRY_AUTH_TOKEN in the build environment (Vercel env vars).
  // Source maps are deleted from the production bundle after upload.
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Disable Sentry's automatic tunnel route — not needed for this project.
  tunnelRoute: undefined,

  // Opt out of Sentry telemetry.
  telemetry: false,
});
