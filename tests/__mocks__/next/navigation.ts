/**
 * Manual mock for next/navigation.
 *
 * Stubs all routing hooks used by components in this application.
 * Loaded globally via jest.config.ts moduleNameMapper so no individual test
 * needs to call jest.mock('next/navigation').
 *
 * Override return values per-test when routing state matters:
 *   import { useRouter } from 'next/navigation';
 *   jest.mocked(useRouter).mockReturnValueOnce({ push: jest.fn(), ... });
 *
 * Extractable as-is to any Next.js App Router project.
 */

export const useRouter = jest.fn().mockReturnValue({
  push: jest.fn(),
  replace: jest.fn(),
  refresh: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  prefetch: jest.fn(),
});

export const usePathname = jest.fn().mockReturnValue('/dashboard');

export const useSearchParams = jest.fn().mockReturnValue(new URLSearchParams());

export const useParams = jest.fn().mockReturnValue({});

export const redirect = jest.fn();

export const notFound = jest.fn();
