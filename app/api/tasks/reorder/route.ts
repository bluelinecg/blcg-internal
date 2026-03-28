// PATCH /api/tasks/reorder — bulk-update sortOrder for a column after drag-and-drop.
// Body: { status: TaskStatus; orderedIds: string[] }
// Auth: requires member role.
// Response shape: { data: { reordered: number } | null, error: string | null }

import { NextResponse } from 'next/server';
import { reorderTasks } from '@/lib/db/tasks';
import { ReorderTasksSchema } from '@/lib/validations/tasks';
import { guardMember } from '@/lib/auth/roles';
import { logAction } from '@/lib/utils/audit';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

export async function PATCH(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardMember();
    if (guard) return guard;

    const parsed = ReorderTasksSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { status, orderedIds } = parsed.data;
    const { error } = await reorderTasks(status, orderedIds);
    if (error) return apiError(error, 500);

    void logAction({
      entityType:  'task',
      entityId:    status,
      entityLabel: `${status} column`,
      action:      'updated',
      metadata:    { reordered: orderedIds.length },
    });

    return apiOk({ reordered: orderedIds.length });
  } catch (err) {
    return apiError('Failed to reorder tasks', 500);
  }
}
