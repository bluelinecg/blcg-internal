// GET    /api/tasks/[id] — fetch a single task
// PATCH  /api/tasks/[id] — update a task
// DELETE /api/tasks/[id] — delete a task (no dependency restrictions)
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, error: string | null }

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getTaskById, updateTask, deleteTask, createNextRecurrence } from '@/lib/db/tasks';
import { UpdateTaskSchema } from '@/lib/validations/tasks';
import { guardAdmin, guardMember } from '@/lib/auth/roles';
import { dispatchWebhookEvent } from '@/lib/utils/webhook-delivery';
import { logAction } from '@/lib/utils/audit';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
    }

    const { id } = await params;
    const { data, error } = await getTaskById(id);

    if (error) return NextResponse.json({ data: null, error }, { status: 500 });
    if (!data) return NextResponse.json({ data: null, error: 'Task not found' }, { status: 404 });

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('[GET /api/tasks/[id]]', err);
    return NextResponse.json({ data: null, error: 'Failed to load task' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
    }

    const guard = await guardMember();
    if (guard) return guard;

    const { id } = await params;

    const parsed = UpdateTaskSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return NextResponse.json({ data: null, error }, { status: 400 });
    }

    const { data, error } = await updateTask(id, parsed.data);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });
    if (!data) return NextResponse.json({ data: null, error: 'Task not found' }, { status: 404 });

    if (data && parsed.data.status !== undefined) {
      void dispatchWebhookEvent('task.status_changed', data as unknown as Record<string, unknown>);
      void logAction({ entityType: 'task', entityId: id, entityLabel: data.title, action: 'status_changed', metadata: { to: data.status } });
    } else if (data) {
      void logAction({ entityType: 'task', entityId: id, entityLabel: data.title, action: 'updated' });
    }

    // When a recurring task is marked done, auto-create the next occurrence.
    // TODO: dispatch automation engine event here once the Automation Engine is built.
    if (data && parsed.data.status === 'done' && data.recurrence !== 'none') {
      void createNextRecurrence(data);
    }

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('[PATCH /api/tasks/[id]]', err);
    return NextResponse.json({ data: null, error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
    }

    const guard = await guardAdmin();
    if (guard) return guard;

    const { id } = await params;

    // Fetch entity label before deletion for audit log
    const { data: task } = await getTaskById(id);

    const { error } = await deleteTask(id);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });

    void logAction({ entityType: 'task', entityId: id, entityLabel: task?.title ?? id, action: 'deleted' });

    return NextResponse.json({ data: { id }, error: null });
  } catch (err) {
    console.error('[DELETE /api/tasks/[id]]', err);
    return NextResponse.json({ data: null, error: 'Failed to delete task' }, { status: 500 });
  }
}
