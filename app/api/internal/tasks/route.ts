// GET  /api/internal/tasks — list all tasks (filterable by status)
// POST /api/internal/tasks — create a task
//
// Auth: X-Internal-Key header must match INTERNAL_API_KEY env var.
// Intended for use by Claude Code agents to read and manage the kanban board.
// Does not require a Clerk session.

import { NextResponse } from 'next/server';
import { listTasks, createTask } from '@/lib/db/tasks';
import { TaskSchema } from '@/lib/validations/tasks';
import { apiError, apiOk, apiList } from '@/lib/api/utils';

function requireInternalKey(request: Request): NextResponse<{ data: null; error: string }> | null {
  const key = request.headers.get('x-internal-key');
  const expected = process.env.INTERNAL_API_KEY;
  if (!expected || !key || key !== expected) {
    return apiError('Unauthorised', 401);
  }
  return null;
}

export async function GET(request: Request) {
  const authError = requireInternalKey(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Fetch a large page sorted by sort_order ascending so the full board is returned.
    const { data, total, error } = await listTasks({ page: 1, pageSize: 500, sort: 'sort_order', order: 'asc' });
    if (error) return apiError(error, 500);

    const filtered = status
      ? (data ?? []).filter((t) => t.status === status)
      : (data ?? []);

    return apiList(filtered, filtered.length);
  } catch (err) {
    console.error('[GET /api/internal/tasks]', err);
    return apiError('Failed to load tasks', 500);
  }
}

export async function POST(request: Request) {
  const authError = requireInternalKey(request);
  if (authError) return authError;

  try {
    const parsed = TaskSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { data, error } = await createTask(parsed.data);
    if (error) return apiError(error, 500);

    return apiOk(data, 201);
  } catch (err) {
    console.error('[POST /api/internal/tasks]', err);
    return apiError('Failed to create task', 500);
  }
}
