// GET  /api/proposals — list proposals (paginated, sortable)
// POST /api/proposals — create a new proposal with line items
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, total: number | null, error: string | null }

import { NextResponse } from 'next/server';
import { listProposals, createProposal } from '@/lib/db/proposals';
import { ProposalSchema } from '@/lib/validations/proposals';
import { guardMember } from '@/lib/auth/roles';
import { parseListParams } from '@/lib/utils/parse-list-params';
import { bus } from '@/lib/events';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';

// GET /api/proposals
export async function GET(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const options = parseListParams(new URL(request.url).searchParams);
    const { data, total, error } = await listProposals(options);
    if (error) return apiError(error, 500);

    return NextResponse.json({ data, total, error: null });
  } catch (err) {
    console.error('[GET /api/proposals]', err);
    return apiError('Failed to load proposals', 500);
  }
}

// POST /api/proposals
export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const guard = await guardMember();
    if (guard) return guard;

    const parsed = ProposalSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return apiError(error, 400);
    }

    const today = new Date();
    const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const proposalNumber = parsed.data.proposalNumber || `PROP-${datePart}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

    const { data, error } = await createProposal({ ...parsed.data, proposalNumber });
    if (error) return apiError(error, 500);

    if (data) {
      void bus.publish('proposal.created', {
        actorId:     userId,
        entityType:  'proposal',
        entityId:    data.id,
        entityLabel: data.title,
        action:      'created',
        data:        data as unknown as Record<string, unknown>,
      });
    }

    return apiOk(data, 201);
  } catch (err) {
    console.error('[POST /api/proposals]', err);
    return apiError('Failed to create proposal', 500);
  }
}
