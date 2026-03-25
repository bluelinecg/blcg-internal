// Audit log types — records every significant mutation across all entities.
// Entries are append-only and are never updated or deleted.

export type AuditAction = 'created' | 'updated' | 'deleted' | 'status_changed';

export type AuditEntityType =
  | 'client'
  | 'contact'
  | 'organization'
  | 'proposal'
  | 'project'
  | 'task'
  | 'invoice'
  | 'expense'
  | 'pipeline_item';

export interface AuditLog {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  entityLabel: string;     // denormalized display name (e.g. "Acme Corp", "Jane Smith")
  action: AuditAction;
  actorId: string;         // Clerk user ID
  actorName: string;       // denormalized full name for display
  metadata?: Record<string, unknown>; // { from, to } for status changes; field list for updates
  createdAt: string;
}
