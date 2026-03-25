/** @jest-environment node */
// Unit tests for app/api/automations/[id]/runs/route.ts (GET run history)
// All dependencies are mocked.

import { GET } from './route';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/db/automations', () => ({
  getRunsForRule: jest.fn(),
}));

jest.mock('@/lib/api/utils', () => ({
  requireAuth: jest.fn(),
  apiError:    jest.fn((msg: string, status: number) =>
    ({ status, body: { data: null, error: msg } })),
  apiOk:       jest.fn((data: unknown, status = 200) =>
    ({ status, body: { data, error: null } })),
}));

jest.mock('@/lib/auth/roles', () => ({
  guardAdmin: jest.fn(),
}));

import { getRunsForRule } from '@/lib/db/automations';
import { requireAuth }   from '@/lib/api/utils';
import { guardAdmin }    from '@/lib/auth/roles';

const mockRuns  = getRunsForRule as jest.Mock;
const mockAuth  = requireAuth    as jest.Mock;
const mockAdmin = guardAdmin     as jest.Mock;

const PARAMS = Promise.resolve({ id: 'rule-1' });

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: 'user-1' });
  mockAdmin.mockResolvedValue(null);
});

const RUN = {
  id: 'run-1', ruleId: 'rule-1', triggerType: 'task.completed',
  entityId: 'task-1', triggerData: {}, status: 'success',
  actionsExecuted: [], executedAt: '2026-03-01T00:00:00Z',
};

describe('GET /api/automations/[id]/runs', () => {
  it('returns 200 with run history', async () => {
    mockRuns.mockResolvedValue({ data: [RUN], error: null });

    const res = await GET(new Request('http://localhost'), { params: PARAMS });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].ruleId).toBe('rule-1');
  });

  it('returns 401 when not authenticated', async () => {
    const { NextResponse } = await import('next/server');
    mockAuth.mockResolvedValue(NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 }));

    const res = await GET(new Request('http://localhost'), { params: PARAMS });

    expect(res.status).toBe(401);
  });

  it('returns 500 on DB error', async () => {
    mockRuns.mockResolvedValue({ data: null, error: 'Query failed' });

    const res = await GET(new Request('http://localhost'), { params: PARAMS });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Query failed');
  });
});
