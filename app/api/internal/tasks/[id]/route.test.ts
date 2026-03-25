/** @jest-environment node */
// Unit tests for app/api/internal/tasks/[id]/route.ts
// Tests GET, PATCH, DELETE handlers with internal API key authentication.
// All dependencies are mocked — no real DB or network calls.

import { GET, PATCH, DELETE } from './route';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/db/tasks', () => ({
  getTaskById: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
}));

jest.mock('@/lib/api/utils', () => ({
  apiError: jest.fn((msg: string, status: number) =>
    new NextResponse(JSON.stringify({ data: null, error: msg }), { status }),
  ),
  apiOk: jest.fn((data: unknown) =>
    new NextResponse(JSON.stringify({ data, error: null }), { status: 200 }),
  ),
}));

import { getTaskById, updateTask, deleteTask } from '@/lib/db/tasks';
import { apiError, apiOk } from '@/lib/api/utils';

const mockGetTask = getTaskById as jest.Mock;
const mockUpdateTask = updateTask as jest.Mock;
const mockDeleteTask = deleteTask as jest.Mock;

const VALID_KEY = 'test-internal-key-abc123';
const PARAMS = Promise.resolve({ id: 'task-1' });

const MOCK_TASK = {
  id: 'task-1',
  title: 'Build auth page',
  status: 'backlog',
  priority: 'high',
  sortOrder: 5,
  recurrence: 'none',
  checklist: [],
  blockedBy: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.INTERNAL_API_KEY = VALID_KEY;
});

afterEach(() => {
  delete process.env.INTERNAL_API_KEY;
});

function withKey(init: RequestInit = {}): RequestInit {
  return {
    ...init,
    headers: { ...(init.headers as Record<string, string>), 'x-internal-key': VALID_KEY },
  };
}

// ---------------------------------------------------------------------------
// GET tests
// ---------------------------------------------------------------------------

describe('GET /api/internal/tasks/[id]', () => {
  it('returns the task on success', async () => {
    mockGetTask.mockResolvedValue({ data: MOCK_TASK, error: null });

    await GET(new Request('http://localhost', withKey()), { params: PARAMS });

    expect(apiOk).toHaveBeenCalledWith(MOCK_TASK);
  });

  it('returns 404 when task does not exist', async () => {
    mockGetTask.mockResolvedValue({ data: null, error: null });

    await GET(new Request('http://localhost', withKey()), { params: PARAMS });

    expect(apiError).toHaveBeenCalledWith('Task not found', 404);
  });

  it('returns 401 with missing key', async () => {
    await GET(new Request('http://localhost'), { params: PARAMS });
    expect(apiError).toHaveBeenCalledWith('Unauthorised', 401);
  });
});

// ---------------------------------------------------------------------------
// PATCH tests
// ---------------------------------------------------------------------------

function makePatchRequest(body: unknown): Request {
  return new Request('http://localhost', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-internal-key': VALID_KEY },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/internal/tasks/[id]', () => {
  it('updates the task and returns it', async () => {
    const updated = { ...MOCK_TASK, status: 'in_progress' };
    mockUpdateTask.mockResolvedValue({ data: updated, error: null });

    await PATCH(makePatchRequest({ status: 'in_progress' }), { params: PARAMS });

    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', expect.objectContaining({ status: 'in_progress' }));
    expect(apiOk).toHaveBeenCalledWith(updated);
  });

  it('updates sortOrder correctly', async () => {
    const updated = { ...MOCK_TASK, sortOrder: 10 };
    mockUpdateTask.mockResolvedValue({ data: updated, error: null });

    await PATCH(makePatchRequest({ sortOrder: 10 }), { params: PARAMS });

    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', expect.objectContaining({ sortOrder: 10 }));
  });

  it('returns 404 when task does not exist', async () => {
    mockUpdateTask.mockResolvedValue({ data: null, error: null });

    await PATCH(makePatchRequest({ status: 'done' }), { params: PARAMS });

    expect(apiError).toHaveBeenCalledWith('Task not found', 404);
  });

  it('returns 400 on invalid body', async () => {
    await PATCH(makePatchRequest({ status: 'not-a-real-status' }), { params: PARAMS });

    expect(apiError).toHaveBeenCalledWith(expect.any(String), 400);
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  it('returns 401 with missing key', async () => {
    const req = new Request('http://localhost', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    });
    await PATCH(req, { params: PARAMS });
    expect(apiError).toHaveBeenCalledWith('Unauthorised', 401);
  });
});

// ---------------------------------------------------------------------------
// DELETE tests
// ---------------------------------------------------------------------------

describe('DELETE /api/internal/tasks/[id]', () => {
  it('deletes the task and returns its id', async () => {
    mockDeleteTask.mockResolvedValue({ error: null });

    await DELETE(new Request('http://localhost', withKey({ method: 'DELETE' })), { params: PARAMS });

    expect(mockDeleteTask).toHaveBeenCalledWith('task-1');
    expect(apiOk).toHaveBeenCalledWith({ id: 'task-1' });
  });

  it('returns 500 when deleteTask fails', async () => {
    mockDeleteTask.mockResolvedValue({ error: 'Delete failed' });

    await DELETE(new Request('http://localhost', withKey({ method: 'DELETE' })), { params: PARAMS });

    expect(apiError).toHaveBeenCalledWith('Delete failed', 500);
  });

  it('returns 401 with missing key', async () => {
    await DELETE(new Request('http://localhost'), { params: PARAMS });
    expect(apiError).toHaveBeenCalledWith('Unauthorised', 401);
  });
});
