/** @jest-environment node */
// Unit tests for app/api/notifications/[id]/route.ts (PATCH / DELETE)

import { PATCH, DELETE } from './route';
import { NextResponse } from 'next/server';

jest.mock('@/lib/db/notifications', () => ({
  markRead:           jest.fn(),
  markUnread:         jest.fn(),
  deleteNotification: jest.fn(),
}));

jest.mock('@/lib/api/utils', () => ({
  requireAuth: jest.fn(),
  apiError:    jest.fn((msg: string, status: number) => ({ status, body: { data: null, error: msg } })),
  apiOk:       jest.fn((data: unknown, status = 200) => ({ status, body: { data, error: null } })),
}));

import { markRead, markUnread, deleteNotification } from '@/lib/db/notifications';
import { requireAuth } from '@/lib/api/utils';

const mockMarkRead   = markRead           as jest.Mock;
const mockMarkUnread = markUnread         as jest.Mock;
const mockDelete     = deleteNotification as jest.Mock;
const mockAuth       = requireAuth        as jest.Mock;

const PARAMS = Promise.resolve({ id: 'notif-1' });

function makeRequest(body: unknown) {
  return { json: () => Promise.resolve(body) } as Request;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: 'user-1' });
});

// ---------------------------------------------------------------------------
// PATCH
// ---------------------------------------------------------------------------

describe('PATCH /api/notifications/[id]', () => {
  it('calls markRead when isRead is true', async () => {
    mockMarkRead.mockResolvedValue({ error: null });

    const res = await PATCH(makeRequest({ isRead: true }), { params: PARAMS });

    expect((res as { status: number }).status).toBe(200);
    expect(mockMarkRead).toHaveBeenCalledWith('notif-1', 'user-1');
  });

  it('calls markUnread when isRead is false', async () => {
    mockMarkUnread.mockResolvedValue({ error: null });

    const res = await PATCH(makeRequest({ isRead: false }), { params: PARAMS });

    expect((res as { status: number }).status).toBe(200);
    expect(mockMarkUnread).toHaveBeenCalledWith('notif-1', 'user-1');
  });

  it('returns 400 on invalid body', async () => {
    const res = await PATCH(makeRequest({ isRead: 'yes' }), { params: PARAMS });
    expect((res as { status: number }).status).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(new NextResponse(null, { status: 401 }));
    const res = await PATCH(makeRequest({ isRead: true }), { params: PARAMS });
    expect((res as { status: number }).status).toBe(401);
  });

  it('returns 500 on DB error', async () => {
    mockMarkRead.mockResolvedValue({ error: 'update failed' });
    const res = await PATCH(makeRequest({ isRead: true }), { params: PARAMS });
    expect((res as { status: number }).status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

describe('DELETE /api/notifications/[id]', () => {
  it('deletes notification and returns 200', async () => {
    mockDelete.mockResolvedValue({ error: null });

    const res = await DELETE({} as Request, { params: PARAMS });

    expect((res as { status: number }).status).toBe(200);
    expect(mockDelete).toHaveBeenCalledWith('notif-1', 'user-1');
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(new NextResponse(null, { status: 401 }));
    const res = await DELETE({} as Request, { params: PARAMS });
    expect((res as { status: number }).status).toBe(401);
  });

  it('returns 500 on DB error', async () => {
    mockDelete.mockResolvedValue({ error: 'delete failed' });
    const res = await DELETE({} as Request, { params: PARAMS });
    expect((res as { status: number }).status).toBe(500);
  });
});
