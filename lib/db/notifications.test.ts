// Unit tests for lib/db/notifications.ts
// Supabase serverClient is mocked — no real DB connection needed.

import {
  insertNotification,
  listNotifications,
  getUnreadCount,
  markRead,
  markUnread,
  markAllRead,
  deleteNotification,
} from './notifications';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

function makeChain(result: { data: unknown; count?: number | null; error: unknown }) {
  const chain = {
    select:      jest.fn().mockReturnThis(),
    insert:      jest.fn().mockReturnThis(),
    update:      jest.fn().mockReturnThis(),
    delete:      jest.fn().mockReturnThis(),
    upsert:      jest.fn().mockReturnThis(),
    order:       jest.fn().mockReturnThis(),
    limit:       jest.fn().mockReturnThis(),
    eq:          jest.fn().mockReturnThis(),
    single:      jest.fn().mockResolvedValue(result),
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
// Sample data
// ---------------------------------------------------------------------------

const NOTIF_ROW = {
  id:          'notif-1',
  user_id:     'user-1',
  type:        'automation',
  title:       'Test notification',
  body:        'Something happened',
  entity_type: null,
  entity_id:   null,
  is_read:     false,
  created_at:  '2026-03-25T00:00:00Z',
};

const NOTIF_MAPPED = {
  id:         'notif-1',
  userId:     'user-1',
  type:       'automation',
  title:      'Test notification',
  body:       'Something happened',
  entityType: null,
  entityId:   null,
  isRead:     false,
  createdAt:  '2026-03-25T00:00:00Z',
};

// ---------------------------------------------------------------------------
// insertNotification
// ---------------------------------------------------------------------------

describe('insertNotification', () => {
  it('returns the mapped notification on success', async () => {
    const chain = makeChain({ data: NOTIF_ROW, error: null });
    mockServerClient.mockReturnValue({ from: () => chain });

    const result = await insertNotification({
      userId: 'user-1',
      type:   'automation',
      title:  'Test notification',
      body:   'Something happened',
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual(NOTIF_MAPPED);
  });

  it('returns error on DB failure', async () => {
    const chain = makeChain({ data: null, error: { message: 'insert failed' } });
    mockServerClient.mockReturnValue({ from: () => chain });

    const result = await insertNotification({
      userId: 'user-1',
      type:   'automation',
      title:  'Test',
      body:   'Body',
    });

    expect(result.data).toBeNull();
    expect(result.error).toBe('insert failed');
  });
});

// ---------------------------------------------------------------------------
// listNotifications
// ---------------------------------------------------------------------------

describe('listNotifications', () => {
  it('returns mapped notifications', async () => {
    const chain = makeChain({ data: [NOTIF_ROW], error: null });
    mockServerClient.mockReturnValue({ from: () => chain });

    const result = await listNotifications('user-1');

    expect(result.error).toBeNull();
    expect(result.data).toEqual([NOTIF_MAPPED]);
  });

  it('returns error on DB failure', async () => {
    const chain = makeChain({ data: null, error: { message: 'query failed' } });
    mockServerClient.mockReturnValue({ from: () => chain });

    const result = await listNotifications('user-1');

    expect(result.data).toBeNull();
    expect(result.error).toBe('query failed');
  });
});

// ---------------------------------------------------------------------------
// getUnreadCount
// ---------------------------------------------------------------------------

describe('getUnreadCount', () => {
  it('returns the unread count', async () => {
    const chain = makeChain({ data: null, count: 5, error: null });
    mockServerClient.mockReturnValue({ from: () => chain });

    const result = await getUnreadCount('user-1');

    expect(result.error).toBeNull();
    expect(result.count).toBe(5);
  });

  it('returns 0 on DB failure', async () => {
    const chain = makeChain({ data: null, count: null, error: { message: 'count failed' } });
    mockServerClient.mockReturnValue({ from: () => chain });

    const result = await getUnreadCount('user-1');

    expect(result.count).toBe(0);
    expect(result.error).toBe('count failed');
  });
});

// ---------------------------------------------------------------------------
// markRead
// ---------------------------------------------------------------------------

describe('markRead', () => {
  it('returns no error on success', async () => {
    const chain = makeChain({ data: null, error: null });
    mockServerClient.mockReturnValue({ from: () => chain });

    const result = await markRead('notif-1', 'user-1');

    expect(result.error).toBeNull();
    expect(chain.eq).toHaveBeenCalledWith('id', 'notif-1');
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('returns error on DB failure', async () => {
    const chain = makeChain({ data: null, error: { message: 'update failed' } });
    mockServerClient.mockReturnValue({ from: () => chain });

    const result = await markRead('notif-1', 'user-1');

    expect(result.error).toBe('update failed');
  });
});

// ---------------------------------------------------------------------------
// markUnread
// ---------------------------------------------------------------------------

describe('markUnread', () => {
  it('returns no error on success', async () => {
    const chain = makeChain({ data: null, error: null });
    mockServerClient.mockReturnValue({ from: () => chain });

    const result = await markUnread('notif-1', 'user-1');

    expect(result.error).toBeNull();
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1');
  });
});

// ---------------------------------------------------------------------------
// markAllRead
// ---------------------------------------------------------------------------

describe('markAllRead', () => {
  it('returns no error on success', async () => {
    const chain = makeChain({ data: null, error: null });
    mockServerClient.mockReturnValue({ from: () => chain });

    const result = await markAllRead('user-1');

    expect(result.error).toBeNull();
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1');
  });
});

// ---------------------------------------------------------------------------
// deleteNotification
// ---------------------------------------------------------------------------

describe('deleteNotification', () => {
  it('returns no error on success', async () => {
    const chain = makeChain({ data: null, error: null });
    mockServerClient.mockReturnValue({ from: () => chain });

    const result = await deleteNotification('notif-1', 'user-1');

    expect(result.error).toBeNull();
    expect(chain.eq).toHaveBeenCalledWith('id', 'notif-1');
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('returns error on DB failure', async () => {
    const chain = makeChain({ data: null, error: { message: 'delete failed' } });
    mockServerClient.mockReturnValue({ from: () => chain });

    const result = await deleteNotification('notif-1', 'user-1');

    expect(result.error).toBe('delete failed');
  });
});
