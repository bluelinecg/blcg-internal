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
import { dispatchWebhookEvent } from '@/lib/utils/webhook-delivery';
import { logAction } from '@/lib/utils/audit';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';
import { runAutomations } from '@/lib/automations/engine';
import { notifyIfEnabled } from '@/lib/utils/notify-user';

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

    if (data && parsed.data.status !== undefined) {
      void dispatchWebhookEvent('proposal.status_changed', data as unknown as Record<string, unknown>);
      void runAutomations('proposal.status_changed', data as unknown as Record<string, unknown>);
      void logAction({ entityType: 'proposal', entityId: id, entityLabel: data.title, action: 'status_changed', metadata: { to: data.status } });
      if (data.status === 'accepted') {
        void notifyIfEnabled(userId, 'proposalAccepted', {
          type: 'proposal_accepted',
          title: 'Proposal Accepted',
          body: `Proposal "${data.title}" has been accepted.`,
          entityType: 'proposal',
          entityId: id,
        });
      }
    } else if (data) {
      void logAction({ entityType: 'proposal', entityId: id, entityLabel: data.title, action: 'updated' });
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

    void logAction({ entityType: 'proposal', entityId: id, entityLabel: proposal?.title ?? id, action: 'deleted' });

    return apiOk({ id });
  } catch (err) {
    return apiError('Failed to delete proposal', 500);
  }
}
