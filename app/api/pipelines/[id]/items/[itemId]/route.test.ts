// Unit tests for app/api/pipelines/[id]/items/[itemId]/route.ts
// Tests GET, PATCH, DELETE handlers with automation engine and webhook dispatch.
// All dependencies are mocked — no real DB, Clerk, or network calls.

import { GET, PATCH, DELETE } from './route';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/db/pipelines', () => ({
  getItemById: jest.fn(),
  updateItem: jest.fn(),
  deleteItem: jest.fn(),
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

import { getItemById, updateItem, deleteItem } from '@/lib/db/pipelines';
import { requireAuth, apiError, apiOk } from '@/lib/api/utils';
import { guardAdmin, guardMember } from '@/lib/auth/roles';
import { dispatchWebhookEvent } from '@/lib/utils/webhook-delivery';
import { runAutomations } from '@/lib/automations/engine';
import { logAction } from '@/lib/utils/audit';

const mockGetItem = getItemById as jest.Mock;
const mockUpdateItem = updateItem as jest.Mock;
const mockDeleteItem = deleteItem as jest.Mock;
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

const MOCK_ITEM = {
  id: 'item-1',
  pipelineId: 'pipeline-1',
  stageId: 'stage-1',
  title: 'Test Item',
  description: 'Test Description',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const PARAMS = Promise.resolve({ id: 'pipeline-1', itemId: 'item-1' });

// ---------------------------------------------------------------------------
// GET Tests
// ---------------------------------------------------------------------------

describe('GET /api/pipelines/[id]/items/[itemId]', () => {
  it('returns 200 with item data on success', async () => {
    mockGetItem.mockResolvedValue({ data: MOCK_ITEM, error: null });
    mockApiOk();

    await GET(new Request('http://localhost'), { params: PARAMS });

    expect(apiOk).toHaveBeenCalledWith(MOCK_ITEM);
  });

  it('returns 404 when item not found', async () => {
    mockGetItem.mockResolvedValue({ data: null, error: null });
    mockApiError();

    await GET(new Request('http://localhost'), { params: PARAMS });

    expect(apiError).toHaveBeenCalledWith('Item not found', 404);
  });

  it('returns 401 when not authenticated', async () => {
    const errorResponse = new NextResponse(
      JSON.stringify({ data: null, error: 'Unauthorised' }),
      { status: 401 },
    );
    mockAuth.mockResolvedValue(errorResponse);

    const result = await GET(new Request('http://localhost'), { params: PARAMS });

    expect(result.status).toBe(401);
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

describe('PATCH /api/pipelines/[id]/items/[itemId] — stage change', () => {
  it('dispatches webhook and automation engine when stage changes', async () => {
    const previousItem = { ...MOCK_ITEM, stageId: 'stage-1' };
    const updatedItem = { ...MOCK_ITEM, stageId: 'stage-2' };

    mockGetItem.mockResolvedValue({ data: previousItem, error: null });
    mockUpdateItem.mockResolvedValue({ data: updatedItem, error: null });
    mockApiOk();

    const req = makePatchRequest({ stageId: 'stage-2' });
    await PATCH(req, { params: PARAMS });

    // Verify webhook dispatch
    expect(mockDispatchWebhook).toHaveBeenCalledWith(
      'pipeline.item_stage_changed',
      expect.objectContaining({
        id: 'item-1',
        itemId: 'item-1',
        pipelineId: 'pipeline-1',
        stageId: 'stage-2',
        previousStageId: 'stage-1',
        title: 'Test Item',
      }),
    );

    // Verify automation engine dispatch
    expect(mockRunAutomations).toHaveBeenCalledWith(
      'pipeline.item_stage_changed',
      expect.objectContaining({
        id: 'item-1',
        itemId: 'item-1',
        pipelineId: 'pipeline-1',
        stageId: 'stage-2',
        previousStageId: 'stage-1',
        title: 'Test Item',
      }),
    );

    // Verify audit log
    expect(mockLogAction).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'pipeline_item',
        entityId: 'item-1',
        entityLabel: 'Test Item',
        action: 'status_changed',
        metadata: { to: 'stage-2', from: 'stage-1' },
      }),
    );
  });

  it('logs audit action but skips automation when stage does not change', async () => {
    mockGetItem.mockResolvedValue({ data: MOCK_ITEM, error: null });
    mockUpdateItem.mockResolvedValue({ data: MOCK_ITEM, error: null });
    mockApiOk();

    const req = makePatchRequest({ title: 'Updated Title' }); // stageId not changing
    await PATCH(req, { params: PARAMS });

    expect(mockDispatchWebhook).not.toHaveBeenCalled();
    expect(mockRunAutomations).not.toHaveBeenCalled();
    expect(mockLogAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'updated',
        entityType: 'pipeline_item',
      }),
    );
  });

  it('returns 400 on invalid request body', async () => {
    mockApiError();
    const req = makePatchRequest({ invalidField: 'value' });

    await PATCH(req, { params: PARAMS });

    expect(apiError).toHaveBeenCalledWith(expect.any(String), 400);
  });

  it('returns 403 when user lacks member permission', async () => {
    const errorResponse = new NextResponse(
      JSON.stringify({ data: null, error: 'Forbidden' }),
      { status: 403 },
    );
    mockGuardMember.mockResolvedValue(errorResponse);

    const req = makePatchRequest({ stageId: 'stage-2' });
    const result = await PATCH(req, { params: PARAMS });

    expect(result.status).toBe(403);
    expect(mockDispatchWebhook).not.toHaveBeenCalled();
    expect(mockRunAutomations).not.toHaveBeenCalled();
  });

  it('returns 404 when item not found after update', async () => {
    mockGetItem.mockResolvedValue({ data: MOCK_ITEM, error: null });
    mockUpdateItem.mockResolvedValue({ data: null, error: null });
    mockApiError();

    const req = makePatchRequest({ stageId: 'stage-2' });
    await PATCH(req, { params: PARAMS });

    expect(apiError).toHaveBeenCalledWith('Item not found', 404);
  });
});

// ---------------------------------------------------------------------------
// DELETE Tests
// ---------------------------------------------------------------------------

describe('DELETE /api/pipelines/[id]/items/[itemId]', () => {
  it('returns 200 with item id on success', async () => {
    mockDeleteItem.mockResolvedValue({ error: null });
    mockApiOk();

    await DELETE(new Request('http://localhost'), { params: PARAMS });

    expect(apiOk).toHaveBeenCalledWith({ id: 'item-1' });
  });

  it('returns 403 when user lacks admin permission', async () => {
    const errorResponse = new NextResponse(
      JSON.stringify({ data: null, error: 'Forbidden' }),
      { status: 403 },
    );
    mockGuardAdmin.mockResolvedValue(errorResponse);

    const result = await DELETE(new Request('http://localhost'), { params: PARAMS });

    expect(result.status).toBe(403);
    expect(mockDeleteItem).not.toHaveBeenCalled();
  });

  it('returns 401 when not authenticated', async () => {
    const errorResponse = new NextResponse(
      JSON.stringify({ data: null, error: 'Unauthorised' }),
      { status: 401 },
    );
    mockAuth.mockResolvedValue(errorResponse);

    const result = await DELETE(new Request('http://localhost'), { params: PARAMS });

    expect(result.status).toBe(401);
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
