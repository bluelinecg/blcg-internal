// Formats an ISO date string into a human-readable date.
// Example: '2026-01-15T10:00:00Z' → 'January 15, 2026'
export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
