/** @jest-environment node */
// Unit tests for app/api/notifications/preferences/route.ts (GET / PUT)

import { GET, PUT } from './route';
import { NextResponse } from 'next/server';

jest.mock('@/lib/db/notification-preferences', () => ({
  getPreferences:    jest.fn(),
  upsertPreferences: jest.fn(),
}));

jest.mock('@/lib/api/utils', () => ({
  requireAuth: jest.fn(),
  apiError:    jest.fn((msg: string, status: number) => ({ status, body: { data: null, error: msg } })),
  apiOk:       jest.fn((data: unknown, status = 200) => ({ status, body: { data, error: null } })),
}));

import { getPreferences, upsertPreferences } from '@/lib/db/notification-preferences';
import { requireAuth } from '@/lib/api/utils';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/lib/types/notifications';

const mockGet    = getPreferences    as jest.Mock;
const mockUpsert = upsertPreferences as jest.Mock;
const mockAuth   = requireAuth       as jest.Mock;

function makeRequest(body: unknown) {
  return { json: () => Promise.resolve(body) } as Request;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: 'user-1' });
});

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

describe('GET /api/notifications/preferences', () => {
  it('returns preferences on success', async () => {
    mockGet.mockResolvedValue({ data: DEFAULT_NOTIFICATION_PREFERENCES, error: null });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(new NextResponse(null, { status: 401 }));
    const res = await GET();
    expect((res as { status: number }).status).toBe(401);
  });

  it('returns 500 on DB error', async () => {
    mockGet.mockResolvedValue({ data: null, error: 'query failed' });
    const res = await GET();
    expect((res as { status: number }).status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// PUT
// ---------------------------------------------------------------------------

describe('PUT /api/notifications/preferences', () => {
  it('upserts preferences and returns 200', async () => {
    mockUpsert.mockResolvedValue({ error: null });

    const res = await PUT(makeRequest(DEFAULT_NOTIFICATION_PREFERENCES));

    expect((res as { status: number }).status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith('user-1', DEFAULT_NOTIFICATION_PREFERENCES);
  });

  it('returns 400 on invalid body', async () => {
    const res = await PUT(makeRequest({ newProposal: 'yes' }));
    expect((res as { status: number }).status).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(new NextResponse(null, { status: 401 }));
    const res = await PUT(makeRequest(DEFAULT_NOTIFICATION_PREFERENCES));
    expect((res as { status: number }).status).toBe(401);
  });

  it('returns 500 on DB error', async () => {
    mockUpsert.mockResolvedValue({ error: 'upsert failed' });
    const res = await PUT(makeRequest(DEFAULT_NOTIFICATION_PREFERENCES));
    expect((res as { status: number }).status).toBe(500);
  });
});
