/** @jest-environment node */
// Unit tests for app/api/proposals/[id]/send/route.ts
// Verifies auth guards, validation, 404 handling, and Gmail send call.
// All dependencies are mocked — no real DB, Clerk, or network calls.

import { POST } from './route';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@react-pdf/renderer', () => ({
  renderToBuffer: jest.fn(),
  StyleSheet:     { create: (styles: unknown) => styles },
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
  apiOk: jest.fn((data: unknown, status = 200) =>
    new NextResponse(JSON.stringify({ data, error: null }), { status }),
  ),
}));

jest.mock('@/lib/auth/roles', () => ({
  guardMember: jest.fn(),
}));

const mockSend = jest.fn();
jest.mock('@/lib/integrations/gmail', () => ({
  getGmailClient:      jest.fn(() => ({ users: { messages: { send: mockSend } } })),
  EMAIL_TO_ACCOUNT_KEY: { 'ryan@bluelinecg.com': 'ryan', 'bluelinecgllc@gmail.com': 'gmail' },
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

function makeRequest(body: unknown): Request {
  return new Request('http://localhost', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: 'user-1' });
  mockGuardMember.mockResolvedValue(null);
  mockRenderToBuffer.mockResolvedValue(Buffer.from('%PDF-fake'));
  mockSend.mockResolvedValue({ data: { id: 'gmail-msg-1' } });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/proposals/[id]/send', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(new NextResponse(null, { status: 401 }));

    const res = await POST(makeRequest({ to: 'client@example.com' }) as never, PARAMS);
    expect(res.status).toBe(401);
  });

  it('returns 404 when proposal does not exist', async () => {
    mockGetProposal.mockResolvedValue({ data: null, error: null });
    mockApiError.mockReturnValue(new NextResponse(null, { status: 404 }));

    const res = await POST(makeRequest({ to: 'client@example.com' }) as never, PARAMS);
    expect(res.status).toBe(404);
  });

  it('returns 400 when to is missing', async () => {
    mockGetProposal.mockResolvedValue({ data: MOCK_PROPOSAL, error: null });
    mockApiError.mockReturnValue(new NextResponse(null, { status: 400 }));

    const res = await POST(makeRequest({}) as never, PARAMS);
    expect(res.status).toBe(400);
  });

  it('returns 400 when to is not a valid email', async () => {
    mockGetProposal.mockResolvedValue({ data: MOCK_PROPOSAL, error: null });
    mockApiError.mockReturnValue(new NextResponse(null, { status: 400 }));

    const res = await POST(makeRequest({ to: 'not-an-email' }) as never, PARAMS);
    expect(res.status).toBe(400);
  });

  it('calls Gmail send and returns 201 on success', async () => {
    mockGetProposal.mockResolvedValue({ data: MOCK_PROPOSAL, error: null });

    const res = await POST(makeRequest({ to: 'client@example.com' }) as never, PARAMS);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const callArg = mockSend.mock.calls[0][0] as { requestBody: { raw: string } };
    expect(callArg.requestBody.raw).toBeTruthy();
    expect(res.status).toBe(201);
  });

  it('uses custom subject and body when provided', async () => {
    mockGetProposal.mockResolvedValue({ data: MOCK_PROPOSAL, error: null });

    await POST(
      makeRequest({ to: 'client@example.com', subject: 'Custom Subject', body: 'Custom body' }) as never,
      PARAMS,
    );

    const callArg = mockSend.mock.calls[0][0] as { requestBody: { raw: string } };
    const decoded = Buffer.from(
      callArg.requestBody.raw.replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString('utf-8');
    expect(decoded).toContain('Custom Subject');
    expect(decoded).toContain('Custom body');
  });
});
