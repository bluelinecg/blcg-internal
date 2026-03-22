import { formatDate } from './format';

describe('formatDate', () => {
  it('formats an ISO date string to a human-readable date', () => {
    expect(formatDate('2026-01-15T10:00:00Z')).toBe('January 15, 2026');
  });

  it('formats a date at the start of the year', () => {
    // Use noon UTC so the date is Jan 1 in all timezones (UTC midnight rolls back in UTC-)
    expect(formatDate('2026-01-01T12:00:00Z')).toBe('January 1, 2026');
  });

  it('formats a date at the end of the year', () => {
    expect(formatDate('2025-12-31T12:00:00Z')).toBe('December 31, 2025');
  });

  it('formats a mid-year date correctly', () => {
    expect(formatDate('2026-07-04T12:00:00Z')).toBe('July 4, 2026');
  });

  it('formats a date-only string (no time component)', () => {
    // Date-only strings are parsed as UTC midnight by most JS engines
    const result = formatDate('2026-03-22');
    expect(result).toMatch(/March/);
    expect(result).toMatch(/2026/);
  });

  it('returns a string', () => {
    expect(typeof formatDate('2026-06-15T00:00:00Z')).toBe('string');
  });
});
