// GET    /api/tasks/[id] — fetch a single task
// PATCH  /api/tasks/[id] — update a task
// DELETE /api/tasks/[id] — delete a task (no dependency restrictions)
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, error: string | null }

import { NextResponse } from 'next/server';
import { getTaskById, updateTask, deleteTask, createNextRecurrence } from '@/lib/db/tasks';
import { UpdateTaskSchema } from '@/lib/validations/tasks';
import { guardAdmin, guardMember } from '@/lib/auth/roles';
import { bus } from '@/lib/events';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const { data, error } = await getTaskById(id);

    if (error) return apiError(error, 500);
    if (!data) return apiError('Task not found', 404);

    return apiOk(data);
  } catch (err) {
    return apiError('Failed to load task', 500);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const guard = await guardMember();
    if (guard) return guard;

    const { id } = await params;

    const parsed = UpdateTaskSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { data, error } = await updateTask(id, parsed.data);
    if (error) return apiError(error, 500);
    if (!data) return apiError('Task not found', 404);

    if (parsed.data.status !== undefined) {
      void bus.publish('task.status_changed', {
        actorId:     userId,
        entityType:  'task',
        entityId:    id,
        entityLabel: data.title,
        action:      'status_changed',
        data:        data as unknown as Record<string, unknown>,
        metadata:    { to: data.status },
      });
      if (parsed.data.status === 'done') {
        void bus.publish('task.completed', {
          actorId:     userId,
          entityType:  'task',
          entityId:    id,
          entityLabel: data.title,
          action:      'updated',
          data:        data as unknown as Record<string, unknown>,
        });
      }
    } else {
      void bus.publish('task.updated', {
        actorId:     userId,
        entityType:  'task',
        entityId:    id,
        entityLabel: data.title,
        action:      'updated',
        data:        data as unknown as Record<string, unknown>,
      });
    }

    // When a recurring task is marked done, auto-create the next occurrence.
    if (parsed.data.status === 'done' && data.recurrence !== 'none') {
      void createNextRecurrence(data);
    }

    return apiOk(data);
  } catch (err) {
    return apiError('Failed to update task', 500);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const guard = await guardAdmin();
    if (guard) return guard;

    const { id } = await params;

    // Fetch entity label before deletion for audit log
    const { data: task } = await getTaskById(id);

    const { error } = await deleteTask(id);
    if (error) return apiError(error, 500);

    void bus.publish('task.deleted', {
      actorId:     userId,
      entityType:  'task',
      entityId:    id,
      entityLabel: task?.title ?? id,
      action:      'deleted',
      data:        task as unknown as Record<string, unknown> ?? { id },
    });

    return apiOk({ id });
  } catch (err) {
    return apiError('Failed to delete task', 500);
  }
}
