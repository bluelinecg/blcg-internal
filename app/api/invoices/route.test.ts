/** @jest-environment node */
// Unit tests for app/api/invoices/route.ts
// Tests POST handler — verifies invoice.created webhook is fired on creation.
// All dependencies are mocked — no real DB, Clerk, or network calls.

import { POST } from './route';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/db/finances', () => ({
  listInvoices:  jest.fn(),
  createInvoice: jest.fn(),
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
  guardAdmin: jest.fn(),
}));

jest.mock('@/lib/utils/webhook-delivery', () => ({
  dispatchWebhookEvent: jest.fn(),
}));

jest.mock('@/lib/utils/audit', () => ({
  logAction: jest.fn(),
}));

import { createInvoice } from '@/lib/db/finances';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';
import { guardAdmin } from '@/lib/auth/roles';
import { dispatchWebhookEvent } from '@/lib/utils/webhook-delivery';
import { logAction } from '@/lib/utils/audit';

const mockCreateInvoice   = createInvoice as jest.Mock;
const mockAuth            = requireAuth as jest.Mock;
const mockGuardAdmin      = guardAdmin as jest.Mock;
const mockDispatchWebhook = dispatchWebhookEvent as jest.Mock;
const mockLogAction       = logAction as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({});
  mockGuardAdmin.mockResolvedValue(null);
});

const MOCK_INVOICE = {
  id: 'invoice-1',
  invoiceNumber: 'BL-2026-001',
  status: 'draft',
  organizationId: '00000000-0000-0000-0000-000000000001',
  totalValue: 5000,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const ORG_UUID = '550e8400-e29b-41d4-a716-446655440000';

const VALID_BODY = {
  organizationId: ORG_UUID,
  invoiceNumber: 'BL-2026-001',
  status: 'draft',
  dueDate: '2026-02-01T00:00:00Z',
  subtotal: 5000,
  total: 5000,
  lineItems: [{ description: 'Services', total: 5000 }],
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

describe('POST /api/invoices', () => {
  it('fires invoice.created webhook on successful creation', async () => {
    mockCreateInvoice.mockResolvedValue({ data: MOCK_INVOICE, error: null });
    mockApiOk();

    await POST(makePostRequest(VALID_BODY));

    expect(mockDispatchWebhook).toHaveBeenCalledWith(
      'invoice.created',
      expect.objectContaining({ id: 'invoice-1', invoiceNumber: 'BL-2026-001' }),
    );

    expect(mockLogAction).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'invoice',
        entityId: 'invoice-1',
        action: 'created',
      }),
    );
  });

  it('returns 201 with invoice data on success', async () => {
    mockCreateInvoice.mockResolvedValue({ data: MOCK_INVOICE, error: null });
    mockApiOk();

    await POST(makePostRequest(VALID_BODY));

    expect(apiOk).toHaveBeenCalledWith(MOCK_INVOICE, 201);
  });

  it('returns 400 on invalid request body', async () => {
    mockApiError();

    await POST(makePostRequest({ invoiceNumber: '' }));

    expect(apiError).toHaveBeenCalledWith(expect.any(String), 400);
    expect(mockDispatchWebhook).not.toHaveBeenCalled();
  });

  it('returns 500 when DB insert fails', async () => {
    mockCreateInvoice.mockResolvedValue({ data: null, error: 'DB error' });
    mockApiError();

    await POST(makePostRequest(VALID_BODY));

    expect(apiError).toHaveBeenCalledWith('DB error', 500);
    expect(mockDispatchWebhook).not.toHaveBeenCalled();
  });

  it('returns 403 when user lacks admin permission', async () => {
    const errorResponse = new NextResponse(
      JSON.stringify({ data: null, error: 'Forbidden' }),
      { status: 403 },
    );
    mockGuardAdmin.mockResolvedValue(errorResponse);

    const result = await POST(makePostRequest(VALID_BODY));

    expect(result.status).toBe(403);
    expect(mockDispatchWebhook).not.toHaveBeenCalled();
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
