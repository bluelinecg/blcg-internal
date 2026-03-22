/**
 * Global Jest setup — runs after the test environment is set up, before each test file.
 *
 * Loads @testing-library/jest-dom which extends Jest's expect() with
 * DOM-specific matchers: toBeInTheDocument, toBeDisabled, toHaveTextContent, etc.
 *
 * Extractable as-is to any project using @testing-library/jest-dom.
 */
import '@testing-library/jest-dom';
