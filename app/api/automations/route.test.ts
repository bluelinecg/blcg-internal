// Unit tests for app/api/automations/route.ts (GET list / POST create)
// All dependencies are mocked — no real DB, Clerk, or network calls.

import { GET, POST } from './route';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/db/automations', () => ({
  listAutomationRules:  jest.fn(),
  createAutomationRule: jest.fn(),
}));

jest.mock('@/lib/api/utils', () => ({
  requireAuth: jest.fn(),
  apiError:    jest.fn((msg: string, status: number) =>
    ({ status, body: { data: null, error: msg } })),
  apiOk:       jest.fn((data: unknown, status = 200) =>
    ({ status, body: { data, error: null } })),
}));

jest.mock('@/lib/auth/roles', () => ({
  guardMember: jest.fn(),
}));

jest.mock('@clerk/nextjs/server', () => ({
  currentUser: jest.fn(),
}));

import { listAutomationRules, createAutomationRule } from '@/lib/db/automations';
import { requireAuth }                               from '@/lib/api/utils';
import { guardMember }                               from '@/lib/auth/roles';
import { currentUser }                               from '@clerk/nextjs/server';

const mockList   = listAutomationRules  as jest.Mock;
const mockCreate = createAutomationRule as jest.Mock;
const mockAuth   = requireAuth          as jest.Mock;
const mockGuard  = guardMember          as jest.Mock;
const mockUser   = currentUser          as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: 'user-1' });
  mockGuard.mockResolvedValue(null);
  mockUser.mockResolvedValue({ id: 'user-1' });
});

const RULE = {
  id: 'rule-1', name: 'Test Rule', isActive: true,
  triggerType: 'task.completed', triggerConfig: {}, conditions: [],
  actions: [{ type: 'create_task', config: { title: 'Follow up' } }],
  createdBy: 'user-1', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

describe('GET /api/automations', () => {
  it('returns 200 with rules list', async () => {
    mockList.mockResolvedValue({ data: [RULE], error: null });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('returns 401 when not authenticated', async () => {
    const { NextResponse } = await import('next/server');
    mockAuth.mockResolvedValue(NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 }));

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('returns 500 on DB error', async () => {
    mockList.mockResolvedValue({ data: null, error: 'DB down' });

    const res = await GET();

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('DB down');
  });
});

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

function makePostRequest(body: unknown): Request {
  return new Request('http://localhost/api/automations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/automations', () => {
  it('returns 201 with created rule', async () => {
    mockCreate.mockResolvedValue({ data: RULE, error: null });

    const req = makePostRequest({
      name:        'Test Rule',
      isActive:    true,
      triggerType: 'task.completed',
      conditions:  [],
      actions:     [{ type: 'create_task', config: { title: 'Follow up' } }],
    });

    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe('rule-1');
  });

  it('returns 400 on invalid body', async () => {
    const req = makePostRequest({ name: '' }); // missing required fields

    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('returns 500 on DB error', async () => {
    mockCreate.mockResolvedValue({ data: null, error: 'Insert failed' });

    const req = makePostRequest({
      name:        'Test Rule',
      isActive:    true,
      triggerType: 'task.completed',
      actions:     [{ type: 'create_task', config: {} }],
    });

    const res = await POST(req);

    expect(res.status).toBe(500);
  });
});
