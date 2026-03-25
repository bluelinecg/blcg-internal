// Unit tests for app/api/automations/[id]/route.ts (GET / PATCH / DELETE)
// All dependencies are mocked — no real DB or Clerk calls.

import { GET, PATCH, DELETE } from './route';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/db/automations', () => ({
  getAutomationRuleById: jest.fn(),
  updateAutomationRule:  jest.fn(),
  deleteAutomationRule:  jest.fn(),
}));

jest.mock('@/lib/api/utils', () => ({
  requireAuth: jest.fn(),
  apiError:    jest.fn((msg: string, status: number) =>
    ({ status, body: { data: null, error: msg } })),
  apiOk:       jest.fn((data: unknown, status = 200) =>
    ({ status, body: { data, error: null } })),
}));

jest.mock('@/lib/auth/roles', () => ({
  guardAdmin:  jest.fn(),
  guardMember: jest.fn(),
}));

import { getAutomationRuleById, updateAutomationRule, deleteAutomationRule } from '@/lib/db/automations';
import { requireAuth }  from '@/lib/api/utils';
import { guardAdmin, guardMember } from '@/lib/auth/roles';

const mockGet    = getAutomationRuleById as jest.Mock;
const mockUpdate = updateAutomationRule  as jest.Mock;
const mockDelete = deleteAutomationRule  as jest.Mock;
const mockAuth   = requireAuth           as jest.Mock;
const mockAdmin  = guardAdmin            as jest.Mock;
const mockMember = guardMember           as jest.Mock;

const PARAMS = Promise.resolve({ id: 'rule-1' });

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: 'user-1' });
  mockAdmin.mockResolvedValue(null);
  mockMember.mockResolvedValue(null);
});

const RULE = {
  id: 'rule-1', name: 'Test Rule', isActive: true,
  triggerType: 'task.completed', triggerConfig: {}, conditions: [],
  actions: [{ type: 'create_task', config: {} }],
  createdBy: 'user-1', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

describe('GET /api/automations/[id]', () => {
  it('returns 200 with the rule', async () => {
    mockGet.mockResolvedValue({ data: RULE, error: null });

    const res = await GET(new Request('http://localhost'), { params: PARAMS });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('rule-1');
  });

  it('returns 404 when rule does not exist', async () => {
    mockGet.mockResolvedValue({ data: null, error: null });

    const res = await GET(new Request('http://localhost'), { params: PARAMS });

    expect(res.status).toBe(404);
  });

  it('returns 500 on DB error', async () => {
    mockGet.mockResolvedValue({ data: null, error: 'DB error' });

    const res = await GET(new Request('http://localhost'), { params: PARAMS });

    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// PATCH
// ---------------------------------------------------------------------------

describe('PATCH /api/automations/[id]', () => {
  it('returns 200 with updated rule', async () => {
    mockUpdate.mockResolvedValue({ data: { ...RULE, name: 'Renamed' }, error: null });

    const req = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Renamed' }),
    });

    const res = await PATCH(req, { params: PARAMS });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Renamed');
  });

  it('returns 400 on validation failure', async () => {
    const req = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ name: 123 }), // invalid type
    });

    const res = await PATCH(req, { params: PARAMS });

    expect(res.status).toBe(400);
  });

  it('returns 404 when rule not found', async () => {
    mockUpdate.mockResolvedValue({ data: null, error: null });

    const req = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ isActive: false }),
    });

    const res = await PATCH(req, { params: PARAMS });

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

describe('DELETE /api/automations/[id]', () => {
  it('returns 200 with the deleted id', async () => {
    mockDelete.mockResolvedValue({ error: null });

    const res = await DELETE(new Request('http://localhost'), { params: PARAMS });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('rule-1');
  });

  it('returns 500 on DB error', async () => {
    mockDelete.mockResolvedValue({ error: 'Delete failed' });

    const res = await DELETE(new Request('http://localhost'), { params: PARAMS });

    expect(res.status).toBe(500);
  });
});
