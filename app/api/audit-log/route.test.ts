/** @jest-environment node */
// Unit tests for app/api/audit-log/route.ts
// Tests GET handler — verifies Zod query param validation and auth gating.
// All dependencies are mocked — no real DB, Clerk, or network calls.

import { GET } from './route';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/db/audit-log', () => ({
  listLogs:          jest.fn(),
  listLogsForEntity: jest.fn(),
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

jest.mock('@/lib/utils/parse-list-params', () => ({
  parseListParams: jest.fn(() => ({ page: 1, pageSize: 25 })),
}));

import { listLogs, listLogsForEntity } from '@/lib/db/audit-log';
import { requireAuth, apiError } from '@/lib/api/utils';
import { guardAdmin } from '@/lib/auth/roles';

const mockListLogs          = listLogs as jest.Mock;
const mockListLogsForEntity = listLogsForEntity as jest.Mock;
const mockAuth              = requireAuth as jest.Mock;
const mockGuardAdmin        = guardAdmin as jest.Mock;

const ENTITY_ID = '550e8400-e29b-41d4-a716-446655440000';

function makeGetRequest(params: Record<string, string> = {}): Request {
  const url = new URL('http://localhost/api/audit-log');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString());
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: 'user-1' });
  mockGuardAdmin.mockResolvedValue(null);
  (apiError as jest.Mock).mockImplementation((msg: string, status: number) =>
    new NextResponse(JSON.stringify({ data: null, error: msg }), { status }),
  );
});

// ---------------------------------------------------------------------------
// Entity-scoped requests
// ---------------------------------------------------------------------------

describe('GET /api/audit-log — entity-scoped', () => {
  it('returns logs when entityType and entityId are valid', async () => {
    const mockData = [{ id: 'log-1', entityType: 'client', entityId: ENTITY_ID }];
    mockListLogsForEntity.mockResolvedValue({ data: mockData, total: 1, error: null });

    const res = await GET(makeGetRequest({ entityType: 'client', entityId: ENTITY_ID }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual(mockData);
    expect(mockListLogsForEntity).toHaveBeenCalledWith('client', ENTITY_ID, expect.any(Object));
    expect(mockGuardAdmin).not.toHaveBeenCalled();
  });

  it('returns 400 when entityType is invalid', async () => {
    await GET(makeGetRequest({ entityType: 'invalid_type', entityId: ENTITY_ID }));
    expect(apiError).toHaveBeenCalledWith(expect.any(String), 400);
    expect(mockListLogsForEntity).not.toHaveBeenCalled();
  });

  it('returns 400 when entityId is not a valid UUID', async () => {
    await GET(makeGetRequest({ entityType: 'client', entityId: 'not-a-uuid' }));
    expect(apiError).toHaveBeenCalledWith('entityId must be a valid UUID', 400);
    expect(mockListLogsForEntity).not.toHaveBeenCalled();
  });

  it('returns 400 when only entityType is provided without entityId', async () => {
    await GET(makeGetRequest({ entityType: 'client' }));
    expect(apiError).toHaveBeenCalledWith(expect.any(String), 400);
    expect(mockListLogsForEntity).not.toHaveBeenCalled();
  });

  it('returns 400 when only entityId is provided without entityType', async () => {
    await GET(makeGetRequest({ entityId: ENTITY_ID }));
    expect(apiError).toHaveBeenCalledWith(expect.any(String), 400);
    expect(mockListLogsForEntity).not.toHaveBeenCalled();
  });

  it('accepts all valid AuditEntityType values', async () => {
    mockListLogsForEntity.mockResolvedValue({ data: [], total: 0, error: null });

    const validTypes = [
      'client', 'contact', 'organization', 'proposal', 'project',
      'task', 'invoice', 'expense', 'pipeline_item', 'catalog_item', 'time_entry',
    ];

    for (const entityType of validTypes) {
      jest.clearAllMocks();
      mockAuth.mockResolvedValue({ userId: 'user-1' });
      (apiError as jest.Mock).mockImplementation((msg: string, status: number) =>
        new NextResponse(JSON.stringify({ data: null, error: msg }), { status }),
      );
      mockListLogsForEntity.mockResolvedValue({ data: [], total: 0, error: null });

      await GET(makeGetRequest({ entityType, entityId: ENTITY_ID }));
      expect(mockListLogsForEntity).toHaveBeenCalledWith(entityType, ENTITY_ID, expect.any(Object));
    }
  });

  it('returns 500 when DB query fails', async () => {
    mockListLogsForEntity.mockResolvedValue({ data: null, total: null, error: 'DB error' });

    await GET(makeGetRequest({ entityType: 'client', entityId: ENTITY_ID }));

    expect(apiError).toHaveBeenCalledWith('DB error', 500);
  });
});

// ---------------------------------------------------------------------------
// Global log requests
// ---------------------------------------------------------------------------

describe('GET /api/audit-log — global log', () => {
  it('returns global logs for admin with no params', async () => {
    const mockData = [{ id: 'log-1' }];
    mockListLogs.mockResolvedValue({ data: mockData, total: 1, error: null });

    const res = await GET(makeGetRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual(mockData);
    expect(mockGuardAdmin).toHaveBeenCalled();
    expect(mockListLogs).toHaveBeenCalled();
  });

  it('returns 403 when non-admin requests global log', async () => {
    const forbidden = new NextResponse(
      JSON.stringify({ data: null, error: 'Forbidden' }),
      { status: 403 },
    );
    mockGuardAdmin.mockResolvedValue(forbidden);

    const result = await GET(makeGetRequest());

    expect(result.status).toBe(403);
    expect(mockListLogs).not.toHaveBeenCalled();
  });

  it('returns 500 when global DB query fails', async () => {
    mockListLogs.mockResolvedValue({ data: null, total: null, error: 'DB error' });

    await GET(makeGetRequest());

    expect(apiError).toHaveBeenCalledWith('DB error', 500);
  });
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

describe('GET /api/audit-log — auth', () => {
  it('returns 401 when not authenticated', async () => {
    const unauth = new NextResponse(
      JSON.stringify({ data: null, error: 'Unauthorised' }),
      { status: 401 },
    );
    mockAuth.mockResolvedValue(unauth);

    const result = await GET(makeGetRequest());

    expect(result.status).toBe(401);
    expect(mockListLogs).not.toHaveBeenCalled();
  });
});
