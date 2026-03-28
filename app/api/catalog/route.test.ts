/** @jest-environment node */
// Unit tests for app/api/catalog/route.ts
// All dependencies are mocked — no real DB or Clerk calls.

import { GET, POST } from './route';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/db/catalog', () => ({
  listCatalogItems: jest.fn(),
  createCatalogItem: jest.fn(),
}));

jest.mock('@/lib/api/utils', () => ({
  requireAuth: jest.fn(),
  apiError: jest.fn((msg: string, status: number) =>
    new NextResponse(JSON.stringify({ data: null, error: msg }), { status }),
  ),
  apiOk: jest.fn((data: unknown, status?: number) =>
    new NextResponse(JSON.stringify({ data, error: null }), { status: status ?? 200 }),
  ),
}));

jest.mock('@/lib/auth/roles', () => ({
  guardMember: jest.fn(),
}));

jest.mock('@/lib/utils/audit', () => ({
  logAction: jest.fn(),
}));

jest.mock('@/lib/utils/parse-list-params', () => ({
  parseListParams: jest.fn(() => ({})),
}));

import { listCatalogItems, createCatalogItem } from '@/lib/db/catalog';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';
import { guardMember } from '@/lib/auth/roles';

const mockListCatalogItems  = listCatalogItems as jest.Mock;
const mockCreateCatalogItem = createCatalogItem as jest.Mock;
const mockAuth              = requireAuth as jest.Mock;
const mockGuardMember       = guardMember as jest.Mock;

const MOCK_ITEM = {
  id:          'item-1',
  name:        'Website Audit',
  description: 'Full audit',
  unitPrice:   500,
  category:    'Consulting',
  isActive:    true,
  createdAt:   '2026-01-01T00:00:00Z',
  updatedAt:   '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: 'user-1' });
  mockGuardMember.mockResolvedValue(null);
});

function makeRequest(method: string, url = 'http://localhost/api/catalog', body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ---------------------------------------------------------------------------
// GET tests
// ---------------------------------------------------------------------------

describe('GET /api/catalog', () => {
  it('returns catalog items on success', async () => {
    mockListCatalogItems.mockResolvedValue({ data: [MOCK_ITEM], total: 1, error: null });

    await GET(makeRequest('GET'));

    expect(mockListCatalogItems).toHaveBeenCalled();
  });

  it('returns 500 on DB failure', async () => {
    mockListCatalogItems.mockResolvedValue({ data: null, total: null, error: 'DB error' });

    await GET(makeRequest('GET'));

    expect(apiError).toHaveBeenCalledWith('DB error', 500);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(new NextResponse(null, { status: 401 }));

    await GET(makeRequest('GET'));

    expect(mockListCatalogItems).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// POST tests
// ---------------------------------------------------------------------------

describe('POST /api/catalog', () => {
  const VALID_BODY = { name: 'Website Audit', unitPrice: 500, isActive: true };

  it('creates an item and returns 201 on success', async () => {
    mockCreateCatalogItem.mockResolvedValue({ data: MOCK_ITEM, error: null });
    (apiOk as jest.Mock).mockImplementation((data: unknown, status?: number) =>
      new NextResponse(JSON.stringify({ data, error: null }), { status: status ?? 200 }),
    );

    await POST(makeRequest('POST', undefined, VALID_BODY));

    expect(apiOk).toHaveBeenCalledWith(MOCK_ITEM, 201);
  });

  it('returns 400 on invalid request body', async () => {
    (apiError as jest.Mock).mockImplementation((msg: string, status: number) =>
      new NextResponse(JSON.stringify({ data: null, error: msg }), { status }),
    );

    await POST(makeRequest('POST', undefined, { name: '' }));

    expect(apiError).toHaveBeenCalledWith(expect.any(String), 400);
    expect(mockCreateCatalogItem).not.toHaveBeenCalled();
  });

  it('returns 500 when DB insert fails', async () => {
    mockCreateCatalogItem.mockResolvedValue({ data: null, error: 'Insert failed' });
    (apiError as jest.Mock).mockImplementation((msg: string, status: number) =>
      new NextResponse(JSON.stringify({ data: null, error: msg }), { status }),
    );

    await POST(makeRequest('POST', undefined, VALID_BODY));

    expect(apiError).toHaveBeenCalledWith('Insert failed', 500);
  });

  it('returns 403 when user lacks member permission', async () => {
    mockGuardMember.mockResolvedValue(new NextResponse(null, { status: 403 }));

    const result = await POST(makeRequest('POST', undefined, VALID_BODY));

    expect(result.status).toBe(403);
    expect(mockCreateCatalogItem).not.toHaveBeenCalled();
  });
});
