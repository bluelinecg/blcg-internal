/** @jest-environment node */
// Unit tests for app/api/proposals/[id]/pdf/route.ts
// Verifies auth guards, 404 handling, and successful PDF response headers.
// All dependencies are mocked — no real DB, Clerk, or PDF rendering.

import { GET } from './route';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@react-pdf/renderer', () => ({
  renderToBuffer: jest.fn(),
}));

jest.mock('@/lib/pdf/proposal-template', () => ({
  ProposalPDF: () => null,
}));

jest.mock('@/lib/db/proposals', () => ({
  getProposalById: jest.fn(),
}));

jest.mock('@/lib/api/utils', () => ({
  requireAuth: jest.fn(),
  apiError: jest.fn((msg: string, status: number) =>
    new NextResponse(JSON.stringify({ data: null, error: msg }), { status }),
  ),
}));

jest.mock('@/lib/auth/roles', () => ({
  guardMember: jest.fn(),
}));

import { renderToBuffer } from '@react-pdf/renderer';
import { getProposalById } from '@/lib/db/proposals';
import { requireAuth, apiError } from '@/lib/api/utils';
import { guardMember } from '@/lib/auth/roles';

const mockRenderToBuffer = renderToBuffer as jest.Mock;
const mockGetProposal    = getProposalById as jest.Mock;
const mockAuth           = requireAuth as jest.Mock;
const mockGuardMember    = guardMember as jest.Mock;
const mockApiError       = apiError as jest.Mock;

const PARAMS = { params: Promise.resolve({ id: 'proposal-123' }) };

const MOCK_PROPOSAL = {
  id:             'proposal-123',
  proposalNumber: 'BL-2026-001',
  title:          'Test Proposal',
  lineItems:      [],
  totalValue:     5000,
  status:         'draft',
  organizationId: 'org-1',
  createdAt:      '2026-01-01T00:00:00Z',
  updatedAt:      '2026-01-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: 'user-1' });
  mockGuardMember.mockResolvedValue(null);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/proposals/[id]/pdf', () => {
  it('returns 401 when not authenticated', async () => {
    const authResponse = new NextResponse(null, { status: 401 });
    mockAuth.mockResolvedValue(authResponse);

    const res = await GET(new Request('http://localhost'), PARAMS);
    expect(res.status).toBe(401);
  });

  it('returns 403 when member guard rejects', async () => {
    const guardResponse = new NextResponse(null, { status: 403 });
    mockGuardMember.mockResolvedValue(guardResponse);

    const res = await GET(new Request('http://localhost'), PARAMS);
    expect(res.status).toBe(403);
  });

  it('returns 404 when proposal does not exist', async () => {
    mockGetProposal.mockResolvedValue({ data: null, error: null });
    mockApiError.mockReturnValue(new NextResponse(null, { status: 404 }));

    const res = await GET(new Request('http://localhost'), PARAMS);
    expect(res.status).toBe(404);
    expect(mockApiError).toHaveBeenCalledWith('Proposal not found', 404);
  });

  it('returns 200 with PDF headers when proposal exists', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4 fake');
    mockGetProposal.mockResolvedValue({ data: MOCK_PROPOSAL, error: null });
    mockRenderToBuffer.mockResolvedValue(pdfBuffer);

    const res = await GET(new Request('http://localhost'), PARAMS);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toContain('BL-2026-001');
    expect(res.headers.get('Content-Length')).toBe(String(pdfBuffer.length));
  });

  it('returns 500 when PDF rendering throws', async () => {
    mockGetProposal.mockResolvedValue({ data: MOCK_PROPOSAL, error: null });
    mockRenderToBuffer.mockRejectedValue(new Error('render failed'));
    mockApiError.mockReturnValue(new NextResponse(null, { status: 500 }));

    const res = await GET(new Request('http://localhost'), PARAMS);
    expect(res.status).toBe(500);
    expect(mockApiError).toHaveBeenCalledWith('Failed to generate PDF', 500);
  });
});
