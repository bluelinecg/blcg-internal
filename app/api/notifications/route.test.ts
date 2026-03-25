// Unit tests for app/api/notifications/route.ts (GET list / POST insert)

import { GET, POST } from './route';

jest.mock('@/lib/db/notifications', () => ({
  listNotifications: jest.fn(),
  getUnreadCount:    jest.fn(),
  insertNotification: jest.fn(),
}));

jest.mock('@/lib/api/utils', () => ({
  requireAuth: jest.fn(),
  apiError:    jest.fn((msg: string, status: number) => ({ status, body: { data: null, error: msg } })),
  apiOk:       jest.fn((data: unknown, status = 200) => ({ status, body: { data, error: null } })),
}));

import { listNotifications, getUnreadCount, insertNotification } from '@/lib/db/notifications';
import { requireAuth } from '@/lib/api/utils';

const mockList   = listNotifications  as jest.Mock;
const mockCount  = getUnreadCount     as jest.Mock;
const mockInsert = insertNotification as jest.Mock;
const mockAuth   = requireAuth        as jest.Mock;

const NOTIF = {
  id: 'n-1', userId: 'user-1', type: 'automation', title: 'Hello', body: 'World',
  entityType: null, entityId: null, isRead: false, createdAt: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: 'user-1' });
});

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

describe('GET /api/notifications', () => {
  it('returns notifications and unreadCount on success', async () => {
    mockList.mockResolvedValue({ data: [NOTIF], error: null });
    mockCount.mockResolvedValue({ count: 1, error: null });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      notifications: [NOTIF],
      unreadCount:   1,
    });
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ status: 401 });
    const res = await GET();
    expect((res as { status: number }).status).toBe(401);
  });

  it('returns 500 on DB error', async () => {
    mockList.mockResolvedValue({ data: null, error: 'DB down' });
    mockCount.mockResolvedValue({ count: 0, error: null });

    const res = await GET();
    expect((res as { status: number }).status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

describe('POST /api/notifications', () => {
  function makeRequest(body: unknown) {
    return { json: () => Promise.resolve(body) } as Request;
  }

  it('creates a notification and returns 201', async () => {
    mockInsert.mockResolvedValue({ data: NOTIF, error: null });

    const res = await POST(makeRequest({ type: 'automation', title: 'Hello', body: 'World' }));

    expect((res as { status: number }).status).toBe(201);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', type: 'automation', title: 'Hello', body: 'World' }),
    );
  });

  it('returns 400 on invalid body', async () => {
    const res = await POST(makeRequest({ type: 'INVALID' }));
    expect((res as { status: number }).status).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ status: 401 });
    const res = await POST(makeRequest({ type: 'automation', title: 'T', body: 'B' }));
    expect((res as { status: number }).status).toBe(401);
  });

  it('returns 500 on DB error', async () => {
    mockInsert.mockResolvedValue({ data: null, error: 'insert failed' });
    const res = await POST(makeRequest({ type: 'automation', title: 'T', body: 'B' }));
    expect((res as { status: number }).status).toBe(500);
  });
});
