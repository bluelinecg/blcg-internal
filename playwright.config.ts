import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for end-to-end tests.
 *
 * Design principles (extractable to any Next.js project):
 *   - baseURL driven by PLAYWRIGHT_BASE_URL env var — same config works locally
 *     and in CI against preview deployments
 *   - Local runs spin up `next dev` automatically via webServer
 *   - CI runs skip webServer (assumes app is already deployed/running)
 *   - Screenshots and traces captured on failure only — keeps artifacts small
 *   - Single Chromium project by default; add Firefox/WebKit as needed
 *
 * Swap the webServer command for your project's dev script.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  // Fail on .only in CI to prevent accidental test focus
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Uncomment to add cross-browser coverage:
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit',  use: { ...devices['Desktop Safari'] } },
  ],

  // Automatically start the dev server for local runs.
  // Remove or gate on !process.env.CI for CI environments where the app
  // is already deployed (e.g., Vercel preview URLs).
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
