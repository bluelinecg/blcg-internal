// GET    /api/clients/[id] — fetch a single client
// PATCH  /api/clients/[id] — update a client
// DELETE /api/clients/[id] — delete a client (blocked if active dependencies exist)
//
// Auth: requires a valid Clerk session on all methods.
// Response shape: { data: T | null, error: string | null }

import { NextResponse } from 'next/server';
import { getClientById, updateClient, deleteClient, getClientDependencyCounts } from '@/lib/db/clients';
import { UpdateClientSchema } from '@/lib/validations/clients';
import { guardAdmin, guardMember } from '@/lib/auth/roles';
import { bus } from '@/lib/events';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/clients/[id]
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const { data, error } = await getClientById(id);

    if (error) return apiError(error, 500);
    if (!data) return apiError('Client not found', 404);

    return apiOk(data);
  } catch (err) {
    console.error('[GET /api/clients/[id]]', err);
    return apiError('Failed to load client', 500);
  }
}

// PATCH /api/clients/[id]
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const guard = await guardMember();
    if (guard) return guard;

    const { id } = await params;

    const parsed = UpdateClientSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { data, error } = await updateClient(id, parsed.data);
    if (error) return apiError(error, 500);
    if (!data) return apiError('Client not found', 404);

    void bus.publish('client.updated', {
      actorId:     userId,
      entityType:  'client',
      entityId:    id,
      entityLabel: data.name,
      action:      'updated',
      data:        data as unknown as Record<string, unknown>,
    });

    return apiOk(data);
  } catch (err) {
    console.error('[PATCH /api/clients/[id]]', err);
    return apiError('Failed to update client', 500);
  }
}

// DELETE /api/clients/[id]
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const guard = await guardAdmin();
    if (guard) return guard;

    const { id } = await params;

    // Fetch entity label before deletion for audit log
    const { data: client } = await getClientById(id);

    // Server-side dependency check — never trust the frontend check alone
    const { activeProposals, activeProjects, activeInvoices, error: depError } =
      await getClientDependencyCounts(id);

    if (depError) return apiError(depError, 500);

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
      return apiError(`Cannot delete client: ${blockers.join(', ')}`, 409);
    }

    const { error } = await deleteClient(id);
    if (error) return apiError(error, 500);

    void bus.publish('client.deleted', {
      actorId:     userId,
      entityType:  'client',
      entityId:    id,
      entityLabel: client?.name ?? id,
      action:      'deleted',
      data:        client as unknown as Record<string, unknown> ?? { id },
    });

    return apiOk({ id });
  } catch (err) {
    console.error('[DELETE /api/clients/[id]]', err);
    return apiError('Failed to delete client', 500);
  }
}
