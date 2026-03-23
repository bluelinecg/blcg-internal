// GET  /api/proposals — list all proposals with line items
// POST /api/proposals — create a new proposal with line items
//
// Auth: requires a valid Clerk session.
// Response shape: { data: T | null, error: string | null }

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { listProposals, createProposal } from '@/lib/db/proposals';
import { ProposalSchema } from '@/lib/validations/proposals';

// GET /api/proposals
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
    }

    const { data, error } = await listProposals();
    if (error) return NextResponse.json({ data: null, error }, { status: 500 });

    return NextResponse.json({ data, error: null });
  } catch (err) {
    console.error('[GET /api/proposals]', err);
    return NextResponse.json({ data: null, error: 'Failed to load proposals' }, { status: 500 });
  }
}

// POST /api/proposals
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: 'Unauthorised' }, { status: 401 });
    }

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
