// Unit tests for lib/automations/actions.ts
// All lib/db and lib/utils dependencies are mocked.

import { executeAction } from './actions';
import type { AutomationAction } from '@/lib/types/automations';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/db/tasks',     () => ({ createTask:     jest.fn() }));
jest.mock('@/lib/db/pipelines', () => ({ updateItem:     jest.fn() }));
jest.mock('@/lib/db/proposals', () => ({ updateProposal: jest.fn() }));
jest.mock('@/lib/utils/webhook-delivery', () => ({ dispatchWebhookEvent: jest.fn() }));

import { createTask }           from '@/lib/db/tasks';
import { updateItem }           from '@/lib/db/pipelines';
import { updateProposal }       from '@/lib/db/proposals';
import { dispatchWebhookEvent } from '@/lib/utils/webhook-delivery';

const mockCreateTask         = createTask         as jest.Mock;
const mockUpdateItem         = updateItem         as jest.Mock;
const mockUpdateProposal     = updateProposal     as jest.Mock;
const mockDispatchWebhook    = dispatchWebhookEvent as jest.Mock;

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// create_task
// ---------------------------------------------------------------------------

describe('executeAction — create_task', () => {
  const action: AutomationAction = {
    type:   'create_task',
    config: { title: 'Follow up on {{item.title}}', priority: 'high' },
  };

  it('creates a task and returns success', async () => {
    mockCreateTask.mockResolvedValue({ data: { id: 't-1' }, error: null });

    const result = await executeAction(action, { title: 'Deal X', id: 'item-1' });

    expect(result.status).toBe('success');
    expect(result.type).toBe('create_task');
    expect(mockCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Follow up on Deal X', priority: 'high' }),
    );
  });

  it('returns failed when DB returns error', async () => {
    mockCreateTask.mockResolvedValue({ data: null, error: 'Insert failed' });

    const result = await executeAction(action, { title: 'Deal X', id: 'item-1' });

    expect(result.status).toBe('failed');
    expect(result.error).toBe('Insert failed');
  });
});

// ---------------------------------------------------------------------------
// move_to_stage
// ---------------------------------------------------------------------------

describe('executeAction — move_to_stage', () => {
  const action: AutomationAction = {
    type:   'move_to_stage',
    config: { stageId: 'stage-closed' },
  };

  it('calls updateItem with stageId and returns success', async () => {
    mockUpdateItem.mockResolvedValue({ data: {}, error: null });

    const result = await executeAction(action, { itemId: 'item-1' });

    expect(result.status).toBe('success');
    expect(mockUpdateItem).toHaveBeenCalledWith('item-1', { stageId: 'stage-closed' });
  });

  it('returns failed when itemId is missing', async () => {
    const result = await executeAction(action, {});

    expect(result.status).toBe('failed');
    expect(result.error).toMatch(/missing/i);
  });

  it('returns failed when DB returns error', async () => {
    mockUpdateItem.mockResolvedValue({ data: null, error: 'Stage not found' });

    const result = await executeAction(action, { itemId: 'item-1' });

    expect(result.status).toBe('failed');
    expect(result.error).toBe('Stage not found');
  });
});

// ---------------------------------------------------------------------------
// assign_user
// ---------------------------------------------------------------------------

describe('executeAction — assign_user', () => {
  const action: AutomationAction = {
    type:   'assign_user',
    config: { userId: 'user-ryan' },
  };

  it('calls updateItem with assigneeId and returns success', async () => {
    mockUpdateItem.mockResolvedValue({ data: {}, error: null });

    const result = await executeAction(action, { id: 'item-1' });

    expect(result.status).toBe('success');
    expect(mockUpdateItem).toHaveBeenCalledWith('item-1', { assigneeId: 'user-ryan' });
  });

  it('returns failed when userId is missing', async () => {
    const actionNoUser: AutomationAction = { type: 'assign_user', config: {} };
    const result = await executeAction(actionNoUser, { id: 'item-1' });

    expect(result.status).toBe('failed');
    expect(result.error).toMatch(/missing/i);
  });
});

// ---------------------------------------------------------------------------
// update_status — proposal context
// ---------------------------------------------------------------------------

describe('executeAction — update_status (proposal)', () => {
  const action: AutomationAction = {
    type:   'update_status',
    config: { status: 'accepted' },
  };

  it('calls updateProposal when proposalId is present in trigger data', async () => {
    mockUpdateProposal.mockResolvedValue({ data: {}, error: null });

    const result = await executeAction(action, { id: 'prop-1', proposalId: 'prop-1' });

    expect(result.status).toBe('success');
    expect(mockUpdateProposal).toHaveBeenCalledWith('prop-1', { status: 'accepted' });
  });
});

// ---------------------------------------------------------------------------
// update_status — item context
// ---------------------------------------------------------------------------

describe('executeAction — update_status (pipeline item)', () => {
  const action: AutomationAction = {
    type:   'update_status',
    config: { status: 'active' },
  };

  it('calls updateItem when no proposalId present', async () => {
    mockUpdateItem.mockResolvedValue({ data: {}, error: null });

    const result = await executeAction(action, { id: 'item-1' });

    expect(result.status).toBe('success');
    expect(mockUpdateItem).toHaveBeenCalledWith('item-1', { status: 'active' });
  });

  it('returns failed when status is missing', async () => {
    const actionNoStatus: AutomationAction = { type: 'update_status', config: {} };
    const result = await executeAction(actionNoStatus, { id: 'item-1' });

    expect(result.status).toBe('failed');
    expect(result.error).toMatch(/missing status/i);
  });
});

// ---------------------------------------------------------------------------
// send_notification (stub)
// ---------------------------------------------------------------------------

describe('executeAction — send_notification', () => {
  it('returns success without calling any DB function', async () => {
    const action: AutomationAction = {
      type:   'send_notification',
      config: { message: 'SLA exceeded for {{title}}', recipientId: 'user-1' },
    };

    const result = await executeAction(action, { title: 'Deal X' });

    expect(result.status).toBe('success');
    expect(mockCreateTask).not.toHaveBeenCalled();
    expect(mockUpdateItem).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// send_email (stub)
// ---------------------------------------------------------------------------

describe('executeAction — send_email', () => {
  it('returns success without calling any DB function', async () => {
    const action: AutomationAction = {
      type:   'send_email',
      config: { subject: 'Task complete', recipientId: 'user-1' },
    };

    const result = await executeAction(action, {});

    expect(result.status).toBe('success');
    expect(mockCreateTask).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// send_webhook
// ---------------------------------------------------------------------------

describe('executeAction — send_webhook', () => {
  it('dispatches via dispatchWebhookEvent and returns success', async () => {
    mockDispatchWebhook.mockResolvedValue(undefined);

    const action: AutomationAction = {
      type:   'send_webhook',
      config: { eventType: 'task.status_changed' },
    };

    const triggerData = { id: 'task-1', status: 'done' };
    const result = await executeAction(action, triggerData);

    expect(result.status).toBe('success');
    expect(mockDispatchWebhook).toHaveBeenCalledWith('task.status_changed', triggerData);
  });

  it('returns failed when dispatchWebhookEvent throws', async () => {
    mockDispatchWebhook.mockRejectedValue(new Error('Network error'));

    const action: AutomationAction = {
      type:   'send_webhook',
      config: { eventType: 'task.status_changed' },
    };

    const result = await executeAction(action, { id: 'task-1' });

    expect(result.status).toBe('failed');
    expect(result.error).toBe('Network error');
  });
});
