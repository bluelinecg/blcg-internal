// Unit tests for lib/db/tasks.ts
// Supabase serverClient is mocked — no real DB connection needed.

import {
  listTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} from './tasks';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

function makeChain(result: { data: unknown; count?: number | null; error: unknown }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    then: jest.fn().mockImplementation((resolve: (v: unknown) => unknown) => Promise.resolve(resolve(result))),
  };
  return chain;
}

jest.mock('@/lib/db/supabase', () => ({ serverClient: jest.fn() }));
import { serverClient } from '@/lib/db/supabase';
const mockServerClient = serverClient as jest.Mock;

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const TASK_ROW = {
  id: 'task-1',
  title: 'Build login page',
  description: 'Implement Clerk sign-in',
  status: 'in_progress',
  priority: 'high',
  project_id: 'proj-1',
  assignee: 'Ryan',
  due_date: '2026-04-01',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// listTasks
// ---------------------------------------------------------------------------

describe('listTasks', () => {
  it('returns mapped tasks on success', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: [TASK_ROW], error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await listTasks();

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe('task-1');
    expect(data![0].title).toBe('Build login page');
    expect(data![0].projectId).toBe('proj-1');
    expect(data![0].assignee).toBe('Ryan');
  });

  it('returns error string on DB failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'DB error' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await listTasks();

    expect(data).toBeNull();
    expect(error).toBe('DB error');
  });
});

// ---------------------------------------------------------------------------
// getTaskById
// ---------------------------------------------------------------------------

describe('getTaskById', () => {
  it('returns the task when found', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: TASK_ROW, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await getTaskById('task-1');

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.id).toBe('task-1');
    expect(data!.dueDate).toBe('2026-04-01');
  });

  it('returns null data (not error) when row not found (PGRST116)', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { code: 'PGRST116', message: 'Not found' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await getTaskById('nonexistent');

    expect(data).toBeNull();
    expect(error).toBeNull();
  });

  it('returns error string on other DB failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { code: '500', message: 'Server error' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await getTaskById('task-1');

    expect(data).toBeNull();
    expect(error).toBe('Server error');
  });
});

// ---------------------------------------------------------------------------
// createTask
// ---------------------------------------------------------------------------

describe('createTask', () => {
  it('creates a task and returns the mapped record', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: TASK_ROW, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await createTask({
      title: 'Build login page',
      description: 'Implement Clerk sign-in',
      status: 'in_progress',
      priority: 'high',
      projectId: 'proj-1',
      assignee: 'Ryan',
      dueDate: '2026-04-01T00:00:00Z',
    });

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.title).toBe('Build login page');
  });

  it('returns error if insert fails', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'Insert failed' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await createTask({
      title: 'Build login page',
      status: 'todo',
      priority: 'medium',
    });

    expect(data).toBeNull();
    expect(error).toBe('Insert failed');
  });
});

// ---------------------------------------------------------------------------
// updateTask
// ---------------------------------------------------------------------------

describe('updateTask', () => {
  it('returns the updated task on success', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: { ...TASK_ROW, status: 'done' }, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await updateTask('task-1', { status: 'done' });

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.status).toBe('done');
  });

  it('returns null data (not error) when task not found (PGRST116)', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { code: 'PGRST116', message: 'Not found' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await updateTask('nonexistent', { status: 'done' });

    expect(data).toBeNull();
    expect(error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deleteTask
// ---------------------------------------------------------------------------

describe('deleteTask', () => {
  it('returns null error on success', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { error } = await deleteTask('task-1');
    expect(error).toBeNull();
  });

  it('returns error string on failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'Delete failed' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { error } = await deleteTask('task-1');
    expect(error).toBe('Delete failed');
  });
});
