// GET    /api/internal/tasks/[id] — fetch a single task
// PATCH  /api/internal/tasks/[id] — update a task (status, priority, sortOrder, etc.)
// DELETE /api/internal/tasks/[id] — delete a task
//
// Auth: X-Internal-Key header must match INTERNAL_API_KEY env var.
// Intended for use by Claude Code agents to read and manage the kanban board.
// Does not require a Clerk session.

import { NextResponse } from 'next/server';
import { getTaskById, updateTask, deleteTask } from '@/lib/db/tasks';
import { UpdateTaskSchema } from '@/lib/validations/tasks';
import { apiError, apiOk } from '@/lib/api/utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function requireInternalKey(request: Request): NextResponse<{ data: null; error: string }> | null {
  const key = request.headers.get('x-internal-key');
  const expected = process.env.INTERNAL_API_KEY;
  if (!expected || !key || key !== expected) {
    return apiError('Unauthorised', 401);
  }
  return null;
}

export async function GET(request: Request, { params }: RouteContext) {
  const authError = requireInternalKey(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const { data, error } = await getTaskById(id);

    if (error) return apiError(error, 500);
    if (!data) return apiError('Task not found', 404);

    return apiOk(data);
  } catch (err) {
    console.error('[GET /api/internal/tasks/[id]]', err);
    return apiError('Failed to load task', 500);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const authError = requireInternalKey(request);
  if (authError) return authError;

  try {
    const { id } = await params;

    const parsed = UpdateTaskSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { data, error } = await updateTask(id, parsed.data);
    if (error) return apiError(error, 500);
    if (!data) return apiError('Task not found', 404);

    return apiOk(data);
  } catch (err) {
    console.error('[PATCH /api/internal/tasks/[id]]', err);
    return apiError('Failed to update task', 500);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const authError = requireInternalKey(request);
  if (authError) return authError;

  try {
    const { id } = await params;

    const { error } = await deleteTask(id);
    if (error) return apiError(error, 500);

    return apiOk({ id });
  } catch (err) {
    console.error('[DELETE /api/internal/tasks/[id]]', err);
    return apiError('Failed to delete task', 500);
  }
}
