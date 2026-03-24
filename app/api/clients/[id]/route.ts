// GET    /api/clients/[id] — fetch a single client
// PATCH  /api/clients/[id] — update a client
// DELETE /api/clients/[id] — delete a client (blocked if active dependencies exist)
//
// Auth: requires a valid Clerk session on all methods.
// Response shape: { data: T | null, error: string | null }

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getClientById, updateClient, deleteClient, getClientDependencyCounts } from '@/lib/db/clients';
import { UpdateClientSchema } from '@/lib/validations/clients';
import { guardAdmin, guardMember } from '@/lib/auth/roles';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/clients/[id]
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
    }

    const { id } = await params;
    const { data, error } = await getClientById(id);

    if (error) return NextResponse.json({ data: null, error }, { status: 500 });
    if (!data) return NextResponse.json({ data: null, error: 'Client not found' }, { status: 404 });

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('[GET /api/clients/[id]]', err);
    return NextResponse.json({ data: null, error: 'Failed to load client' }, { status: 500 });
  }
}

// PATCH /api/clients/[id]
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
    }

    const guard = await guardMember();
    if (guard) return guard;

    const { id } = await params;

    const parsed = UpdateClientSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return NextResponse.json({ data: null, error }, { status: 400 });
    }

    const { data, error } = await updateClient(id, parsed.data);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });
    if (!data) return NextResponse.json({ data: null, error: 'Client not found' }, { status: 404 });

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('[PATCH /api/clients/[id]]', err);
    return NextResponse.json({ data: null, error: 'Failed to update client' }, { status: 500 });
  }
}

// DELETE /api/clients/[id]
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
    }

    const guard = await guardAdmin();
    if (guard) return guard;

    const { id } = await params;

    // Server-side dependency check — never trust the frontend check alone
    const { activeProposals, activeProjects, activeInvoices, error: depError } =
      await getClientDependencyCounts(id);

    if (depError) {
      return NextResponse.json({ data: null, error: depError }, { status: 500 });
    }

    const blockers: string[] = [];
    if (activeProposals > 0) {
      blockers.push(`${activeProposals} active proposal${activeProposals > 1 ? 's' : ''}`);
    }
    if (activeProjects > 0) {
      blockers.push(`${activeProjects} active project${activeProjects > 1 ? 's' : ''}`);
    }
    if (activeInvoices > 0) {
      blockers.push(`${activeInvoices} outstanding invoice${activeInvoices > 1 ? 's' : ''}`);
    }

    if (blockers.length > 0) {
      return NextResponse.json(
        { data: null, error: `Cannot delete client: ${blockers.join(', ')}` },
        { status: 409 },
      );
    }

    const { error } = await deleteClient(id);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });

    return NextResponse.json({ data: { id }, error: null });
  } catch (err) {
    console.error('[DELETE /api/clients/[id]]', err);
    return NextResponse.json({ data: null, error: 'Failed to delete client' }, { status: 500 });
  }
}
