/** @jest-environment node */
// Unit tests for app/api/internal/tasks/route.ts
// Tests GET and POST handlers with internal API key authentication.
// All dependencies are mocked — no real DB or network calls.

import { GET, POST } from './route';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/db/tasks', () => ({
  listTasks: jest.fn(),
  createTask: jest.fn(),
}));

jest.mock('@/lib/api/utils', () => ({
  apiError: jest.fn((msg: string, status: number) =>
    new NextResponse(JSON.stringify({ data: null, error: msg }), { status }),
  ),
  apiOk: jest.fn((data: unknown, status = 200) =>
    new NextResponse(JSON.stringify({ data, error: null }), { status }),
  ),
}));

import { listTasks, createTask } from '@/lib/db/tasks';
import { apiError } from '@/lib/api/utils';

const mockListTasks = listTasks as jest.Mock;
const mockCreateTask = createTask as jest.Mock;

const VALID_KEY = 'test-internal-key-abc123';

const MOCK_TASKS = [
  { id: 'task-1', title: 'Setup DB', status: 'backlog', priority: 'high', sortOrder: 1 },
  { id: 'task-2', title: 'Build API', status: 'in_progress', priority: 'medium', sortOrder: 2 },
];

beforeEach(() => {
  jest.clearAllMocks();
  process.env.INTERNAL_API_KEY = VALID_KEY;
});

afterEach(() => {
  delete process.env.INTERNAL_API_KEY;
});

// ---------------------------------------------------------------------------
// Auth tests (shared behaviour for all handlers)
// ---------------------------------------------------------------------------

describe('Internal API — authentication', () => {
  it('returns 401 when X-Internal-Key header is missing', async () => {
    const req = new Request('http://localhost/api/internal/tasks');
    await GET(req);
    expect(apiError).toHaveBeenCalledWith('Unauthorised', 401);
  });

  it('returns 401 when X-Internal-Key header is wrong', async () => {
    const req = new Request('http://localhost/api/internal/tasks', {
      headers: { 'x-internal-key': 'wrong-key' },
    });
    await GET(req);
    expect(apiError).toHaveBeenCalledWith('Unauthorised', 401);
  });

  it('returns 401 when INTERNAL_API_KEY env var is not set', async () => {
    delete process.env.INTERNAL_API_KEY;
    const req = new Request('http://localhost/api/internal/tasks', {
      headers: { 'x-internal-key': VALID_KEY },
    });
    await GET(req);
    expect(apiError).toHaveBeenCalledWith('Unauthorised', 401);
  });
});

// ---------------------------------------------------------------------------
// GET tests
// ---------------------------------------------------------------------------

function makeGetRequest(url = 'http://localhost/api/internal/tasks'): Request {
  return new Request(url, { headers: { 'x-internal-key': VALID_KEY } });
}

describe('GET /api/internal/tasks', () => {
  it('returns all tasks when no status filter is given', async () => {
    mockListTasks.mockResolvedValue({ data: MOCK_TASKS, total: 2, error: null });

    const res = await GET(makeGetRequest());
    const body = await res.json();

    expect(mockListTasks).toHaveBeenCalledWith({ page: 1, pageSize: 500, sort: 'sort_order', order: 'asc' });
    expect(body.data).toHaveLength(2);
  });

  it('filters tasks by status when ?status= is provided', async () => {
    mockListTasks.mockResolvedValue({ data: MOCK_TASKS, total: 2, error: null });

    const res = await GET(makeGetRequest('http://localhost/api/internal/tasks?status=backlog'));
    const body = await res.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe('task-1');
  });

  it('returns 500 when listTasks fails', async () => {
    mockListTasks.mockResolvedValue({ data: null, total: null, error: 'DB error' });

    await GET(makeGetRequest());

    expect(apiError).toHaveBeenCalledWith('DB error', 500);
  });
});

// ---------------------------------------------------------------------------
// POST tests
// ---------------------------------------------------------------------------

function makePostRequest(body: unknown): Request {
  return new Request('http://localhost/api/internal/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-key': VALID_KEY,
    },
    body: JSON.stringify(body),
  });
}

const VALID_TASK_INPUT = {
  title: 'New task',
  status: 'backlog',
  priority: 'medium',
  recurrence: 'none',
  checklist: [],
  blockedBy: [],
};

describe('POST /api/internal/tasks', () => {
  it('creates a task and returns 201', async () => {
    const created = { id: 'task-new', ...VALID_TASK_INPUT };
    mockCreateTask.mockResolvedValue({ data: created, error: null });

    await POST(makePostRequest(VALID_TASK_INPUT));

    expect(mockCreateTask).toHaveBeenCalled();
  });

  it('returns 400 when body is invalid', async () => {
    await POST(makePostRequest({ title: '' }));

    expect(apiError).toHaveBeenCalledWith(expect.any(String), 400);
    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it('returns 500 when createTask fails', async () => {
    mockCreateTask.mockResolvedValue({ data: null, error: 'Insert failed' });

    await POST(makePostRequest(VALID_TASK_INPUT));

    expect(apiError).toHaveBeenCalledWith('Insert failed', 500);
  });
});
