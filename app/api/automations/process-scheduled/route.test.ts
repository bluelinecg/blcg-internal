// Unit tests for app/api/automations/process-scheduled/route.ts
// Tests auth guard, SLA dedup, and summary counts.
// All dependencies are mocked.

import { POST } from './route';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/db/automations', () => ({
  listActiveRulesByTrigger: jest.fn(),
  getLastRunForEntity:      jest.fn(),
}));

jest.mock('@/lib/db/supabase', () => ({ serverClient: jest.fn() }));

jest.mock('@/lib/automations/engine', () => ({
  runAutomations: jest.fn(),
}));

jest.mock('@/lib/config', () => ({
  config: { cronSecret: 'test-secret' },
}));

import { listActiveRulesByTrigger, getLastRunForEntity } from '@/lib/db/automations';
import { serverClient }                                  from '@/lib/db/supabase';
import { runAutomations }                                from '@/lib/automations/engine';

const mockListRules      = listActiveRulesByTrigger as jest.Mock;
const mockLastRun        = getLastRunForEntity      as jest.Mock;
const mockServerClient   = serverClient             as jest.Mock;
const mockRunAutomations = runAutomations            as jest.Mock;

function makeCronRequest(secret = 'test-secret'): Request {
  return new Request('http://localhost/api/automations/process-scheduled', {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}` },
  });
}

function makeDbChain(result: { data: unknown; error: unknown }) {
  const chain = {
    select:  jest.fn().mockReturnThis(),
    eq:      jest.fn().mockReturnThis(),
    not:     jest.fn().mockReturnThis(),
    lt:      jest.fn().mockReturnThis(),
    neq:     jest.fn().mockReturnThis(),
    then:    jest.fn().mockImplementation((resolve: (v: unknown) => unknown) =>
      Promise.resolve(resolve(result))),
  };
  return chain;
}

beforeEach(() => jest.clearAllMocks());

const SLA_STAGE_RULE = {
  id:            'rule-sla',
  name:          'Stale Stage Alert',
  isActive:      true,
  triggerType:   'sla.stage_time_exceeded',
  triggerConfig: { pipelineId: 'pl-1', stageId: 'st-1', thresholdHours: 48 },
  conditions:    [],
  actions:       [{ type: 'send_notification', config: {} }],
  createdBy:     'user-1',
  createdAt:     '2026-01-01T00:00:00Z',
  updatedAt:     '2026-01-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

describe('POST /api/automations/process-scheduled — auth', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const req = new Request('http://localhost/api/automations/process-scheduled', {
      method: 'POST',
    });

    const res = await POST(req);
    const body = await res.json() as { error: string };

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when secret is wrong', async () => {
    const res = await POST(makeCronRequest('wrong-secret'));
    const body = await res.json() as { error: string };

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });
});

// ---------------------------------------------------------------------------
// No rules
// ---------------------------------------------------------------------------

describe('POST /api/automations/process-scheduled — no rules', () => {
  it('returns 200 with zero counts when no active rules exist', async () => {
    mockListRules.mockResolvedValue({ data: [], error: null });

    const res  = await POST(makeCronRequest());
    const body = await res.json() as { rulesChecked: number; entitiesEvaluated: number; actionsTriggered: number };

    expect(res.status).toBe(200);
    expect(body.rulesChecked).toBe(0);
    expect(body.entitiesEvaluated).toBe(0);
    expect(body.actionsTriggered).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// SLA stage — dedup prevents re-fire
// ---------------------------------------------------------------------------

describe('POST /api/automations/process-scheduled — SLA stage dedup', () => {
  it('skips item when last run is newer than entered_stage_at', async () => {
    // Only sla.stage_time_exceeded has a rule; others return empty
    mockListRules.mockImplementation((type: string) => {
      if (type === 'sla.stage_time_exceeded') {
        return Promise.resolve({ data: [SLA_STAGE_RULE], error: null });
      }
      return Promise.resolve({ data: [], error: null });
    });

    // DB returns one stale item
    const staleItem = {
      id: 'item-1', stage_id: 'st-1', pipeline_id: 'pl-1',
      entered_stage_at: '2026-01-01T00:00:00Z', title: 'Deal X',
    };
    const db = { from: jest.fn() };
    const chain = makeDbChain({ data: [staleItem], error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    // Last run is AFTER entered_stage_at — should be skipped
    mockLastRun.mockResolvedValue({
      data: { executedAt: '2026-02-01T00:00:00Z' },
      error: null,
    });
    mockRunAutomations.mockResolvedValue(undefined);

    const res  = await POST(makeCronRequest());
    const body = await res.json() as { rulesChecked: number; actionsTriggered: number };

    expect(res.status).toBe(200);
    expect(body.rulesChecked).toBe(1);
    expect(body.actionsTriggered).toBe(0);
    expect(mockRunAutomations).not.toHaveBeenCalled();
  });

  it('triggers action when no prior run exists for item', async () => {
    mockListRules.mockImplementation((type: string) => {
      if (type === 'sla.stage_time_exceeded') {
        return Promise.resolve({ data: [SLA_STAGE_RULE], error: null });
      }
      return Promise.resolve({ data: [], error: null });
    });

    const staleItem = {
      id: 'item-2', stage_id: 'st-1', pipeline_id: 'pl-1',
      entered_stage_at: '2026-01-01T00:00:00Z', title: 'Deal Y',
    };
    const db = { from: jest.fn() };
    const chain = makeDbChain({ data: [staleItem], error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    // No prior run
    mockLastRun.mockResolvedValue({ data: null, error: null });
    mockRunAutomations.mockResolvedValue(undefined);

    const res  = await POST(makeCronRequest());
    const body = await res.json() as { actionsTriggered: number };

    expect(res.status).toBe(200);
    expect(body.actionsTriggered).toBe(1);
    expect(mockRunAutomations).toHaveBeenCalledWith(
      'sla.stage_time_exceeded',
      expect.objectContaining({ id: 'item-2', pipelineId: 'pl-1' }),
    );
  });
});
