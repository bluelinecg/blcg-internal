// Unit tests for lib/db/automations.ts
// Supabase serverClient is mocked — no real DB connection needed.

import {
  listAutomationRules,
  getAutomationRuleById,
  listActiveRulesByTrigger,
  createAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
  insertRunLog,
  getRunsForRule,
  getLastRunForEntity,
} from './automations';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

function makeChain(result: { data: unknown; error: unknown }) {
  const chain = {
    select:      jest.fn().mockReturnThis(),
    insert:      jest.fn().mockReturnThis(),
    update:      jest.fn().mockReturnThis(),
    delete:      jest.fn().mockReturnThis(),
    order:       jest.fn().mockReturnThis(),
    limit:       jest.fn().mockReturnThis(),
    eq:          jest.fn().mockReturnThis(),
    single:      jest.fn().mockResolvedValue(result),
    maybeSingle: jest.fn().mockResolvedValue(result),
    then: jest.fn().mockImplementation((resolve: (v: unknown) => unknown) =>
      Promise.resolve(resolve(result)),
    ),
  };
  return chain;
}

jest.mock('@/lib/db/supabase', () => ({ serverClient: jest.fn() }));
import { serverClient } from '@/lib/db/supabase';
const mockServerClient = serverClient as jest.Mock;

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const RULE_ROW = {
  id:             'rule-1',
  name:           'Alert on Stale Stage',
  description:    'Fires when item sits too long',
  is_active:      true,
  trigger_type:   'sla.stage_time_exceeded',
  trigger_config: { pipelineId: 'pl-1', stageId: 'st-1', thresholdHours: 48 },
  conditions:     [],
  actions:        [{ type: 'send_notification', config: { message: 'SLA exceeded' } }],
  created_by:     'user-abc',
  created_at:     '2026-01-01T00:00:00Z',
  updated_at:     '2026-01-01T00:00:00Z',
};

const RUN_LOG_ROW = {
  id:               'run-1',
  rule_id:          'rule-1',
  trigger_type:     'sla.stage_time_exceeded',
  entity_id:        'item-1',
  trigger_data:     { stageId: 'st-1' },
  status:           'success',
  error_message:    null,
  actions_executed: [{ type: 'send_notification', status: 'success' }],
  executed_at:      '2026-03-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// listAutomationRules
// ---------------------------------------------------------------------------

describe('listAutomationRules', () => {
  it('returns mapped rules on success', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: [RULE_ROW], error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await listAutomationRules();

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe('rule-1');
    expect(data![0].isActive).toBe(true);
    expect(data![0].triggerType).toBe('sla.stage_time_exceeded');
    expect(data![0].actions).toHaveLength(1);
  });

  it('returns error string on DB failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'DB error' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await listAutomationRules();

    expect(data).toBeNull();
    expect(error).toBe('DB error');
  });
});

// ---------------------------------------------------------------------------
// getAutomationRuleById
// ---------------------------------------------------------------------------

describe('getAutomationRuleById', () => {
  it('returns the rule when found', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: RULE_ROW, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await getAutomationRuleById('rule-1');

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.name).toBe('Alert on Stale Stage');
    expect(data!.description).toBe('Fires when item sits too long');
    expect(data!.triggerConfig).toEqual({ pipelineId: 'pl-1', stageId: 'st-1', thresholdHours: 48 });
  });

  it('returns error string on DB failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'Not found' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await getAutomationRuleById('nonexistent');

    expect(data).toBeNull();
    expect(error).toBe('Not found');
  });
});

// ---------------------------------------------------------------------------
// listActiveRulesByTrigger
// ---------------------------------------------------------------------------

describe('listActiveRulesByTrigger', () => {
  it('returns only active rules for the given trigger type', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: [RULE_ROW], error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await listActiveRulesByTrigger('sla.stage_time_exceeded');

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].triggerType).toBe('sla.stage_time_exceeded');
  });

  it('returns empty array when no rules match', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: [], error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await listActiveRulesByTrigger('task.completed');

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// createAutomationRule
// ---------------------------------------------------------------------------

describe('createAutomationRule', () => {
  it('returns the created rule on success', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: RULE_ROW, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await createAutomationRule(
      {
        name:          'Alert on Stale Stage',
        isActive:      true,
        triggerType:   'sla.stage_time_exceeded',
        triggerConfig: { pipelineId: 'pl-1', stageId: 'st-1', thresholdHours: 48 },
        conditions:    [],
        actions:       [{ type: 'send_notification', config: { message: 'SLA exceeded' } }],
      },
      'user-abc',
    );

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.createdBy).toBe('user-abc');
  });

  it('returns error string on DB failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'Insert failed' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await createAutomationRule(
      {
        name:           'Test',
        isActive:       true,
        triggerType:    'task.completed',
        triggerConfig:  {},
        conditions:     [],
        actions:        [{ type: 'create_task', config: { title: 'Follow up' } }],
      },
      'user-abc',
    );

    expect(data).toBeNull();
    expect(error).toBe('Insert failed');
  });
});

// ---------------------------------------------------------------------------
// updateAutomationRule
// ---------------------------------------------------------------------------

describe('updateAutomationRule', () => {
  it('returns updated rule on success', async () => {
    const updated = { ...RULE_ROW, name: 'Renamed Rule', is_active: false };
    const db = { from: jest.fn() };
    const chain = makeChain({ data: updated, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await updateAutomationRule('rule-1', { name: 'Renamed Rule', isActive: false });

    expect(error).toBeNull();
    expect(data!.name).toBe('Renamed Rule');
    expect(data!.isActive).toBe(false);
  });

  it('returns error string on DB failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'Update failed' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await updateAutomationRule('rule-1', { name: 'X' });

    expect(data).toBeNull();
    expect(error).toBe('Update failed');
  });
});

// ---------------------------------------------------------------------------
// deleteAutomationRule
// ---------------------------------------------------------------------------

describe('deleteAutomationRule', () => {
  it('returns null error on success', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { error } = await deleteAutomationRule('rule-1');

    expect(error).toBeNull();
  });

  it('returns error string on DB failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'Delete failed' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { error } = await deleteAutomationRule('rule-1');

    expect(error).toBe('Delete failed');
  });
});

// ---------------------------------------------------------------------------
// insertRunLog
// ---------------------------------------------------------------------------

describe('insertRunLog', () => {
  it('returns null error on successful insert', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { error } = await insertRunLog({
      ruleId:          'rule-1',
      triggerType:     'task.completed',
      entityId:        'task-1',
      triggerData:     { status: 'done' },
      status:          'success',
      actionsExecuted: [{ type: 'create_task', status: 'success' }],
    });

    expect(error).toBeNull();
  });

  it('returns error string on DB failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'Log write failed' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { error } = await insertRunLog({
      ruleId:          'rule-1',
      triggerType:     'task.completed',
      entityId:        'task-1',
      triggerData:     {},
      status:          'failed',
      errorMessage:    'Action timed out',
      actionsExecuted: [],
    });

    expect(error).toBe('Log write failed');
  });
});

// ---------------------------------------------------------------------------
// getRunsForRule
// ---------------------------------------------------------------------------

describe('getRunsForRule', () => {
  it('returns mapped run log entries', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: [RUN_LOG_ROW], error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await getRunsForRule('rule-1');

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].ruleId).toBe('rule-1');
    expect(data![0].status).toBe('success');
    expect(data![0].entityId).toBe('item-1');
  });

  it('returns error string on DB failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'Query failed' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await getRunsForRule('rule-1');

    expect(data).toBeNull();
    expect(error).toBe('Query failed');
  });
});

// ---------------------------------------------------------------------------
// getLastRunForEntity
// ---------------------------------------------------------------------------

describe('getLastRunForEntity', () => {
  it('returns the most recent success run for the entity', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: RUN_LOG_ROW, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await getLastRunForEntity('rule-1', 'item-1');

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.executedAt).toBe('2026-03-01T00:00:00Z');
  });

  it('returns null data (not error) when no prior run exists', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await getLastRunForEntity('rule-1', 'new-entity');

    expect(data).toBeNull();
    expect(error).toBeNull();
  });

  it('returns error string on DB failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'Dedup query failed' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await getLastRunForEntity('rule-1', 'item-1');

    expect(data).toBeNull();
    expect(error).toBe('Dedup query failed');
  });
});
