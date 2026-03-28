// Event Bus registry.
// Constructs and configures the singleton bus instance used across all API routes.
//
// Handler registration:
//   - auditHandler    → onAny    (every mutation is audit-logged)
//   - webhooksHandler → onAny    (maps to subset of events with webhook support)
//   - automationsHandler → named events only (specific trigger types)
//   - notificationsHandler → named events only (specific user-facing events)

import { EventBus } from './bus';
import { auditHandler } from './handlers/audit';
import { webhooksHandler } from './handlers/webhooks';
import { automationsHandler } from './handlers/automations';
import { notificationsHandler } from './handlers/notifications';

function createBus(): EventBus {
  const bus = new EventBus();

  // Cross-cutting: every event is audit-logged and may trigger webhooks
  bus.onAny(auditHandler);
  bus.onAny(webhooksHandler);

  // Automation triggers — only these specific events drive automation rules
  bus.on('pipeline.item_stage_changed', automationsHandler);
  bus.on('task.status_changed',         automationsHandler);
  bus.on('task.completed',              automationsHandler);
  bus.on('proposal.created',            automationsHandler);
  bus.on('proposal.status_changed',     automationsHandler);
  bus.on('invoice.status_changed',      automationsHandler);

  // In-app notifications — proposal lifecycle and invoice status changes
  bus.on('proposal.created',        notificationsHandler);
  bus.on('proposal.status_changed', notificationsHandler);
  bus.on('invoice.status_changed',  notificationsHandler);

  return bus;
}

export const bus = createBus();
