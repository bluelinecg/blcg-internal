/** @jest-environment node */
// Unit tests for app/api/finances/summary/route.ts
// All dependencies are mocked — no real DB, Clerk, or network calls.

import { GET } from './route';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/db/finances', () => ({
  getFinanceSummary: jest.fn(),
}));

jest.mock('@/lib/api/utils', () => ({
  requireAuth: jest.fn(),
  apiError: jest.fn((msg: string, status: number) =>
    new NextResponse(JSON.stringify({ data: null, error: msg }), { status }),
  ),
}));

jest.mock('@/lib/auth/roles', () => ({
  guardAdmin: jest.fn(),
}));

import { getFinanceSummary } from '@/lib/db/finances';
import { requireAuth, apiError } from '@/lib/api/utils';
import { guardAdmin } from '@/lib/auth/roles';

const mockGetFinanceSummary = getFinanceSummary as jest.Mock;
const mockAuth              = requireAuth as jest.Mock;
const mockGuardAdmin        = guardAdmin as jest.Mock;
const mockApiError          = apiError as jest.Mock;

const MOCK_SUMMARY = {
  totalRevenue:        1500,
  totalOutstanding:    500,
  overdueCount:        1,
  overdueAmount:       200,
  totalExpenses:       550,
  netPL:               950,
  expensesByCategory:  [{ category: 'software', total: 150 }],
  recentInvoices:      [],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: 'user-1' });
  mockGuardAdmin.mockResolvedValue(null);
});

// ---------------------------------------------------------------------------
// GET /api/finances/summary
// ---------------------------------------------------------------------------

describe('GET /api/finances/summary', () => {
  it('returns summary data on success', async () => {
    mockGetFinanceSummary.mockResolvedValue({ data: MOCK_SUMMARY, error: null });

    const req = new Request('http://localhost/api/finances/summary');
    const res = await GET(req);
    const json = await res.json() as { data: typeof MOCK_SUMMARY; error: string | null };

    expect(res.status).toBe(200);
    expect(json.error).toBeNull();
    expect(json.data.totalRevenue).toBe(1500);
    expect(json.data.netPL).toBe(950);
    expect(json.data.overdueCount).toBe(1);
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(new NextResponse(null, { status: 401 }));

    const req = new Request('http://localhost/api/finances/summary');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('returns 403 when not admin', async () => {
    mockGuardAdmin.mockResolvedValue(new NextResponse(null, { status: 403 }));

    const req = new Request('http://localhost/api/finances/summary');
    const res = await GET(req);

    expect(res.status).toBe(403);
  });

  it('returns 500 when DB query fails', async () => {
    mockGetFinanceSummary.mockResolvedValue({ data: null, error: 'DB error' });
    mockApiError.mockReturnValue(
      new NextResponse(JSON.stringify({ data: null, error: 'DB error' }), { status: 500 }),
    );

    const req = new Request('http://localhost/api/finances/summary');
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});
