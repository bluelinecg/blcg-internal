// GET    /api/organizations/[id] — fetch a single organization
// PATCH  /api/organizations/[id] — update an organization
// DELETE /api/organizations/[id] — delete an organization (blocked if contacts exist)
//
// Auth: requires a valid Clerk session. DELETE requires admin role.
// Response shape: { data: T | null, error: string | null }

import { NextResponse } from 'next/server';
import { getOrganizationById, updateOrganization, deleteOrganization, getOrganizationContactCount } from '@/lib/db/organizations';
import { UpdateOrganizationSchema } from '@/lib/validations/organizations';
import { guardAdmin, guardMember } from '@/lib/auth/roles';
import { logAction } from '@/lib/utils/audit';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const { data, error } = await getOrganizationById(id);

    if (error) return apiError(error, 500);
    if (!data) return apiError('Organization not found', 404);

    return apiOk(data);
  } catch (err) {
    console.error('[GET /api/organizations/[id]]', err);
    return apiError('Failed to load organization', 500);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardMember();
    if (guard) return guard;

    const { id } = await params;

    const parsed = UpdateOrganizationSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { data, error } = await updateOrganization(id, parsed.data);
    if (error) return apiError(error, 500);
    if (!data) return apiError('Organization not found', 404);

    void logAction({ entityType: 'organization', entityId: id, entityLabel: data.name, action: 'updated' });

    return apiOk(data);
  } catch (err) {
    console.error('[PATCH /api/organizations/[id]]', err);
    return apiError('Failed to update organization', 500);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardAdmin();
    if (guard) return guard;

    const { id } = await params;

    // Fetch entity label before deletion for audit log
    const { data: org } = await getOrganizationById(id);

    // Server-side dependency check — never trust the frontend alone (CLAUDE.md)
    const { count, error: countError } = await getOrganizationContactCount(id);
    if (countError) return apiError(countError, 500);
    if (count && count > 0) {
      return apiError(`Cannot delete: ${count} contact${count > 1 ? 's' : ''} linked to this organization`, 409);
    }

    const { error } = await deleteOrganization(id);
    if (error) return apiError(error, 500);

    void logAction({ entityType: 'organization', entityId: id, entityLabel: org?.name ?? id, action: 'deleted' });

    return apiOk({ id });
  } catch (err) {
    console.error('[DELETE /api/organizations/[id]]', err);
    return apiError('Failed to delete organization', 500);
  }
}
