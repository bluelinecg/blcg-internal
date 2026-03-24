// GET    /api/organizations/[id] — fetch a single organization
// PATCH  /api/organizations/[id] — update an organization
// DELETE /api/organizations/[id] — delete an organization (blocked if contacts exist)
//
// Auth: requires a valid Clerk session. DELETE requires admin role.
// Response shape: { data: T | null, error: string | null }

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getOrganizationById, updateOrganization, deleteOrganization, getOrganizationContactCount } from '@/lib/db/organizations';
import { UpdateOrganizationSchema } from '@/lib/validations/organizations';
import { guardAdmin, guardMember } from '@/lib/auth/roles';

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
    const { data, error } = await getOrganizationById(id);

    if (error) return NextResponse.json({ data: null, error }, { status: 500 });
    if (!data) return NextResponse.json({ data: null, error: 'Organization not found' }, { status: 404 });

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('[GET /api/organizations/[id]]', err);
    return NextResponse.json({ data: null, error: 'Failed to load organization' }, { status: 500 });
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

    const parsed = UpdateOrganizationSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return NextResponse.json({ data: null, error }, { status: 400 });
    }

    const { data, error } = await updateOrganization(id, parsed.data);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });
    if (!data) return NextResponse.json({ data: null, error: 'Organization not found' }, { status: 404 });

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('[PATCH /api/organizations/[id]]', err);
    return NextResponse.json({ data: null, error: 'Failed to update organization' }, { status: 500 });
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

    // Server-side dependency check — never trust the frontend alone (CLAUDE.md)
    const { count, error: countError } = await getOrganizationContactCount(id);
    if (countError) return NextResponse.json({ data: null, error: countError }, { status: 500 });
    if (count && count > 0) {
      return NextResponse.json(
        { data: null, error: `Cannot delete: ${count} contact${count > 1 ? 's' : ''} linked to this organization` },
        { status: 409 },
      );
    }

    const { error } = await deleteOrganization(id);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });

    return NextResponse.json({ data: { id }, error: null });
  } catch (err) {
    console.error('[DELETE /api/organizations/[id]]', err);
    return NextResponse.json({ data: null, error: 'Failed to delete organization' }, { status: 500 });
  }
}
