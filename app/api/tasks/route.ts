// GET  /api/tasks — list tasks (paginated, sortable)
// POST /api/tasks — create a task
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, total: number | null, error: string | null }

import { NextResponse } from 'next/server';
import { listTasks, createTask } from '@/lib/db/tasks';
import { TaskSchema } from '@/lib/validations/tasks';
import { guardMember } from '@/lib/auth/roles';
import { parseListParams } from '@/lib/utils/parse-list-params';
import { bus } from '@/lib/events';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

export async function GET(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const options = parseListParams(new URL(request.url).searchParams);
    const { data, total, error } = await listTasks(options);
    if (error) return apiError(error, 500);

    return NextResponse.json({ data, total, error: null });
  } catch (err) {
    console.error('[GET /api/tasks]', err);
    return apiError('Failed to load tasks', 500);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const guard = await guardMember();
    if (guard) return guard;

    const parsed = TaskSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { data, error } = await createTask(parsed.data);
    if (error) return apiError(error, 500);

    if (data) {
      void bus.publish('task.created', {
        actorId:     userId,
        entityType:  'task',
        entityId:    data.id,
        entityLabel: data.title,
        action:      'created',
        data:        data as unknown as Record<string, unknown>,
      });
    }

    return apiOk(data, 201);
  } catch (err) {
    console.error('[POST /api/tasks]', err);
    return apiError('Failed to create task', 500);
  }
}
