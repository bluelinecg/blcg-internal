// GET    /api/projects/[id] — fetch a single project with milestones
// PATCH  /api/projects/[id] — update a project (replaces milestones if provided)
// DELETE /api/projects/[id] — delete a project (409 if outstanding invoices exist)
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, error: string | null }

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import {
  getProjectById,
  updateProject,
  deleteProject,
  getProjectDependencyCounts,
} from '@/lib/db/projects';
import { UpdateProjectSchema } from '@/lib/validations/projects';
import { guardAdmin, guardMember } from '@/lib/auth/roles';
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
    const { data, error } = await getProjectById(id);

    if (error) return NextResponse.json({ data: null, error }, { status: 500 });
    if (!data) return NextResponse.json({ data: null, error: 'Project not found' }, { status: 404 });

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('[GET /api/projects/[id]]', err);
    return NextResponse.json({ data: null, error: 'Failed to load project' }, { status: 500 });
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

    const parsed = UpdateProjectSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return NextResponse.json({ data: null, error }, { status: 400 });
    }

    const { data, error } = await updateProject(id, parsed.data);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });
    if (!data) return NextResponse.json({ data: null, error: 'Project not found' }, { status: 404 });

    if (parsed.data.status !== undefined) {
      void logAction({ entityType: 'project', entityId: id, entityLabel: data.name, action: 'status_changed', metadata: { to: data.status } });
    } else {
      void logAction({ entityType: 'project', entityId: id, entityLabel: data.name, action: 'updated' });
    }

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('[PATCH /api/projects/[id]]', err);
    return NextResponse.json({ data: null, error: 'Failed to update project' }, { status: 500 });
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
    const { data: project } = await getProjectById(id);

    const { outstandingInvoices, error: depError } = await getProjectDependencyCounts(id);
    if (depError) return NextResponse.json({ data: null, error: depError }, { status: 500 });

    if (outstandingInvoices > 0) {
      return NextResponse.json(
        {
          data: null,
          error: `Cannot delete project: ${outstandingInvoices} outstanding invoice${outstandingInvoices > 1 ? 's' : ''} must be resolved first`,
        },
        { status: 409 },
      );
    }

    const { error } = await deleteProject(id);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });

    void logAction({ entityType: 'project', entityId: id, entityLabel: project?.name ?? id, action: 'deleted' });

    return NextResponse.json({ data: { id }, error: null });
  } catch (err) {
    console.error('[DELETE /api/projects/[id]]', err);
    return NextResponse.json({ data: null, error: 'Failed to delete project' }, { status: 500 });
  }
}
