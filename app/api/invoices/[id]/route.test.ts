/** @jest-environment node */
// Unit tests for app/api/invoices/[id]/route.ts
// Tests PATCH handler — verifies invoice.status_changed webhook and automation are fired.
// All dependencies are mocked — no real DB, Clerk, or network calls.

import { GET, PATCH, DELETE } from './route';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/db/finances', () => ({
  getInvoiceById: jest.fn(),
  updateInvoice:  jest.fn(),
  deleteInvoice:  jest.fn(),
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

import { getInvoiceById, updateInvoice, deleteInvoice } from '@/lib/db/finances';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';
import { guardAdmin } from '@/lib/auth/roles';
import { dispatchWebhookEvent } from '@/lib/utils/webhook-delivery';
import { runAutomations } from '@/lib/automations/engine';
import { logAction } from '@/lib/utils/audit';
import { notifyIfEnabled } from '@/lib/utils/notify-user';

const mockGetInvoice      = getInvoiceById as jest.Mock;
const mockUpdateInvoice   = updateInvoice as jest.Mock;
const mockDeleteInvoice   = deleteInvoice as jest.Mock;
const mockAuth            = requireAuth as jest.Mock;
const mockGuardAdmin      = guardAdmin as jest.Mock;
const mockDispatchWebhook = dispatchWebhookEvent as jest.Mock;
const mockRunAutomations  = runAutomations as jest.Mock;
const mockLogAction       = logAction as jest.Mock;
const mockNotifyIfEnabled = notifyIfEnabled as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: 'user-1' });
  mockGuardAdmin.mockResolvedValue(null);
  mockNotifyIfEnabled.mockResolvedValue(undefined);
});

const MOCK_INVOICE = {
  id: 'invoice-1',
  invoiceNumber: 'BL-2026-001',
  status: 'draft',
  organizationId: 'org-1',
  totalValue: 5000,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const PARAMS = Promise.resolve({ id: 'invoice-1' });

function makePatchRequest(body: unknown): Request {
  return new Request('http://localhost', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// GET Tests
// ---------------------------------------------------------------------------

describe('GET /api/invoices/[id]', () => {
  it('returns 200 with invoice data on success', async () => {
    mockGetInvoice.mockResolvedValue({ data: MOCK_INVOICE, error: null });
    mockApiOk();

    await GET(new Request('http://localhost'), { params: PARAMS });

    expect(apiOk).toHaveBeenCalledWith(MOCK_INVOICE);
  });

  it('returns 404 when invoice not found', async () => {
    mockGetInvoice.mockResolvedValue({ data: null, error: null });
    mockApiError();

    await GET(new Request('http://localhost'), { params: PARAMS });

    expect(apiError).toHaveBeenCalledWith('Invoice not found', 404);
  });
});

// ---------------------------------------------------------------------------
// PATCH Tests
// ---------------------------------------------------------------------------

describe('PATCH /api/invoices/[id] — status change', () => {
  it('fires invoice.status_changed webhook and automation when status changes', async () => {
    const invoiceUpdated = { ...MOCK_INVOICE, status: 'sent' };
    mockUpdateInvoice.mockResolvedValue({ data: invoiceUpdated, error: null });
    mockApiOk();

    await PATCH(makePatchRequest({ status: 'sent' }), { params: PARAMS });

    expect(mockDispatchWebhook).toHaveBeenCalledWith(
      'invoice.status_changed',
      expect.objectContaining({ status: 'sent', invoiceNumber: 'BL-2026-001' }),
    );

    expect(mockRunAutomations).toHaveBeenCalledWith(
      'invoice.status_changed',
      expect.objectContaining({ status: 'sent' }),
    );

    expect(mockLogAction).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'invoice',
        entityId: 'invoice-1',
        action: 'status_changed',
        metadata: { to: 'sent' },
      }),
    );
  });

  it('fires invoicePaid notification when status changes to paid', async () => {
    const invoicePaid = { ...MOCK_INVOICE, status: 'paid' };
    mockUpdateInvoice.mockResolvedValue({ data: invoicePaid, error: null });
    mockApiOk();

    await PATCH(makePatchRequest({ status: 'paid' }), { params: PARAMS });

    expect(mockNotifyIfEnabled).toHaveBeenCalledWith(
      'user-1',
      'invoicePaid',
      expect.objectContaining({ type: 'invoice_paid', entityType: 'invoice', entityId: 'invoice-1' }),
    );
  });

  it('fires invoiceOverdue notification when status changes to overdue', async () => {
    const invoiceOverdue = { ...MOCK_INVOICE, status: 'overdue' };
    mockUpdateInvoice.mockResolvedValue({ data: invoiceOverdue, error: null });
    mockApiOk();

    await PATCH(makePatchRequest({ status: 'overdue' }), { params: PARAMS });

    expect(mockNotifyIfEnabled).toHaveBeenCalledWith(
      'user-1',
      'invoiceOverdue',
      expect.objectContaining({ type: 'invoice_overdue', entityType: 'invoice', entityId: 'invoice-1' }),
    );
  });

  it('skips notification when status changes to non-notifiable value', async () => {
    const invoiceSent = { ...MOCK_INVOICE, status: 'sent' };
    mockUpdateInvoice.mockResolvedValue({ data: invoiceSent, error: null });
    mockApiOk();

    await PATCH(makePatchRequest({ status: 'sent' }), { params: PARAMS });

    expect(mockNotifyIfEnabled).not.toHaveBeenCalled();
  });

  it('skips webhook and automation when status does not change', async () => {
    mockUpdateInvoice.mockResolvedValue({ data: MOCK_INVOICE, error: null });
    mockApiOk();

    await PATCH(makePatchRequest({ totalValue: 6000 }), { params: PARAMS });

    expect(mockDispatchWebhook).not.toHaveBeenCalled();
    expect(mockRunAutomations).not.toHaveBeenCalled();
    expect(mockNotifyIfEnabled).not.toHaveBeenCalled();
    expect(mockLogAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'updated' }),
    );
  });

  it('returns 400 on invalid request body', async () => {
    mockApiError();

    await PATCH(makePatchRequest({ status: 'not-a-valid-status' }), { params: PARAMS });

    expect(apiError).toHaveBeenCalledWith(expect.any(String), 400);
    expect(mockDispatchWebhook).not.toHaveBeenCalled();
    expect(mockRunAutomations).not.toHaveBeenCalled();
  });

  it('returns 403 when user lacks admin permission', async () => {
    const errorResponse = new NextResponse(
      JSON.stringify({ data: null, error: 'Forbidden' }),
      { status: 403 },
    );
    mockGuardAdmin.mockResolvedValue(errorResponse);

    const result = await PATCH(makePatchRequest({ status: 'sent' }), { params: PARAMS });

    expect(result.status).toBe(403);
    expect(mockDispatchWebhook).not.toHaveBeenCalled();
    expect(mockRunAutomations).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// DELETE Tests
// ---------------------------------------------------------------------------

describe('DELETE /api/invoices/[id]', () => {
  it('returns 200 with id on success when invoice is deletable', async () => {
    const draftInvoice = { ...MOCK_INVOICE, status: 'draft' };
    mockGetInvoice.mockResolvedValue({ data: draftInvoice, error: null });
    mockDeleteInvoice.mockResolvedValue({ error: null });
    mockApiOk();

    await DELETE(new Request('http://localhost'), { params: PARAMS });

    expect(mockDeleteInvoice).toHaveBeenCalled();
    expect(apiOk).toHaveBeenCalledWith({ id: 'invoice-1' });
    expect(mockLogAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'deleted' }),
    );
  });

  it('returns 409 when invoice status blocks deletion', async () => {
    const sentInvoice = { ...MOCK_INVOICE, status: 'sent' };
    mockGetInvoice.mockResolvedValue({ data: sentInvoice, error: null });
    mockApiError();

    await DELETE(new Request('http://localhost'), { params: PARAMS });

    expect(mockDeleteInvoice).not.toHaveBeenCalled();
    expect(apiError).toHaveBeenCalledWith(expect.stringContaining('Cannot delete invoice'), 409);
  });

  it('returns 403 when user lacks admin permission', async () => {
    const errorResponse = new NextResponse(
      JSON.stringify({ data: null, error: 'Forbidden' }),
      { status: 403 },
    );
    mockGuardAdmin.mockResolvedValue(errorResponse);

    const result = await DELETE(new Request('http://localhost'), { params: PARAMS });

    expect(result.status).toBe(403);
    expect(mockDeleteInvoice).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Helpers
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
