// Server-side audit logging helper.
// Resolves the current Clerk user and writes a structured entry to audit_log.
//
// logAction() is designed to be fire-and-forget: it catches all errors internally
// so that a logging failure can never crash the primary API operation.
// Call it after a successful DB mutation — never before.
//
// Usage:
//   void logAction({ entityType: 'client', entityId: data.id, entityLabel: data.name, action: 'created' });

import { currentUser } from '@clerk/nextjs/server';
import { insertLog } from '@/lib/db/audit-log';
import type { AuditAction, AuditEntityType } from '@/lib/types/audit-log';

interface LogActionParams {
  entityType: AuditEntityType;
  entityId: string;
  entityLabel: string;
  action: AuditAction;
  /** Optional extra context — e.g. { from: 'draft', to: 'sent' } for status changes */
  metadata?: Record<string, unknown>;
}

export async function logAction(params: LogActionParams): Promise<void> {
  try {
    const user = await currentUser();
    if (!user) return;

    const firstName = user.firstName ?? '';
    const lastName  = user.lastName  ?? '';
    const actorName =
      [firstName, lastName].filter(Boolean).join(' ') ||
      user.emailAddresses[0]?.emailAddress ||
      'Unknown';

    const { error } = await insertLog({
      entityType:  params.entityType,
      entityId:    params.entityId,
      entityLabel: params.entityLabel,
      action:      params.action,
      actorId:     user.id,
      actorName,
      metadata:    params.metadata,
    });

    if (error) {
      console.error('[logAction] Failed to write audit log:', error);
    }
  } catch (err) {
    // Logging must never crash the primary operation
    console.error('[logAction] Unexpected error:', err);
  }
}
