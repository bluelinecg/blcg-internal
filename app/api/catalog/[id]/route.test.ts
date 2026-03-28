/** @jest-environment node */
// Unit tests for app/api/catalog/[id]/route.ts
// All dependencies are mocked — no real DB or Clerk calls.

import { GET, PATCH, DELETE } from './route';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/db/catalog', () => ({
  getCatalogItemById: jest.fn(),
  updateCatalogItem:  jest.fn(),
  deleteCatalogItem:  jest.fn(),
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
  guardMember: jest.fn(),
  guardAdmin:  jest.fn(),
}));

jest.mock('@/lib/utils/audit', () => ({
  logAction: jest.fn(),
}));

import { getCatalogItemById, updateCatalogItem, deleteCatalogItem } from '@/lib/db/catalog';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';
import { guardMember, guardAdmin } from '@/lib/auth/roles';

const mockGetById    = getCatalogItemById as jest.Mock;
const mockUpdate     = updateCatalogItem as jest.Mock;
const mockDelete     = deleteCatalogItem as jest.Mock;
const mockAuth       = requireAuth as jest.Mock;
const mockGuardMember = guardMember as jest.Mock;
const mockGuardAdmin  = guardAdmin as jest.Mock;

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

const CTX = { params: Promise.resolve({ id: 'item-1' }) };

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: 'user-1' });
  mockGuardMember.mockResolvedValue(null);
  mockGuardAdmin.mockResolvedValue(null);
});

function makeRequest(method: string, body?: unknown): Request {
  return new Request('http://localhost/api/catalog/item-1', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ---------------------------------------------------------------------------
// GET tests
// ---------------------------------------------------------------------------

describe('GET /api/catalog/[id]', () => {
  it('returns the item when found', async () => {
    mockGetById.mockResolvedValue({ data: MOCK_ITEM, error: null });

    await GET(makeRequest('GET'), CTX);

    expect(apiOk).toHaveBeenCalledWith(MOCK_ITEM);
  });

  it('returns 404 when not found', async () => {
    mockGetById.mockResolvedValue({ data: null, error: null });

    await GET(makeRequest('GET'), CTX);

    expect(apiError).toHaveBeenCalledWith('Catalog item not found', 404);
  });

  it('returns 500 on DB failure', async () => {
    mockGetById.mockResolvedValue({ data: null, error: 'DB error' });

    await GET(makeRequest('GET'), CTX);

    expect(apiError).toHaveBeenCalledWith('DB error', 500);
  });
});

// ---------------------------------------------------------------------------
// PATCH tests
// ---------------------------------------------------------------------------

describe('PATCH /api/catalog/[id]', () => {
  it('updates the item on success', async () => {
    mockUpdate.mockResolvedValue({ data: { ...MOCK_ITEM, isActive: false }, error: null });

    await PATCH(makeRequest('PATCH', { isActive: false }), CTX);

    expect(apiOk).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
  });

  it('returns 404 when item not found', async () => {
    mockUpdate.mockResolvedValue({ data: null, error: null });

    await PATCH(makeRequest('PATCH', { isActive: false }), CTX);

    expect(apiError).toHaveBeenCalledWith('Catalog item not found', 404);
  });

  it('returns 400 on invalid body', async () => {
    await PATCH(makeRequest('PATCH', { unitPrice: -1 }), CTX);

    expect(apiError).toHaveBeenCalledWith(expect.any(String), 400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns 403 when user lacks member permission', async () => {
    mockGuardMember.mockResolvedValue(new NextResponse(null, { status: 403 }));

    const result = await PATCH(makeRequest('PATCH', { isActive: false }), CTX);

    expect(result.status).toBe(403);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// DELETE tests
// ---------------------------------------------------------------------------

describe('DELETE /api/catalog/[id]', () => {
  it('deletes the item on success', async () => {
    mockGetById.mockResolvedValue({ data: MOCK_ITEM, error: null });
    mockDelete.mockResolvedValue({ error: null });

    await DELETE(makeRequest('DELETE'), CTX);

    expect(apiOk).toHaveBeenCalledWith(null);
  });

  it('returns 404 when item not found', async () => {
    mockGetById.mockResolvedValue({ data: null, error: null });

    await DELETE(makeRequest('DELETE'), CTX);

    expect(apiError).toHaveBeenCalledWith('Catalog item not found', 404);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('returns 403 when user lacks admin permission', async () => {
    mockGuardAdmin.mockResolvedValue(new NextResponse(null, { status: 403 }));

    const result = await DELETE(makeRequest('DELETE'), CTX);

    expect(result.status).toBe(403);
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
