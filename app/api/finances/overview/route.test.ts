/** @jest-environment node */
// Unit tests for app/api/finances/overview/route.ts
// Tests GET handler — verifies auth, admin guard, date param forwarding, and error handling.
// All dependencies are mocked — no real DB, Clerk, or network calls.

import { GET } from './route';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/db/finances', () => ({
  getFinancesOverview: jest.fn(),
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
  guardAdmin: jest.fn(),
}));

import { getFinancesOverview } from '@/lib/db/finances';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';
import { guardAdmin } from '@/lib/auth/roles';

const mockGetOverview  = getFinancesOverview as jest.Mock;
const mockAuth         = requireAuth as jest.Mock;
const mockGuardAdmin   = guardAdmin as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({});
  mockGuardAdmin.mockResolvedValue(null);
});

const MOCK_OVERVIEW = {
  totalRevenue: 10000,
  totalOutstanding: 3000,
  totalExpenses: 4000,
  netPL: 6000,
  overdueCount: 1,
};

function makeGetRequest(query = ''): Request {
  return new Request(`http://localhost/api/finances/overview${query ? `?${query}` : ''}`);
}

// ---------------------------------------------------------------------------
// GET Tests
// ---------------------------------------------------------------------------

describe('GET /api/finances/overview', () => {
  it('returns 200 with overview stats on success', async () => {
    mockGetOverview.mockResolvedValue({ data: MOCK_OVERVIEW, error: null });
    mockApiOk();

    await GET(makeGetRequest());

    expect(apiOk).toHaveBeenCalledWith(MOCK_OVERVIEW);
  });

  it('calls getFinancesOverview with no params when no query string', async () => {
    mockGetOverview.mockResolvedValue({ data: MOCK_OVERVIEW, error: null });
    mockApiOk();

    await GET(makeGetRequest());

    expect(mockGetOverview).toHaveBeenCalledWith({ from: undefined, to: undefined });
  });

  it('forwards from and to date params to getFinancesOverview', async () => {
    mockGetOverview.mockResolvedValue({ data: MOCK_OVERVIEW, error: null });
    mockApiOk();

    await GET(makeGetRequest('from=2026-01-01&to=2026-03-31'));

    expect(mockGetOverview).toHaveBeenCalledWith({ from: '2026-01-01', to: '2026-03-31' });
  });

  it('forwards only from when to is absent', async () => {
    mockGetOverview.mockResolvedValue({ data: MOCK_OVERVIEW, error: null });
    mockApiOk();

    await GET(makeGetRequest('from=2026-01-01'));

    expect(mockGetOverview).toHaveBeenCalledWith({ from: '2026-01-01', to: undefined });
  });

  it('returns 500 when DB query fails', async () => {
    mockGetOverview.mockResolvedValue({ data: null, error: 'DB error' });
    mockApiError();

    await GET(makeGetRequest());

    expect(apiError).toHaveBeenCalledWith('DB error', 500);
  });

  it('returns 401 when not authenticated', async () => {
    const errorResponse = new NextResponse(
      JSON.stringify({ data: null, error: 'Unauthorized' }),
      { status: 401 },
    );
    mockAuth.mockResolvedValue(errorResponse);

    const result = await GET(makeGetRequest());

    expect(result.status).toBe(401);
    expect(mockGetOverview).not.toHaveBeenCalled();
  });

  it('returns 403 when user lacks admin permission', async () => {
    const errorResponse = new NextResponse(
      JSON.stringify({ data: null, error: 'Forbidden' }),
      { status: 403 },
    );
    mockGuardAdmin.mockResolvedValue(errorResponse);

    const result = await GET(makeGetRequest());

    expect(result.status).toBe(403);
    expect(mockGetOverview).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockApiOk() {
  (apiOk as jest.Mock).mockImplementation((data: unknown) =>
    new NextResponse(JSON.stringify({ data, error: null }), { status: 200 }),
  );
}

function mockApiError() {
  (apiError as jest.Mock).mockImplementation((msg: string, status: number) =>
    new NextResponse(JSON.stringify({ data: null, error: msg }), { status }),
  );
}
