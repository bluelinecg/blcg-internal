// GET    /api/projects/[id] — fetch a single project with milestones
// PATCH  /api/projects/[id] — update a project (replaces milestones if provided)
// DELETE /api/projects/[id] — delete a project (409 if outstanding invoices exist)
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, error: string | null }

import { NextResponse } from 'next/server';
import {
  getProjectById,
  updateProject,
  deleteProject,
  getProjectDependencyCounts,
} from '@/lib/db/projects';
import { UpdateProjectSchema } from '@/lib/validations/projects';
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
    const { data, error } = await getProjectById(id);

    if (error) return apiError(error, 500);
    if (!data) return apiError('Project not found', 404);

    return apiOk(data);
  } catch (err) {
    console.error('[GET /api/projects/[id]]', err);
    return apiError('Failed to load project', 500);
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

    const parsed = UpdateProjectSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { data, error } = await updateProject(id, parsed.data);
    if (error) return apiError(error, 500);
    if (!data) return apiError('Project not found', 404);

    const isStatusChange = parsed.data.status !== undefined;
    void bus.publish(isStatusChange ? 'project.status_changed' : 'project.updated', {
      actorId:     userId,
      entityType:  'project',
      entityId:    id,
      entityLabel: data.name,
      action:      isStatusChange ? 'status_changed' : 'updated',
      data:        data as unknown as Record<string, unknown>,
      metadata:    isStatusChange ? { to: data.status } : undefined,
    });

    return apiOk(data);
  } catch (err) {
    console.error('[PATCH /api/projects/[id]]', err);
    return apiError('Failed to update project', 500);
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
    const { data: project } = await getProjectById(id);

    const { outstandingInvoices, error: depError } = await getProjectDependencyCounts(id);
    if (depError) return apiError(depError, 500);

    if (outstandingInvoices > 0) {
      return apiError(
        `Cannot delete project: ${outstandingInvoices} outstanding invoice${outstandingInvoices > 1 ? 's' : ''} must be resolved first`,
        409,
      );
    }

    const { error } = await deleteProject(id);
    if (error) return apiError(error, 500);

    void bus.publish('project.deleted', {
      actorId:     userId,
      entityType:  'project',
      entityId:    id,
      entityLabel: project?.name ?? id,
      action:      'deleted',
      data:        project as unknown as Record<string, unknown> ?? { id },
    });

    return apiOk({ id });
  } catch (err) {
    console.error('[DELETE /api/projects/[id]]', err);
    return apiError('Failed to delete project', 500);
  }
}
