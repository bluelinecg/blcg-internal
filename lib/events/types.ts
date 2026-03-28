// Event Bus types.
// EventName    — union of all domain event names emitted by the application.
// DomainEventPayload — the single payload shape shared by all events.
// EventHandler — a function that handles a named event + its payload.

import type { AuditAction, AuditEntityType } from '@/lib/types/audit-log';

export type EventName =
  | 'contact.created'
  | 'contact.updated'
  | 'contact.deleted'
  | 'organization.created'
  | 'organization.updated'
  | 'organization.deleted'
  | 'client.created'
  | 'client.updated'
  | 'client.deleted'
  | 'project.created'
  | 'project.updated'
  | 'project.status_changed'
  | 'project.deleted'
  | 'task.created'
  | 'task.updated'
  | 'task.status_changed'
  | 'task.completed'
  | 'task.deleted'
  | 'invoice.created'
  | 'invoice.updated'
  | 'invoice.status_changed'
  | 'invoice.deleted'
  | 'proposal.created'
  | 'proposal.updated'
  | 'proposal.status_changed'
  | 'proposal.deleted'
  | 'pipeline.item_created'
  | 'pipeline.item_updated'
  | 'pipeline.item_stage_changed'
  | 'pipeline.item_deleted'
  | 'expense.created'
  | 'expense.updated'
  | 'expense.deleted'
  | 'time_entry.created'
  | 'time_entry.updated'
  | 'time_entry.deleted';

/**
 * Payload carried by every domain event.
 *
 * - `actorId`     Clerk user ID from requireAuth() — used by notification handler.
 * - `entityType`  Maps directly to AuditEntityType for audit log writes.
 * - `action`      The mutation type — created | updated | deleted | status_changed.
 * - `data`        Full entity data after the mutation.
 * - `metadata`    Optional extra context, e.g. { previousStatus, newStatus } for status changes.
 */
export interface DomainEventPayload {
  actorId: string;
  entityType: AuditEntityType;
  entityId: string;
  entityLabel: string;
  action: AuditAction;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * A handler that receives the event name and payload.
 * May be async; errors are caught by the EventBus and never propagate to callers.
 */
export type EventHandler = (
  eventName: EventName,
  payload: DomainEventPayload,
) => void | Promise<void>;
