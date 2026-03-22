/**
 * Playwright auth helper — handles sign-in for E2E tests.
 *
 * Clerk supports two approaches for E2E auth (choose one):
 *
 * Option A — Clerk Testing Tokens (recommended for CI)
 *   Requires CLERK_SECRET_KEY in environment. Clerk issues a one-time
 *   bypass token that lets Playwright sign in without a real password flow.
 *   Docs: https://clerk.com/docs/testing/playwright
 *
 * Option B — Real credentials via UI (simpler, works locally)
 *   Set E2E_USER_EMAIL and E2E_USER_PASSWORD in .env.local.
 *   Slower but requires no Clerk SDK setup.
 *
 * This file implements Option B by default. Swap to Option A when
 * integrating with CI by replacing signInViaUI with signInViaToken.
 *
 * Extractable as-is to any Clerk-authenticated Next.js project.
 */
import type { Page } from '@playwright/test';

export async function signIn(page: Page): Promise<void> {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'E2E_USER_EMAIL and E2E_USER_PASSWORD must be set in .env.local to run E2E tests.',
    );
  }

  await page.goto('/sign-in');
  await page.getByLabel(/email/i).fill(email);
  await page.getByRole('button', { name: /continue/i }).click();
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/);
}

export async function signOut(page: Page): Promise<void> {
  // Clerk UserButton opens a dropdown — click the avatar then Sign out
  await page.getByRole('button', { name: /open user button/i }).click();
  await page.getByRole('menuitem', { name: /sign out/i }).click();
  await page.waitForURL(/\/sign-in/);
}
