import type { Config } from 'jest';
import nextJest from 'next/jest.js';

/**
 * Base Jest configuration for Next.js + TypeScript projects.
 *
 * Uses the next/jest preset which handles:
 *   - SWC-based TypeScript/JSX transformation (no babel or ts-jest needed)
 *   - Next.js module aliases (@/* path resolution)
 *   - CSS module stubs and static asset mocks
 *   - next/image, next/font, and other Next.js internals
 *
 * Extractable as-is to any Next.js 15+ project. Swap moduleNameMapper
 * entries for whatever auth/routing providers the target project uses.
 */
const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',

  // Runs after the test environment is set up, before each test file.
  // Used to load @testing-library/jest-dom custom matchers globally.
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  moduleNameMapper: {
    // Resolve @/* path alias — mirrors tsconfig.json "paths"
    '^@/(.*)$': '<rootDir>/$1',
    // Manual mock for @clerk/nextjs — stubs all auth hooks and components
    '^@clerk/nextjs$': '<rootDir>/tests/__mocks__/@clerk/nextjs.ts',
    // Manual mock for next/navigation — stubs useRouter, usePathname, etc.
    '^next/navigation$': '<rootDir>/tests/__mocks__/next/navigation.ts',
  },

  // Exclude Playwright E2E specs from the Jest run
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/tests/e2e/',
  ],

  // Coverage: track all lib and component source files
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/index.ts',
  ],
};

export default createJestConfig(config);
