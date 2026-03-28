/**
 * GET /api/proposals/[id]/pdf
 * Generates and streams a branded PDF for the given proposal.
 * Returns the PDF as an inline attachment (application/pdf).
 *
 * Auth: requires a valid Clerk session (member or admin).
 */

import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { getProposalById } from '@/lib/db/proposals';
import { ProposalPDF } from '@/lib/pdf/proposal-template';
import { requireAuth, apiError } from '@/lib/api/utils';
import { guardMember } from '@/lib/auth/roles';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const guard = await guardMember();
    if (guard) return guard;

    const { id } = await params;
    const { data: proposal, error: dbError } = await getProposalById(id);
    if (dbError || !proposal) return apiError('Proposal not found', 404);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(React.createElement(ProposalPDF, { proposal }) as any);

    const filename = `Proposal-${proposal.proposalNumber}.pdf`;

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length':      String(buffer.length),
      },
    });
  } catch (err) {
    console.error('[GET /api/proposals/[id]/pdf]', err);
    return apiError('Failed to generate PDF', 500);
  }
}
