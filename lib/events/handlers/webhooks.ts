// Event Bus handler: outbound webhooks.
// Maps EventName → WebhookEventType and dispatches to registered endpoints.
// Events with no webhook mapping are silently skipped.

import { dispatchWebhookEvent } from '@/lib/utils/webhook-delivery';
import type { WebhookEventType } from '@/lib/types/webhooks';
import type { EventHandler, EventName } from '../types';

const WEBHOOK_EVENT_MAP: Partial<Record<EventName, WebhookEventType>> = {
  'contact.created':             'contact.created',
  'contact.updated':             'contact.updated',
  'organization.created':        'organization.created',
  'task.created':                'task.created',
  'task.status_changed':         'task.status_changed',
  'proposal.created':            'proposal.created',
  'proposal.status_changed':     'proposal.status_changed',
  'invoice.created':             'invoice.created',
  'invoice.status_changed':      'invoice.status_changed',
  'pipeline.item_stage_changed': 'pipeline.item_stage_changed',
  'time_entry.created':          'time_entry.created',
  'time_entry.updated':          'time_entry.updated',
};

export const webhooksHandler: EventHandler = async (eventName, payload) => {
  const webhookEventType = WEBHOOK_EVENT_MAP[eventName];
  if (!webhookEventType) return;

  await dispatchWebhookEvent(webhookEventType, payload.data);
};
