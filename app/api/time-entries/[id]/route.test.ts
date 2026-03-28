/** @jest-environment node */
// Unit tests for app/api/time-entries/[id]/route.ts
// Tests GET, PATCH, DELETE handlers with mocked dependencies.
// All dependencies are mocked — no real DB, Clerk, or network calls.

import { GET, PATCH, DELETE } from './route';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/db/time-entries', () => ({
  getTimeEntryById: jest.fn(),
  updateTimeEntry:  jest.fn(),
  deleteTimeEntry:  jest.fn(),
}));

jest.mock('@/lib/api/utils', () => ({
  requireAuth: jest.fn(),
  apiError: jest.fn((msg: string, status: number) =>
    new NextResponse(JSON.stringify({ data: null, error: msg }), { status }),
  ),
  apiOk: jest.fn((data: unknown) =>
    new NextResponse(JSON.stringify({ data, error: null }), { status: 200 }),
  ),
}));

jest.mock('@/lib/auth/roles', () => ({
  guardAdmin:  jest.fn(),
  guardMember: jest.fn(),
}));

jest.mock('@/lib/utils/webhook-delivery', () => ({
  dispatchWebhookEvent: jest.fn(),
}));

jest.mock('@/lib/utils/audit', () => ({
  logAction: jest.fn(),
}));

import { getTimeEntryById, updateTimeEntry, deleteTimeEntry } from '@/lib/db/time-entries';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';
import { guardAdmin, guardMember } from '@/lib/auth/roles';

const mockGetEntry   = getTimeEntryById as jest.Mock;
const mockUpdate     = updateTimeEntry  as jest.Mock;
const mockDelete     = deleteTimeEntry  as jest.Mock;
const mockAuth       = requireAuth      as jest.Mock;
const mockGuardAdmin = guardAdmin       as jest.Mock;
const mockGuardMember = guardMember     as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: 'user-1' });
  mockGuardAdmin.mockResolvedValue(null);
  mockGuardMember.mockResolvedValue(null);
});

const MOCK_ENTRY = {
  id:          'entry-1',
  userId:      'user-1',
  projectId:   'project-1',
  hours:       2.5,
  date:        '2026-03-27',
  description: 'Worked on API routes',
  isBillable:  true,
  createdAt:   '2026-03-27T10:00:00Z',
  updatedAt:   '2026-03-27T10:00:00Z',
};

const PARAMS = Promise.resolve({ id: 'entry-1' });

// ---------------------------------------------------------------------------
// GET Tests
// ---------------------------------------------------------------------------

describe('GET /api/time-entries/[id]', () => {
  it('returns 200 with entry data on success', async () => {
    mockGetEntry.mockResolvedValue({ data: MOCK_ENTRY, error: null });
    (apiOk as jest.Mock).mockImplementation((data: unknown) =>
      new NextResponse(JSON.stringify({ data, error: null }), { status: 200 }),
    );

    await GET(new Request('http://localhost'), { params: PARAMS });

    expect(apiOk).toHaveBeenCalledWith(MOCK_ENTRY);
  });

  it('returns 404 when entry not found', async () => {
    mockGetEntry.mockResolvedValue({ data: null, error: null });
    (apiError as jest.Mock).mockImplementation((msg: string, status: number) =>
      new NextResponse(JSON.stringify({ data: null, error: msg }), { status }),
    );

    await GET(new Request('http://localhost'), { params: PARAMS });

    expect(apiError).toHaveBeenCalledWith('Time entry not found', 404);
  });

  it('returns 401 when not authenticated', async () => {
    const errorResponse = new NextResponse(
      JSON.stringify({ data: null, error: 'Unauthorised' }),
      { status: 401 },
    );
    mockAuth.mockResolvedValue(errorResponse);

    const result = await GET(new Request('http://localhost'), { params: PARAMS });

    expect(result.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// PATCH Tests
// ---------------------------------------------------------------------------

function makePatchRequest(body: unknown): Request {
  return new Request('http://localhost', {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
}

describe('PATCH /api/time-entries/[id]', () => {
  it('returns 200 with updated entry on success', async () => {
    const updated = { ...MOCK_ENTRY, hours: 3.0 };
    mockUpdate.mockResolvedValue({ data: updated, error: null });
    (apiOk as jest.Mock).mockImplementation((data: unknown) =>
      new NextResponse(JSON.stringify({ data, error: null }), { status: 200 }),
    );

    await PATCH(makePatchRequest({ hours: 3.0 }), { params: PARAMS });

    expect(apiOk).toHaveBeenCalledWith(updated);
  });

  it('returns 400 for invalid body', async () => {
    (apiError as jest.Mock).mockImplementation((msg: string, status: number) =>
      new NextResponse(JSON.stringify({ data: null, error: msg }), { status }),
    );

    const result = await PATCH(
      makePatchRequest({ hours: -1 }),
      { params: PARAMS },
    );

    expect(result.status).toBe(400);
  });

  it('returns 403 when user lacks member permission', async () => {
    const errorResponse = new NextResponse(
      JSON.stringify({ data: null, error: 'Forbidden' }),
      { status: 403 },
    );
    mockGuardMember.mockResolvedValue(errorResponse);

    const result = await PATCH(makePatchRequest({ hours: 2 }), { params: PARAMS });

    expect(result.status).toBe(403);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns 404 when entry not found', async () => {
    mockUpdate.mockResolvedValue({ data: null, error: null });
    (apiError as jest.Mock).mockImplementation((msg: string, status: number) =>
      new NextResponse(JSON.stringify({ data: null, error: msg }), { status }),
    );

    await PATCH(makePatchRequest({ hours: 2 }), { params: PARAMS });

    expect(apiError).toHaveBeenCalledWith('Time entry not found', 404);
  });
});

// ---------------------------------------------------------------------------
// DELETE Tests
// ---------------------------------------------------------------------------

describe('DELETE /api/time-entries/[id]', () => {
  it('returns 200 with id on success', async () => {
    mockGetEntry.mockResolvedValue({ data: MOCK_ENTRY, error: null });
    mockDelete.mockResolvedValue({ error: null });
    (apiOk as jest.Mock).mockImplementation((data: unknown) =>
      new NextResponse(JSON.stringify({ data, error: null }), { status: 200 }),
    );

    await DELETE(new Request('http://localhost'), { params: PARAMS });

    expect(apiOk).toHaveBeenCalledWith({ id: 'entry-1' });
  });

  it('returns 403 when user lacks admin permission', async () => {
    const errorResponse = new NextResponse(
      JSON.stringify({ data: null, error: 'Forbidden' }),
      { status: 403 },
    );
    mockGuardAdmin.mockResolvedValue(errorResponse);

    const result = await DELETE(new Request('http://localhost'), { params: PARAMS });

    expect(result.status).toBe(403);
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
