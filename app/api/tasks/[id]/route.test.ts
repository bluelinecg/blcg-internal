/** @jest-environment node */
// Unit tests for app/api/tasks/[id]/route.ts
// Tests GET, PATCH, DELETE handlers with automation engine and webhook dispatch.
// All dependencies are mocked — no real DB, Clerk, or network calls.

import { GET, PATCH, DELETE } from './route';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/db/tasks', () => ({
  getTaskById: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
  createNextRecurrence: jest.fn(),
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
  guardAdmin: jest.fn(),
  guardMember: jest.fn(),
}));

jest.mock('@/lib/utils/webhook-delivery', () => ({
  dispatchWebhookEvent: jest.fn(),
}));

jest.mock('@/lib/automations/engine', () => ({
  runAutomations: jest.fn(),
}));

jest.mock('@/lib/utils/audit', () => ({
  logAction: jest.fn(),
}));

import { getTaskById, updateTask, deleteTask, createNextRecurrence } from '@/lib/db/tasks';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';
import { guardAdmin, guardMember } from '@/lib/auth/roles';
import { dispatchWebhookEvent } from '@/lib/utils/webhook-delivery';
import { runAutomations } from '@/lib/automations/engine';
import { logAction } from '@/lib/utils/audit';

const mockGetTask = getTaskById as jest.Mock;
const mockUpdateTask = updateTask as jest.Mock;
const mockDeleteTask = deleteTask as jest.Mock;
const mockCreateNextRecurrence = createNextRecurrence as jest.Mock;
const mockAuth = requireAuth as jest.Mock;
const mockGuardAdmin = guardAdmin as jest.Mock;
const mockGuardMember = guardMember as jest.Mock;
const mockDispatchWebhook = dispatchWebhookEvent as jest.Mock;
const mockRunAutomations = runAutomations as jest.Mock;
const mockLogAction = logAction as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({});
  mockGuardAdmin.mockResolvedValue(null);
  mockGuardMember.mockResolvedValue(null);
});

const MOCK_TASK = {
  id: 'task-1',
  title: 'Build auth page',
  description: 'Implement Clerk login',
  status: 'in_progress',
  dueDate: '2026-02-01T00:00:00Z',
  recurrence: 'weekly',
  priority: 'high',
  assignedTo: 'user-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const PARAMS = Promise.resolve({ id: 'task-1' });

// ---------------------------------------------------------------------------
// GET Tests
// ---------------------------------------------------------------------------

describe('GET /api/tasks/[id]', () => {
  it('returns 200 with task data on success', async () => {
    mockGetTask.mockResolvedValue({ data: MOCK_TASK, error: null });
    mockApiOk();

    await GET(new Request('http://localhost'), { params: PARAMS });

    expect(apiOk).toHaveBeenCalledWith(MOCK_TASK);
  });

  it('returns 404 when task not found', async () => {
    mockGetTask.mockResolvedValue({ data: null, error: null });
    mockApiError();

    await GET(new Request('http://localhost'), { params: PARAMS });

    expect(apiError).toHaveBeenCalledWith('Task not found', 404);
  });
});

// ---------------------------------------------------------------------------
// PATCH Tests
// ---------------------------------------------------------------------------

function makePatchRequest(body: unknown): Request {
  return new Request('http://localhost', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/tasks/[id] — status change to done', () => {
  it('dispatches both task.status_changed and task.completed automations', async () => {
    const taskBeforeDone = { ...MOCK_TASK, status: 'in_progress' };
    const taskAfterDone = { ...MOCK_TASK, status: 'done' };

    mockGetTask.mockResolvedValue({ data: taskBeforeDone, error: null });
    mockUpdateTask.mockResolvedValue({ data: taskAfterDone, error: null });
    mockApiOk();

    const req = makePatchRequest({ status: 'done' });
    await PATCH(req, { params: PARAMS });

    // Verify webhook dispatch
    expect(mockDispatchWebhook).toHaveBeenCalledWith(
      'task.status_changed',
      expect.objectContaining({ status: 'done', title: 'Build auth page' }),
    );

    // Verify both automation triggers
    expect(mockRunAutomations).toHaveBeenCalledTimes(2);
    expect(mockRunAutomations).toHaveBeenNthCalledWith(
      1,
      'task.status_changed',
      expect.objectContaining({ status: 'done' }),
    );
    expect(mockRunAutomations).toHaveBeenNthCalledWith(
      2,
      'task.completed',
      expect.objectContaining({ status: 'done' }),
    );

    // Verify audit log
    expect(mockLogAction).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'task',
        entityId: 'task-1',
        action: 'status_changed',
        metadata: { to: 'done' },
      }),
    );

    // Verify recurrence created
    expect(mockCreateNextRecurrence).toHaveBeenCalledWith(taskAfterDone);
  });

  it('dispatches task.status_changed but not task.completed when status changes to non-done', async () => {
    const taskUpdated = { ...MOCK_TASK, status: 'in_review' };

    mockGetTask.mockResolvedValue({ data: MOCK_TASK, error: null });
    mockUpdateTask.mockResolvedValue({ data: taskUpdated, error: null });
    mockApiOk();

    const req = makePatchRequest({ status: 'in_review' });
    await PATCH(req, { params: PARAMS });

    expect(mockDispatchWebhook).toHaveBeenCalledWith(
      'task.status_changed',
      expect.objectContaining({ status: 'in_review' }),
    );

    // Only task.status_changed should be called, NOT task.completed
    expect(mockRunAutomations).toHaveBeenCalledTimes(1);
    expect(mockRunAutomations).toHaveBeenCalledWith(
      'task.status_changed',
      expect.any(Object),
    );

    expect(mockCreateNextRecurrence).not.toHaveBeenCalled();
  });

  it('does not dispatch automations when status does not change', async () => {
    mockGetTask.mockResolvedValue({ data: MOCK_TASK, error: null });
    mockUpdateTask.mockResolvedValue({ data: MOCK_TASK, error: null });
    mockApiOk();

    const req = makePatchRequest({ title: 'Updated Title' }); // No status change
    await PATCH(req, { params: PARAMS });

    expect(mockDispatchWebhook).not.toHaveBeenCalled();
    expect(mockRunAutomations).not.toHaveBeenCalled();
    expect(mockLogAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'updated' }),
    );
  });

  it('does not create recurrence when status is done but recurrence is none', async () => {
    const taskNonRecurring = { ...MOCK_TASK, recurrence: 'none', status: 'done' };

    mockGetTask.mockResolvedValue({ data: MOCK_TASK, error: null });
    mockUpdateTask.mockResolvedValue({ data: taskNonRecurring, error: null });
    mockApiOk();

    const req = makePatchRequest({ status: 'done' });
    await PATCH(req, { params: PARAMS });

    expect(mockCreateNextRecurrence).not.toHaveBeenCalled();
  });

  it('dispatches task.created when createNextRecurrence succeeds', async () => {
    const taskAfterDone = { ...MOCK_TASK, status: 'done', recurrence: 'weekly' };
    const nextTask = { ...MOCK_TASK, id: 'task-2', status: 'todo', dueDate: '2026-02-08T00:00:00Z' };

    mockGetTask.mockResolvedValue({ data: MOCK_TASK, error: null });
    mockUpdateTask.mockResolvedValue({ data: taskAfterDone, error: null });
    mockCreateNextRecurrence.mockResolvedValue({ data: nextTask, error: null });
    mockApiOk();

    const req = makePatchRequest({ status: 'done' });
    await PATCH(req, { params: PARAMS });

    expect(mockCreateNextRecurrence).toHaveBeenCalledWith(taskAfterDone);
    expect(mockDispatchWebhook).toHaveBeenCalledWith(
      'task.created',
      expect.objectContaining({ id: 'task-2' }),
    );
    expect(mockLogAction).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'task',
        entityId:   'task-2',
        action:     'created',
      }),
    );
  });

  it('does not dispatch task.created when createNextRecurrence fails', async () => {
    const taskAfterDone = { ...MOCK_TASK, status: 'done', recurrence: 'weekly' };

    mockGetTask.mockResolvedValue({ data: MOCK_TASK, error: null });
    mockUpdateTask.mockResolvedValue({ data: taskAfterDone, error: null });
    mockCreateNextRecurrence.mockResolvedValue({ data: null, error: 'insert failed' });
    mockApiOk();

    const req = makePatchRequest({ status: 'done' });
    const result = await PATCH(req, { params: PARAMS });

    // Main response still succeeds — recurrence failure does not fail the request
    expect(result.status).toBe(200);
    // task.created must NOT be dispatched
    expect(mockDispatchWebhook).not.toHaveBeenCalledWith('task.created', expect.anything());
  });

  it('returns 403 when user lacks member permission', async () => {
    const errorResponse = new NextResponse(
      JSON.stringify({ data: null, error: 'Forbidden' }),
      { status: 403 },
    );
    mockGuardMember.mockResolvedValue(errorResponse);

    const req = makePatchRequest({ status: 'done' });
    const result = await PATCH(req, { params: PARAMS });

    expect(result.status).toBe(403);
    expect(mockDispatchWebhook).not.toHaveBeenCalled();
    expect(mockRunAutomations).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Zod Validation Tests
// ---------------------------------------------------------------------------

describe('TaskSchema — recurrence + dueDate validation', () => {
  // Importing TaskSchema directly to unit-test the Zod refinement
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { TaskSchema } = require('@/lib/validations/tasks');

  const BASE_INPUT = {
    title:      'Weekly standup',
    status:     'todo',
    priority:   'medium',
    recurrence: 'none',
    checklist:  [],
    blockedBy:  [],
  };

  it('accepts a recurring task when dueDate is provided', () => {
    const result = TaskSchema.safeParse({
      ...BASE_INPUT,
      recurrence: 'weekly',
      dueDate:    '2026-04-07T00:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a recurring task when dueDate is absent', () => {
    const result = TaskSchema.safeParse({
      ...BASE_INPUT,
      recurrence: 'weekly',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i: { path: (string | number)[] }) => i.path.join('.'));
      expect(paths).toContain('dueDate');
    }
  });

  it('accepts a non-recurring task without dueDate', () => {
    const result = TaskSchema.safeParse(BASE_INPUT);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// DELETE Tests
// ---------------------------------------------------------------------------

describe('DELETE /api/tasks/[id]', () => {
  it('returns 200 with task id on success', async () => {
    mockDeleteTask.mockResolvedValue({ error: null });
    mockApiOk();

    await DELETE(new Request('http://localhost'), { params: PARAMS });

    expect(apiOk).toHaveBeenCalledWith({ id: 'task-1' });
  });

  it('returns 403 when user lacks admin permission', async () => {
    const errorResponse = new NextResponse(
      JSON.stringify({ data: null, error: 'Forbidden' }),
      { status: 403 },
    );
    mockGuardAdmin.mockResolvedValue(errorResponse);

    const result = await DELETE(new Request('http://localhost'), { params: PARAMS });

    expect(result.status).toBe(403);
    expect(mockDeleteTask).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function mockApiOk() {
  (apiOk as jest.Mock).mockImplementation((data: unknown) =>
    new NextResponse(JSON.stringify({ data, error: null }), { status: 200 }),
  );
}

function mockApiError() {
  (apiError as jest.Mock).mockImplementation((msg: string, status: number) =>
    new NextResponse(JSON.stringify({ data: null, error: msg }), { status }),
  );
}
