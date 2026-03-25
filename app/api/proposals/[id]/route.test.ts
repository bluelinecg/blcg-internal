/** @jest-environment node */
// Unit tests for app/api/proposals/[id]/route.ts
// Tests GET, PATCH, DELETE handlers with automation engine and webhook dispatch.
// All dependencies are mocked — no real DB, Clerk, or network calls.

import { GET, PATCH, DELETE } from './route';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/db/proposals', () => ({
  getProposalById: jest.fn(),
  updateProposal: jest.fn(),
  deleteProposal: jest.fn(),
  getProposalDependencyCounts: jest.fn(),
}));

jest.mock('@/lib/api/utils', () => ({
  requireAuth: jest.fn(),
  apiError: jest.fn((msg: string, status: number) =>
    new NextResponse(JSON.stringify({ data: null, error: msg }), { status }),
  ),
  apiOk: jest.fn((data: unknown) =>
    new NextResponse(JSON.stringify({ data, error: null }), { status: 200 }),
  ),
}));

jest.mock('@/lib/auth/roles', () => ({
  guardAdmin: jest.fn(),
  guardMember: jest.fn(),
}));

jest.mock('@/lib/utils/webhook-delivery', () => ({
  dispatchWebhookEvent: jest.fn(),
}));

jest.mock('@/lib/automations/engine', () => ({
  runAutomations: jest.fn(),
}));

jest.mock('@/lib/utils/audit', () => ({
  logAction: jest.fn(),
}));

import { getProposalById, updateProposal, deleteProposal, getProposalDependencyCounts } from '@/lib/db/proposals';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';
import { guardAdmin, guardMember } from '@/lib/auth/roles';
import { dispatchWebhookEvent } from '@/lib/utils/webhook-delivery';
import { runAutomations } from '@/lib/automations/engine';
import { logAction } from '@/lib/utils/audit';

const mockGetProposal = getProposalById as jest.Mock;
const mockUpdateProposal = updateProposal as jest.Mock;
const mockDeleteProposal = deleteProposal as jest.Mock;
const mockGetDependencies = getProposalDependencyCounts as jest.Mock;
const mockAuth = requireAuth as jest.Mock;
const mockGuardAdmin = guardAdmin as jest.Mock;
const mockGuardMember = guardMember as jest.Mock;
const mockDispatchWebhook = dispatchWebhookEvent as jest.Mock;
const mockRunAutomations = runAutomations as jest.Mock;
const mockLogAction = logAction as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({});
  mockGuardAdmin.mockResolvedValue(null);
  mockGuardMember.mockResolvedValue(null);
});

const MOCK_PROPOSAL = {
  id: 'proposal-1',
  title: 'Website Redesign',
  description: 'Complete website overhaul',
  status: 'draft',
  amount: 5000,
  organizationId: 'org-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const PARAMS = Promise.resolve({ id: 'proposal-1' });

// ---------------------------------------------------------------------------
// GET Tests
// ---------------------------------------------------------------------------

describe('GET /api/proposals/[id]', () => {
  it('returns 200 with proposal data on success', async () => {
    mockGetProposal.mockResolvedValue({ data: MOCK_PROPOSAL, error: null });
    mockApiOk();

    await GET(new Request('http://localhost'), { params: PARAMS });

    expect(apiOk).toHaveBeenCalledWith(MOCK_PROPOSAL);
  });

  it('returns 404 when proposal not found', async () => {
    mockGetProposal.mockResolvedValue({ data: null, error: null });
    mockApiError();

    await GET(new Request('http://localhost'), { params: PARAMS });

    expect(apiError).toHaveBeenCalledWith('Proposal not found', 404);
  });
});

// ---------------------------------------------------------------------------
// PATCH Tests
// ---------------------------------------------------------------------------

function makePatchRequest(body: unknown): Request {
  return new Request('http://localhost', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/proposals/[id] — status change', () => {
  it('dispatches webhook and automation engine when status changes', async () => {
    const proposalUpdated = { ...MOCK_PROPOSAL, status: 'sent' };

    mockGetProposal.mockResolvedValue({ data: MOCK_PROPOSAL, error: null });
    mockUpdateProposal.mockResolvedValue({ data: proposalUpdated, error: null });
    mockApiOk();

    const req = makePatchRequest({ status: 'sent' });
    await PATCH(req, { params: PARAMS });

    // Verify webhook dispatch
    expect(mockDispatchWebhook).toHaveBeenCalledWith(
      'proposal.status_changed',
      expect.objectContaining({ status: 'sent', title: 'Website Redesign' }),
    );

    // Verify automation engine dispatch
    expect(mockRunAutomations).toHaveBeenCalledWith(
      'proposal.status_changed',
      expect.objectContaining({ status: 'sent' }),
    );

    // Verify audit log
    expect(mockLogAction).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'proposal',
        entityId: 'proposal-1',
        entityLabel: 'Website Redesign',
        action: 'status_changed',
        metadata: { to: 'sent' },
      }),
    );
  });

  it('skips automations when status does not change', async () => {
    mockGetProposal.mockResolvedValue({ data: MOCK_PROPOSAL, error: null });
    mockUpdateProposal.mockResolvedValue({ data: MOCK_PROPOSAL, error: null });
    mockApiOk();

    const req = makePatchRequest({ amount: 6000 }); // No status change
    await PATCH(req, { params: PARAMS });

    expect(mockDispatchWebhook).not.toHaveBeenCalled();
    expect(mockRunAutomations).not.toHaveBeenCalled();
    expect(mockLogAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'updated' }),
    );
  });

  it('returns 400 on invalid request body', async () => {
    mockApiError();
    const req = makePatchRequest({ status: 'not-a-valid-status' });

    await PATCH(req, { params: PARAMS });

    expect(apiError).toHaveBeenCalledWith(expect.any(String), 400);
  });

  it('returns 403 when user lacks member permission', async () => {
    const errorResponse = new NextResponse(
      JSON.stringify({ data: null, error: 'Forbidden' }),
      { status: 403 },
    );
    mockGuardMember.mockResolvedValue(errorResponse);

    const req = makePatchRequest({ status: 'sent' });
    const result = await PATCH(req, { params: PARAMS });

    expect(result.status).toBe(403);
    expect(mockDispatchWebhook).not.toHaveBeenCalled();
    expect(mockRunAutomations).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// DELETE Tests
// ---------------------------------------------------------------------------

describe('DELETE /api/proposals/[id]', () => {
  it('returns 200 with id on success when no linked projects', async () => {
    mockGetProposal.mockResolvedValue({ data: MOCK_PROPOSAL, error: null });
    mockGetDependencies.mockResolvedValue({ linkedProjects: 0, error: null });
    mockDeleteProposal.mockResolvedValue({ error: null });
    mockApiOk();

    await DELETE(new Request('http://localhost'), { params: PARAMS });

    expect(mockDeleteProposal).toHaveBeenCalled();
    expect(apiOk).toHaveBeenCalledWith({ id: 'proposal-1' });
    expect(mockLogAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'deleted' }),
    );
  });

  it('returns 409 when proposal has linked projects', async () => {
    mockGetProposal.mockResolvedValue({ data: MOCK_PROPOSAL, error: null });
    mockGetDependencies.mockResolvedValue({ linkedProjects: 1, error: null });
    mockApiError();

    await DELETE(new Request('http://localhost'), { params: PARAMS });

    expect(mockDeleteProposal).not.toHaveBeenCalled();
    expect(apiError).toHaveBeenCalledWith(expect.stringContaining('Cannot delete proposal'), 409);
  });

  it('returns 403 when user lacks admin permission', async () => {
    const errorResponse = new NextResponse(
      JSON.stringify({ data: null, error: 'Forbidden' }),
      { status: 403 },
    );
    mockGuardAdmin.mockResolvedValue(errorResponse);

    const result = await DELETE(new Request('http://localhost'), { params: PARAMS });

    expect(result.status).toBe(403);
    expect(mockDeleteProposal).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function mockApiOk() {
  (apiOk as jest.Mock).mockImplementation((data: unknown) =>
    new NextResponse(JSON.stringify({ data, error: null }), { status: 200 }),
  );
}

function mockApiError() {
  (apiError as jest.Mock).mockImplementation((msg: string, status: number) =>
    new NextResponse(JSON.stringify({ data: null, error: msg }), { status }),
  );
}
