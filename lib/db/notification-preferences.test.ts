// Unit tests for lib/db/notification-preferences.ts
// Supabase serverClient is mocked — no real DB connection needed.

import { getPreferences, upsertPreferences } from './notification-preferences';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/lib/types/notifications';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

function makeChain(result: { data: unknown; error: unknown }) {
  const chain = {
    select:      jest.fn().mockReturnThis(),
    upsert:      jest.fn().mockReturnThis(),
    eq:          jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(result),
    then: jest.fn().mockImplementation((resolve: (v: unknown) => unknown) =>
      Promise.resolve(resolve(result)),
    ),
  };
  return chain;
}

jest.mock('@/lib/db/supabase', () => ({ serverClient: jest.fn() }));
import { serverClient } from '@/lib/db/supabase';
const mockServerClient = serverClient as jest.Mock;

// ---------------------------------------------------------------------------
// getPreferences
// ---------------------------------------------------------------------------

describe('getPreferences', () => {
  it('returns DEFAULT_NOTIFICATION_PREFERENCES when no row exists', async () => {
    const chain = makeChain({ data: null, error: null });
    mockServerClient.mockReturnValue({ from: () => chain });

    const result = await getPreferences('user-1');

    expect(result.error).toBeNull();
    expect(result.data).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  it('merges stored preferences over defaults', async () => {
    const stored = { newProposal: false, taskDue: false };
    const chain  = makeChain({ data: { preferences: stored }, error: null });
    mockServerClient.mockReturnValue({ from: () => chain });

    const result = await getPreferences('user-1');

    expect(result.error).toBeNull();
    expect(result.data?.newProposal).toBe(false);
    expect(result.data?.taskDue).toBe(false);
    // Defaults fill in missing keys
    expect(result.data?.invoicePaid).toBe(DEFAULT_NOTIFICATION_PREFERENCES.invoicePaid);
  });

  it('returns error on DB failure', async () => {
    const chain = makeChain({ data: null, error: { message: 'query failed' } });
    mockServerClient.mockReturnValue({ from: () => chain });

    const result = await getPreferences('user-1');

    expect(result.data).toBeNull();
    expect(result.error).toBe('query failed');
  });
});

// ---------------------------------------------------------------------------
// upsertPreferences
// ---------------------------------------------------------------------------

describe('upsertPreferences', () => {
  it('returns no error on success', async () => {
    const chain = makeChain({ data: null, error: null });
    mockServerClient.mockReturnValue({ from: () => chain });

    const result = await upsertPreferences('user-1', DEFAULT_NOTIFICATION_PREFERENCES);

    expect(result.error).toBeNull();
    expect(chain.upsert).toHaveBeenCalledWith(
      { user_id: 'user-1', preferences: DEFAULT_NOTIFICATION_PREFERENCES },
      { onConflict: 'user_id' },
    );
  });

  it('returns error on DB failure', async () => {
    const chain = makeChain({ data: null, error: { message: 'upsert failed' } });
    mockServerClient.mockReturnValue({ from: () => chain });

    const result = await upsertPreferences('user-1', DEFAULT_NOTIFICATION_PREFERENCES);

    expect(result.error).toBe('upsert failed');
  });
});
