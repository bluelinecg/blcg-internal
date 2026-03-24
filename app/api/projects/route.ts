// GET  /api/projects — list projects (paginated, sortable)
// POST /api/projects — create a new project with milestones
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, total: number | null, error: string | null }

import { NextResponse } from 'next/server';
import { listProjects, createProject } from '@/lib/db/projects';
import { ProjectSchema } from '@/lib/validations/projects';
import { guardMember } from '@/lib/auth/roles';
import { parseListParams } from '@/lib/utils/parse-list-params';
import { logAction } from '@/lib/utils/audit';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

export async function GET(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const options = parseListParams(new URL(request.url).searchParams);
    const { data, total, error } = await listProjects(options);
    if (error) return apiError(error, 500);

    return NextResponse.json({ data, total, error: null });
  } catch (err) {
    console.error('[GET /api/projects]', err);
    return apiError('Failed to load projects', 500);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardMember();
    if (guard) return guard;

    const parsed = ProjectSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { data, error } = await createProject(parsed.data);
    if (error) return apiError(error, 500);

    if (data) void logAction({ entityType: 'project', entityId: data.id, entityLabel: data.name, action: 'created' });

    return apiOk(data, 201);
  } catch (err) {
    console.error('[POST /api/projects]', err);
    return apiError('Failed to create project', 500);
  }
}
