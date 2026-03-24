// GET  /api/proposals — list proposals (paginated, sortable)
// POST /api/proposals — create a new proposal with line items
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, total: number | null, error: string | null }

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { listProposals, createProposal } from '@/lib/db/proposals';
import { ProposalSchema } from '@/lib/validations/proposals';
import { guardMember } from '@/lib/auth/roles';
import { parseListParams } from '@/lib/utils/parse-list-params';

// GET /api/proposals
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, total: null, error: 'Unauthorised' }, { status: 401 });
    }

    const options = parseListParams(new URL(request.url).searchParams);
    const { data, total, error } = await listProposals(options);
    if (error) return NextResponse.json({ data: null, total: null, error }, { status: 500 });

    return NextResponse.json({ data, total, error: null });
  } catch (err) {
    console.error('[GET /api/proposals]', err);
    return NextResponse.json({ data: null, total: null, error: 'Failed to load proposals' }, { status: 500 });
  }
}

// POST /api/proposals
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
    }

    const guard = await guardMember();
    if (guard) return guard;

    const parsed = ProposalSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return NextResponse.json({ data: null, error }, { status: 400 });
    }

    const { data, error } = await createProposal(parsed.data);
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });

    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/proposals]', err);
    return NextResponse.json({ data: null, error: 'Failed to create proposal' }, { status: 500 });
  }
}
