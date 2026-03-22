/**
 * Manual mock for @clerk/nextjs.
 *
 * Stubs all hooks, components, and server utilities used by this application.
 * Loaded globally via jest.config.ts moduleNameMapper so no individual test
 * needs to call jest.mock('@clerk/nextjs').
 *
 * Override return values per-test when auth state matters:
 *   import { useAuth } from '@clerk/nextjs';
 *   jest.mocked(useAuth).mockReturnValueOnce({ userId: null, isSignedIn: false, isLoaded: true });
 *
 * Extractable as-is. Add stubs for any additional Clerk exports your project uses.
 */

import type { ReactNode } from 'react';

// --- Client hooks ---

export const useAuth = jest.fn().mockReturnValue({
  userId: 'mock-user-id',
  sessionId: 'mock-session-id',
  isLoaded: true,
  isSignedIn: true,
  getToken: jest.fn().mockResolvedValue('mock-token'),
});

export const useUser = jest.fn().mockReturnValue({
  user: {
    id: 'mock-user-id',
    firstName: 'Test',
    lastName: 'User',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
  },
  isLoaded: true,
  isSignedIn: true,
});

export const useClerk = jest.fn().mockReturnValue({
  signOut: jest.fn(),
  openSignIn: jest.fn(),
  openSignUp: jest.fn(),
});

// --- Server utilities ---

export const auth = jest.fn().mockResolvedValue({
  userId: 'mock-user-id',
  sessionId: 'mock-session-id',
});

export const currentUser = jest.fn().mockResolvedValue({
  id: 'mock-user-id',
  firstName: 'Test',
  lastName: 'User',
  emailAddresses: [{ emailAddress: 'test@example.com' }],
});

// --- Middleware ---

export const clerkMiddleware = jest.fn();
export const createRouteMatcher = jest.fn().mockReturnValue(jest.fn().mockReturnValue(false));

// --- Components (pass-through stubs) ---
// Return children directly so component trees render normally in tests.

export function ClerkProvider({ children }: { children: ReactNode }): ReactNode {
  return children;
}

export function SignInButton({ children }: { children?: ReactNode }): ReactNode {
  return children ?? null;
}

export function SignUpButton({ children }: { children?: ReactNode }): ReactNode {
  return children ?? null;
}

export function SignOutButton({ children }: { children?: ReactNode }): ReactNode {
  return children ?? null;
}

export function UserButton(): null {
  return null;
}

export function SignIn(): null {
  return null;
}

export function SignUp(): null {
  return null;
}
