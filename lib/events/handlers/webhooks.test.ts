import { describe, it, expect, vi, beforeEach } from 'vitest';
import { webhooksHandler } from './webhooks';
import type { DomainEventPayload } from '../types';

vi.mock('@/lib/utils/webhook-delivery', () => ({
  dispatchWebhookEvent: vi.fn().mockResolvedValue(undefined),
}));

import { dispatchWebhookEvent } from '@/lib/utils/webhook-delivery';

const payload: DomainEventPayload = {
  actorId:     'user_1',
  entityType:  'contact',
  entityId:    'contact-uuid',
  entityLabel: 'Jane Smith',
  action:      'created',
  data:        { id: 'contact-uuid', firstName: 'Jane' },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('webhooksHandler', () => {
  it('dispatches a mapped event to webhook delivery', async () => {
    await webhooksHandler('contact.created', payload);

    expect(dispatchWebhookEvent).toHaveBeenCalledWith('contact.created', payload.data);
  });

  it('dispatches invoice.status_changed correctly', async () => {
    const invoicePayload: DomainEventPayload = {
      ...payload,
      entityType:  'invoice',
      entityLabel: 'INV-001',
      data:        { id: 'inv-uuid', status: 'paid' },
    };

    await webhooksHandler('invoice.status_changed', invoicePayload);

    expect(dispatchWebhookEvent).toHaveBeenCalledWith('invoice.status_changed', invoicePayload.data);
  });

  it('skips dispatch for unmapped events', async () => {
    await webhooksHandler('contact.deleted', payload);

    expect(dispatchWebhookEvent).not.toHaveBeenCalled();
  });

  it('skips dispatch for client events (no webhook type)', async () => {
    await webhooksHandler('client.created', { ...payload, entityType: 'client' });

    expect(dispatchWebhookEvent).not.toHaveBeenCalled();
  });

  it('dispatches pipeline.item_stage_changed', async () => {
    const pipelinePayload: DomainEventPayload = {
      ...payload,
      entityType:  'pipeline_item',
      entityLabel: 'Deal A',
      data:        { id: 'item-uuid', stageId: 'stage-2' },
    };

    await webhooksHandler('pipeline.item_stage_changed', pipelinePayload);

    expect(dispatchWebhookEvent).toHaveBeenCalledWith(
      'pipeline.item_stage_changed',
      pipelinePayload.data,
    );
  });
});
