/** @jest-environment node */
// Unit tests for app/api/time-entries/route.ts
// Tests GET (list) and POST (create) handlers with mocked dependencies.

import { GET, POST } from './route';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/db/time-entries', () => ({
  listTimeEntries:  jest.fn(),
  createTimeEntry:  jest.fn(),
}));

jest.mock('@/lib/api/utils', () => ({
  requireAuth: jest.fn(),
  apiError: jest.fn((msg: string, status: number) =>
    new NextResponse(JSON.stringify({ data: null, error: msg }), { status }),
  ),
  apiOk: jest.fn((data: unknown, status = 200) =>
    new NextResponse(JSON.stringify({ data, error: null }), { status }),
  ),
}));

jest.mock('@/lib/auth/roles', () => ({
  guardMember: jest.fn(),
}));

jest.mock('@/lib/utils/webhook-delivery', () => ({
  dispatchWebhookEvent: jest.fn(),
}));

jest.mock('@/lib/utils/audit', () => ({
  logAction: jest.fn(),
}));

import { listTimeEntries, createTimeEntry } from '@/lib/db/time-entries';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';
import { guardMember } from '@/lib/auth/roles';

const mockList        = listTimeEntries  as jest.Mock;
const mockCreate      = createTimeEntry  as jest.Mock;
const mockAuth        = requireAuth      as jest.Mock;
const mockGuardMember = guardMember      as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: 'user-1' });
  mockGuardMember.mockResolvedValue(null);
});

const MOCK_ENTRY = {
  id:          'entry-1',
  userId:      'user-1',
  hours:       2.5,
  date:        '2026-03-27',
  description: 'Worked on API routes',
  isBillable:  true,
  createdAt:   '2026-03-27T10:00:00Z',
  updatedAt:   '2026-03-27T10:00:00Z',
};

// ---------------------------------------------------------------------------
// GET Tests
// ---------------------------------------------------------------------------

describe('GET /api/time-entries', () => {
  it('returns 200 with list data on success', async () => {
    mockList.mockResolvedValue({ data: [MOCK_ENTRY], total: 1, error: null });

    const result = await GET(new Request('http://localhost/api/time-entries'));

    expect(result.status).toBe(200);
    const body = await result.json() as { data: unknown[]; total: number };
    expect(body.data).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it('returns 401 when not authenticated', async () => {
    const errorResponse = new NextResponse(
      JSON.stringify({ data: null, error: 'Unauthorised' }),
      { status: 401 },
    );
    mockAuth.mockResolvedValue(errorResponse);

    const result = await GET(new Request('http://localhost/api/time-entries'));

    expect(result.status).toBe(401);
  });

  it('returns 500 when db fails', async () => {
    mockList.mockResolvedValue({ data: null, total: null, error: 'DB error' });
    (apiError as jest.Mock).mockImplementation((msg: string, status: number) =>
      new NextResponse(JSON.stringify({ data: null, error: msg }), { status }),
    );

    const result = await GET(new Request('http://localhost/api/time-entries'));

    expect(apiError).toHaveBeenCalledWith('DB error', 500);
  });
});

// ---------------------------------------------------------------------------
// POST Tests
// ---------------------------------------------------------------------------

function makePostRequest(body: unknown): Request {
  return new Request('http://localhost/api/time-entries', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
}

describe('POST /api/time-entries', () => {
  const VALID_BODY = {
    date:        '2026-03-27',
    hours:       2.5,
    description: 'Worked on API routes',
    isBillable:  true,
  };

  it('returns 201 with created entry on success', async () => {
    mockCreate.mockResolvedValue({ data: MOCK_ENTRY, error: null });
    (apiOk as jest.Mock).mockImplementation((data: unknown, status = 200) =>
      new NextResponse(JSON.stringify({ data, error: null }), { status }),
    );

    const result = await POST(makePostRequest(VALID_BODY));

    expect(apiOk).toHaveBeenCalledWith(MOCK_ENTRY, 201);
    expect(result.status).toBe(201);
  });

  it('returns 400 for invalid body', async () => {
    (apiError as jest.Mock).mockImplementation((msg: string, status: number) =>
      new NextResponse(JSON.stringify({ data: null, error: msg }), { status }),
    );

    const result = await POST(makePostRequest({ hours: -5 }));

    expect(result.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 403 when user lacks member permission', async () => {
    const errorResponse = new NextResponse(
      JSON.stringify({ data: null, error: 'Forbidden' }),
      { status: 403 },
    );
    mockGuardMember.mockResolvedValue(errorResponse);

    const result = await POST(makePostRequest(VALID_BODY));

    expect(result.status).toBe(403);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
