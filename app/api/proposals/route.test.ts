/** @jest-environment node */
// Unit tests for app/api/proposals/route.ts
// Tests POST handler — verifies proposal.created webhook and automation are fired.
// All dependencies are mocked — no real DB, Clerk, or network calls.

import { POST } from './route';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/db/proposals', () => ({
  listProposals: jest.fn(),
  createProposal: jest.fn(),
}));

jest.mock('@/lib/api/utils', () => ({
  requireAuth: jest.fn(),
  apiError: jest.fn((msg: string, status: number) =>
    new NextResponse(JSON.stringify({ data: null, error: msg }), { status }),
  ),
  apiOk: jest.fn((data: unknown, status?: number) =>
    new NextResponse(JSON.stringify({ data, error: null }), { status: status ?? 200 }),
  ),
}));

jest.mock('@/lib/auth/roles', () => ({
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

jest.mock('@/lib/utils/notify-user', () => ({
  notifyIfEnabled: jest.fn(),
}));

import { createProposal } from '@/lib/db/proposals';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';
import { guardMember } from '@/lib/auth/roles';
import { dispatchWebhookEvent } from '@/lib/utils/webhook-delivery';
import { runAutomations } from '@/lib/automations/engine';
import { logAction } from '@/lib/utils/audit';
import { notifyIfEnabled } from '@/lib/utils/notify-user';

const mockCreateProposal  = createProposal as jest.Mock;
const mockAuth            = requireAuth as jest.Mock;
const mockGuardMember     = guardMember as jest.Mock;
const mockDispatchWebhook = dispatchWebhookEvent as jest.Mock;
const mockRunAutomations  = runAutomations as jest.Mock;
const mockLogAction       = logAction as jest.Mock;
const mockNotifyIfEnabled = notifyIfEnabled as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: 'user-1' });
  mockGuardMember.mockResolvedValue(null);
  mockNotifyIfEnabled.mockResolvedValue(undefined);
});

const MOCK_PROPOSAL = {
  id: 'proposal-1',
  title: 'Website Redesign',
  status: 'draft',
  organizationId: 'org-1',
  proposalNumber: 'PROP-20260325-1234',
  totalValue: 5000,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const ORG_UUID = '550e8400-e29b-41d4-a716-446655440000';

const VALID_BODY = {
  title: 'Website Redesign',
  status: 'draft',
  organizationId: ORG_UUID,
  totalValue: 5000,
  lineItems: [{ description: 'Design', quantity: 1, unitPrice: 5000, total: 5000 }],
};

function makePostRequest(body: unknown): Request {
  return new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// POST Tests
// ---------------------------------------------------------------------------

describe('POST /api/proposals', () => {
  it('fires proposal.created webhook and automation on successful creation', async () => {
    mockCreateProposal.mockResolvedValue({ data: MOCK_PROPOSAL, error: null });
    mockApiOk();

    await POST(makePostRequest(VALID_BODY));

    expect(mockDispatchWebhook).toHaveBeenCalledWith(
      'proposal.created',
      expect.objectContaining({ id: 'proposal-1', title: 'Website Redesign' }),
    );

    expect(mockRunAutomations).toHaveBeenCalledWith(
      'proposal.created',
      expect.objectContaining({ id: 'proposal-1' }),
    );

    expect(mockLogAction).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'proposal',
        entityId: 'proposal-1',
        action: 'created',
      }),
    );

    expect(mockNotifyIfEnabled).toHaveBeenCalledWith(
      'user-1',
      'newProposal',
      expect.objectContaining({ type: 'new_proposal', entityType: 'proposal', entityId: 'proposal-1' }),
    );
  });

  it('returns 201 with proposal data on success', async () => {
    mockCreateProposal.mockResolvedValue({ data: MOCK_PROPOSAL, error: null });
    mockApiOk();

    await POST(makePostRequest(VALID_BODY));

    expect(apiOk).toHaveBeenCalledWith(MOCK_PROPOSAL, 201);
  });

  it('returns 400 on invalid request body', async () => {
    mockApiError();

    await POST(makePostRequest({ title: '' }));

    expect(apiError).toHaveBeenCalledWith(expect.any(String), 400);
    expect(mockDispatchWebhook).not.toHaveBeenCalled();
    expect(mockRunAutomations).not.toHaveBeenCalled();
  });

  it('returns 500 when DB insert fails', async () => {
    mockCreateProposal.mockResolvedValue({ data: null, error: 'DB error' });
    mockApiError();

    await POST(makePostRequest(VALID_BODY));

    expect(apiError).toHaveBeenCalledWith('DB error', 500);
    expect(mockDispatchWebhook).not.toHaveBeenCalled();
    expect(mockRunAutomations).not.toHaveBeenCalled();
  });

  it('returns 403 when user lacks member permission', async () => {
    const errorResponse = new NextResponse(
      JSON.stringify({ data: null, error: 'Forbidden' }),
      { status: 403 },
    );
    mockGuardMember.mockResolvedValue(errorResponse);

    const result = await POST(makePostRequest(VALID_BODY));

    expect(result.status).toBe(403);
    expect(mockDispatchWebhook).not.toHaveBeenCalled();
    expect(mockRunAutomations).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockApiOk() {
  (apiOk as jest.Mock).mockImplementation((data: unknown, status?: number) =>
    new NextResponse(JSON.stringify({ data, error: null }), { status: status ?? 200 }),
  );
}

function mockApiError() {
  (apiError as jest.Mock).mockImplementation((msg: string, status: number) =>
    new NextResponse(JSON.stringify({ data: null, error: msg }), { status }),
  );
}
