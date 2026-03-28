// GET    /api/proposals/[id] — fetch a single proposal with line items
// PATCH  /api/proposals/[id] — update a proposal (replaces line items if provided)
// DELETE /api/proposals/[id] — delete a proposal (409 if a project is linked)
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, error: string | null }

import { NextResponse } from 'next/server';
import {
  getProposalById,
  updateProposal,
  deleteProposal,
  getProposalDependencyCounts,
} from '@/lib/db/proposals';
import { UpdateProposalSchema } from '@/lib/validations/proposals';
import { guardAdmin, guardMember } from '@/lib/auth/roles';
import { bus } from '@/lib/events';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/proposals/[id]
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const { data, error } = await getProposalById(id);

    if (error) return apiError(error, 500);
    if (!data) return apiError('Proposal not found', 404);

    return apiOk(data);
  } catch (err) {
    return apiError('Failed to load proposal', 500);
  }
}

// PATCH /api/proposals/[id]
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const guard = await guardMember();
    if (guard) return guard;

    const { id } = await params;

    const parsed = UpdateProposalSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const { data, error } = await updateProposal(id, parsed.data);
    if (error) return apiError(error, 500);
    if (!data) return apiError('Proposal not found', 404);

    if (parsed.data.status !== undefined) {
      void bus.publish('proposal.status_changed', {
        actorId:     userId,
        entityType:  'proposal',
        entityId:    id,
        entityLabel: data.title,
        action:      'status_changed',
        data:        data as unknown as Record<string, unknown>,
        metadata:    { to: data.status, newStatus: data.status },
      });
    } else {
      void bus.publish('proposal.updated', {
        actorId:     userId,
        entityType:  'proposal',
        entityId:    id,
        entityLabel: data.title,
        action:      'updated',
        data:        data as unknown as Record<string, unknown>,
      });
    }

    return apiOk(data);
  } catch (err) {
    return apiError('Failed to update proposal', 500);
  }
}

// DELETE /api/proposals/[id]
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const guard = await guardAdmin();
    if (guard) return guard;

    const { id } = await params;

    // Fetch entity label before deletion for audit log
    const { data: proposal } = await getProposalById(id);

    const { linkedProjects, error: depError } = await getProposalDependencyCounts(id);
    if (depError) return apiError(depError, 500);

    if (linkedProjects > 0) {
      return apiError(`Cannot delete proposal: linked to ${linkedProjects} project${linkedProjects > 1 ? 's' : ''}`, 409);
    }

    const { error } = await deleteProposal(id);
    if (error) return apiError(error, 500);

    void bus.publish('proposal.deleted', {
      actorId:     userId,
      entityType:  'proposal',
      entityId:    id,
      entityLabel: proposal?.title ?? id,
      action:      'deleted',
      data:        proposal as unknown as Record<string, unknown> ?? { id },
    });

    return apiOk({ id });
  } catch (err) {
    return apiError('Failed to delete proposal', 500);
  }
}
