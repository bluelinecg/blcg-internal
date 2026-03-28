import { describe, it, expect, vi, beforeEach } from 'vitest';
import { automationsHandler } from './automations';
import type { DomainEventPayload } from '../types';

vi.mock('@/lib/automations/engine', () => ({
  runAutomations: vi.fn().mockResolvedValue(undefined),
}));

import { runAutomations } from '@/lib/automations/engine';

const basePayload: DomainEventPayload = {
  actorId:     'user_1',
  entityType:  'task',
  entityId:    'task-uuid',
  entityLabel: 'Fix bug',
  action:      'status_changed',
  data:        { id: 'task-uuid', status: 'done' },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('automationsHandler', () => {
  it('calls runAutomations for task.status_changed', async () => {
    await automationsHandler('task.status_changed', basePayload);

    expect(runAutomations).toHaveBeenCalledWith('task.status_changed', basePayload.data);
  });

  it('calls runAutomations for task.completed', async () => {
    await automationsHandler('task.completed', basePayload);

    expect(runAutomations).toHaveBeenCalledWith('task.completed', basePayload.data);
  });

  it('calls runAutomations for pipeline.item_stage_changed', async () => {
    const payload: DomainEventPayload = {
      ...basePayload,
      entityType: 'pipeline_item',
      action:     'status_changed',
      data:       { id: 'item-uuid', stageId: 'stage-2' },
    };

    await automationsHandler('pipeline.item_stage_changed', payload);

    expect(runAutomations).toHaveBeenCalledWith('pipeline.item_stage_changed', payload.data);
  });

  it('calls runAutomations for proposal.created', async () => {
    const payload: DomainEventPayload = {
      ...basePayload,
      entityType: 'proposal',
      action:     'created',
      data:       { id: 'prop-uuid', title: 'New Proposal' },
    };

    await automationsHandler('proposal.created', payload);

    expect(runAutomations).toHaveBeenCalledWith('proposal.created', payload.data);
  });

  it('skips runAutomations for contact.created (not a trigger)', async () => {
    await automationsHandler('contact.created', { ...basePayload, entityType: 'contact', action: 'created' });

    expect(runAutomations).not.toHaveBeenCalled();
  });

  it('skips runAutomations for task.deleted', async () => {
    await automationsHandler('task.deleted', { ...basePayload, action: 'deleted' });

    expect(runAutomations).not.toHaveBeenCalled();
  });
});
