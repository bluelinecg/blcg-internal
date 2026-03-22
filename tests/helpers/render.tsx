/**
 * renderWithProviders — drop-in replacement for RTL's render() that wraps
 * the component under test with all application-level providers.
 *
 * Usage in tests:
 *   import { render, screen } from '@/tests/helpers/render';
 *   render(<MyComponent />);
 *
 * This file re-exports everything from @testing-library/react, so tests
 * only need a single import for render, screen, fireEvent, waitFor, etc.
 *
 * When new providers are added to the application (toast, query client,
 * theme, etc.) add them to AppProviders here so all tests benefit
 * automatically. The test itself never needs updating.
 *
 * Extractable as-is — add/remove providers in AppProviders to match
 * the target project.
 */
import React from 'react';
import { render as rtlRender, type RenderOptions } from '@testing-library/react';

// Re-export the full RTL surface so tests import from one place
export * from '@testing-library/react';

/**
 * Top-level provider wrapper for the test environment.
 * Mirrors the provider tree in app/layout.tsx.
 *
 * @clerk/nextjs is mocked globally via jest.config.ts moduleNameMapper,
 * so ClerkProvider does not need to be added here — it is a no-op in tests.
 */
function AppProviders({ children }: { children: React.ReactNode }): React.ReactElement {
  // Add providers here as the application grows:
  //   <QueryClientProvider client={queryClient}>
  //   <ToastProvider>
  //   <ThemeProvider>
  return <>{children}</>;
}

/**
 * Custom render that wraps any component with AppProviders.
 * Accepts all standard RTL RenderOptions except 'wrapper' (which is set here).
 */
export function render(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return rtlRender(ui, { wrapper: AppProviders, ...options });
}
