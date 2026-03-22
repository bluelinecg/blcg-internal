/**
 * E2E: Authentication flows
 *
 * Covers:
 *   - Unauthenticated users are redirected to sign-in
 *   - Successful sign-in lands on the dashboard
 *   - Sign-out returns to sign-in
 *   - Protected routes redirect when not signed in
 *
 * Prerequisites:
 *   - App running at PLAYWRIGHT_BASE_URL (default: http://localhost:3000)
 *   - E2E_USER_EMAIL and E2E_USER_PASSWORD set in .env.local
 */
import { test, expect } from '@playwright/test';
import { signIn, signOut } from './helpers/auth';

test.describe('Authentication', () => {
  test('redirects unauthenticated users from /dashboard to /sign-in', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('redirects unauthenticated users from any protected route', async ({ page }) => {
    await page.goto('/clients');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('sign-in page renders the Clerk sign-in form', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test('successful sign-in lands on /dashboard', async ({ page }) => {
    await signIn(page);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/dashboard/i).first()).toBeVisible();
  });

  test('sign-out returns to /sign-in', async ({ page }) => {
    await signIn(page);
    await signOut(page);
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('authenticated user can navigate back to the dashboard', async ({ page }) => {
    await signIn(page);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
