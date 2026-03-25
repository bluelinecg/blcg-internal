// Unit tests for lib/automations/engine.ts
// DB functions, conditions, and actions are all mocked.

import { runAutomations } from './engine';
import type { AutomationRule } from '@/lib/types/automations';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/db/automations', () => ({
  listActiveRulesByTrigger: jest.fn(),
  insertRunLog:             jest.fn(),
}));

jest.mock('./conditions', () => ({
  evaluateConditions: jest.fn(),
}));

jest.mock('./actions', () => ({
  executeAction: jest.fn(),
}));

import { listActiveRulesByTrigger, insertRunLog } from '@/lib/db/automations';
import { evaluateConditions }                     from './conditions';
import { executeAction }                          from './actions';

const mockListRules        = listActiveRulesByTrigger as jest.Mock;
const mockInsertRunLog     = insertRunLog             as jest.Mock;
const mockEvalConditions   = evaluateConditions       as jest.Mock;
const mockExecuteAction    = executeAction            as jest.Mock;

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const RULE: AutomationRule = {
  id:            'rule-1',
  name:          'On task done create follow-up',
  description:   undefined,
  isActive:      true,
  triggerType:   'task.completed',
  triggerConfig: {},
  conditions:    [],
  actions:       [{ type: 'create_task', config: { title: 'Follow up' } }],
  createdBy:     'user-1',
  createdAt:     '2026-01-01T00:00:00Z',
  updatedAt:     '2026-01-01T00:00:00Z',
};

const TRIGGER_DATA = { id: 'task-1', status: 'done', title: 'Build auth page' };

// ---------------------------------------------------------------------------
// runAutomations — happy path
// ---------------------------------------------------------------------------

describe('runAutomations — success path', () => {
  it('executes actions and writes a success run log', async () => {
    mockListRules.mockResolvedValue({ data: [RULE], error: null });
    mockEvalConditions.mockReturnValue(true);
    mockExecuteAction.mockResolvedValue({ type: 'create_task', status: 'success' });
    mockInsertRunLog.mockResolvedValue({ error: null });

    await runAutomations('task.completed', TRIGGER_DATA);

    expect(mockEvalConditions).toHaveBeenCalledWith(RULE.conditions, TRIGGER_DATA);
    expect(mockExecuteAction).toHaveBeenCalledWith(RULE.actions[0], TRIGGER_DATA);
    expect(mockInsertRunLog).toHaveBeenCalledWith(
      expect.objectContaining({ ruleId: 'rule-1', status: 'success', entityId: 'task-1' }),
    );
  });
});

// ---------------------------------------------------------------------------
// runAutomations — conditions not met
// ---------------------------------------------------------------------------

describe('runAutomations — conditions not met', () => {
  it('writes a skipped run log and does not execute actions', async () => {
    mockListRules.mockResolvedValue({ data: [RULE], error: null });
    mockEvalConditions.mockReturnValue(false);
    mockInsertRunLog.mockResolvedValue({ error: null });

    await runAutomations('task.completed', TRIGGER_DATA);

    expect(mockExecuteAction).not.toHaveBeenCalled();
    expect(mockInsertRunLog).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'skipped' }),
    );
  });
});

// ---------------------------------------------------------------------------
// runAutomations — action fails
// ---------------------------------------------------------------------------

describe('runAutomations — action failure', () => {
  it('writes a failed run log with error message', async () => {
    mockListRules.mockResolvedValue({ data: [RULE], error: null });
    mockEvalConditions.mockReturnValue(true);
    mockExecuteAction.mockResolvedValue({ type: 'create_task', status: 'failed', error: 'DB insert failed' });
    mockInsertRunLog.mockResolvedValue({ error: null });

    await runAutomations('task.completed', TRIGGER_DATA);

    expect(mockInsertRunLog).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', errorMessage: 'DB insert failed' }),
    );
  });

  it('stops executing further actions after the first failure', async () => {
    const ruleWithTwoActions: AutomationRule = {
      ...RULE,
      actions: [
        { type: 'create_task',   config: { title: 'Task 1' } },
        { type: 'send_notification', config: { message: 'Done' } },
      ],
    };
    mockListRules.mockResolvedValue({ data: [ruleWithTwoActions], error: null });
    mockEvalConditions.mockReturnValue(true);
    mockExecuteAction
      .mockResolvedValueOnce({ type: 'create_task', status: 'failed', error: 'fail' })
      .mockResolvedValueOnce({ type: 'send_notification', status: 'success' });
    mockInsertRunLog.mockResolvedValue({ error: null });

    await runAutomations('task.completed', TRIGGER_DATA);

    expect(mockExecuteAction).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// runAutomations — no active rules
// ---------------------------------------------------------------------------

describe('runAutomations — no active rules', () => {
  it('returns without calling any other function', async () => {
    mockListRules.mockResolvedValue({ data: [], error: null });

    await runAutomations('task.completed', TRIGGER_DATA);

    expect(mockEvalConditions).not.toHaveBeenCalled();
    expect(mockExecuteAction).not.toHaveBeenCalled();
    expect(mockInsertRunLog).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// runAutomations — DB error on listActiveRules
// ---------------------------------------------------------------------------

describe('runAutomations — DB error fetching rules', () => {
  it('returns silently without throwing', async () => {
    mockListRules.mockResolvedValue({ data: null, error: 'DB unavailable' });

    await expect(runAutomations('task.completed', TRIGGER_DATA)).resolves.toBeUndefined();

    expect(mockEvalConditions).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// runAutomations — unexpected thrown error
// ---------------------------------------------------------------------------

describe('runAutomations — unexpected error', () => {
  it('never throws — catches top-level errors and returns void', async () => {
    mockListRules.mockRejectedValue(new Error('Catastrophic failure'));

    await expect(runAutomations('task.completed', TRIGGER_DATA)).resolves.toBeUndefined();
  });

  it('continues processing remaining rules when one rule throws', async () => {
    const rule2: AutomationRule = { ...RULE, id: 'rule-2', name: 'Rule 2' };
    mockListRules.mockResolvedValue({ data: [RULE, rule2], error: null });
    mockEvalConditions.mockReturnValue(true);
    // First rule's action throws unexpectedly
    mockExecuteAction
      .mockRejectedValueOnce(new Error('Rule 1 crash'))
      .mockResolvedValueOnce({ type: 'create_task', status: 'success' });
    mockInsertRunLog.mockResolvedValue({ error: null });

    await expect(runAutomations('task.completed', TRIGGER_DATA)).resolves.toBeUndefined();

    // Second rule should still have been attempted via insertRunLog
    expect(mockInsertRunLog).toHaveBeenCalledTimes(1);
  });
});
