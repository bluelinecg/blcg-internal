/** @jest-environment node */
// Unit tests for app/api/webhooks/endpoints/[id]/route.ts (GET / PATCH / DELETE)
// All dependencies are mocked — no real DB or Clerk calls.

import { GET, PATCH, DELETE } from './route';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/db/webhooks', () => ({
  getWebhookEndpoint:    jest.fn(),
  updateWebhookEndpoint: jest.fn(),
  deleteWebhookEndpoint: jest.fn(),
}));

jest.mock('@/lib/api/utils', () => ({
  apiError: jest.fn((msg: string, status: number) =>
    ({ status, body: { data: null, error: msg } })),
  apiOk: jest.fn((data: unknown, status = 200) =>
    ({ status, body: { data, error: null } })),
}));

jest.mock('@/lib/auth/roles', () => ({
  guardAdmin: jest.fn(),
}));

import { getWebhookEndpoint, updateWebhookEndpoint, deleteWebhookEndpoint } from '@/lib/db/webhooks';
import { guardAdmin } from '@/lib/auth/roles';

const mockGet    = getWebhookEndpoint    as jest.Mock;
const mockUpdate = updateWebhookEndpoint as jest.Mock;
const mockDelete = deleteWebhookEndpoint as jest.Mock;
const mockAdmin  = guardAdmin            as jest.Mock;

const PARAMS = Promise.resolve({ id: 'ep-1' });

const ENDPOINT = {
  id:          'ep-1',
  url:         'https://example.com/webhook',
  description: 'Test endpoint',
  secret:      'abc123',
  events:      ['contact.created'],
  isActive:    true,
  createdAt:   '2026-01-01T00:00:00Z',
  updatedAt:   '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAdmin.mockResolvedValue(null);
});

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

describe('GET /api/webhooks/endpoints/[id]', () => {
  it('returns 200 with the endpoint', async () => {
    mockGet.mockResolvedValue({ data: ENDPOINT, error: null });

    const res = await GET(new Request('http://localhost'), { params: PARAMS });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('ep-1');
  });

  it('returns 404 when endpoint does not exist', async () => {
    mockGet.mockResolvedValue({ data: null, error: null });

    const res = await GET(new Request('http://localhost'), { params: PARAMS });

    expect(res.status).toBe(404);
  });

  it('returns 500 on DB error', async () => {
    mockGet.mockResolvedValue({ data: null, error: 'DB error' });

    const res = await GET(new Request('http://localhost'), { params: PARAMS });

    expect(res.status).toBe(500);
  });

  it('returns guard response when not admin', async () => {
    const guardRes = { status: 403 };
    mockAdmin.mockResolvedValue(guardRes);

    const res = await GET(new Request('http://localhost'), { params: PARAMS });

    expect(res).toBe(guardRes);
    expect(mockGet).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// PATCH
// ---------------------------------------------------------------------------

describe('PATCH /api/webhooks/endpoints/[id]', () => {
  it('returns 200 with updated endpoint', async () => {
    mockUpdate.mockResolvedValue({ data: { ...ENDPOINT, isActive: false }, error: null });

    const req = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ isActive: false }),
    });

    const res = await PATCH(req, { params: PARAMS });

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });

  it('returns 400 on empty body (no fields)', async () => {
    const req = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({}),
    });

    const res = await PATCH(req, { params: PARAMS });

    expect(res.status).toBe(400);
  });

  it('returns 400 on invalid url', async () => {
    const req = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ url: 'not-a-url' }),
    });

    const res = await PATCH(req, { params: PARAMS });

    expect(res.status).toBe(400);
  });

  it('returns 404 when endpoint not found', async () => {
    mockUpdate.mockResolvedValue({ data: null, error: null });

    const req = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ isActive: true }),
    });

    const res = await PATCH(req, { params: PARAMS });

    expect(res.status).toBe(404);
  });

  it('returns 500 on DB error', async () => {
    mockUpdate.mockResolvedValue({ data: null, error: 'update failed' });

    const req = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ isActive: false }),
    });

    const res = await PATCH(req, { params: PARAMS });

    expect(res.status).toBe(500);
  });

  it('returns guard response when not admin', async () => {
    const guardRes = { status: 403 };
    mockAdmin.mockResolvedValue(guardRes);

    const req = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ isActive: false }),
    });

    const res = await PATCH(req, { params: PARAMS });

    expect(res).toBe(guardRes);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

describe('DELETE /api/webhooks/endpoints/[id]', () => {
  it('returns 200 on success', async () => {
    mockDelete.mockResolvedValue({ error: null });

    const res = await DELETE(new Request('http://localhost'), { params: PARAMS });

    expect(res.status).toBe(200);
  });

  it('returns 500 on DB error', async () => {
    mockDelete.mockResolvedValue({ error: 'delete failed' });

    const res = await DELETE(new Request('http://localhost'), { params: PARAMS });

    expect(res.status).toBe(500);
  });

  it('returns guard response when not admin', async () => {
    const guardRes = { status: 403 };
    mockAdmin.mockResolvedValue(guardRes);

    const res = await DELETE(new Request('http://localhost'), { params: PARAMS });

    expect(res).toBe(guardRes);
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
