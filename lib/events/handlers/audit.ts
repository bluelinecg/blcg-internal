// Event Bus handler: audit log.
// Writes a structured entry to audit_log for every domain event.
// Resolves the actor's display name via Clerk currentUser() — same approach
// as the standalone logAction() utility.

import { currentUser } from '@clerk/nextjs/server';
import { insertLog } from '@/lib/db/audit-log';
import type { EventHandler } from '../types';

export const auditHandler: EventHandler = async (_eventName, payload) => {
  const user = await currentUser();
  if (!user) return;

  const firstName = user.firstName ?? '';
  const lastName  = user.lastName  ?? '';
  const actorName =
    [firstName, lastName].filter(Boolean).join(' ') ||
    user.emailAddresses[0]?.emailAddress ||
    'Unknown';

  const { error } = await insertLog({
    entityType:  payload.entityType,
    entityId:    payload.entityId,
    entityLabel: payload.entityLabel,
    action:      payload.action,
    actorId:     user.id,
    actorName,
    metadata:    payload.metadata,
  });

  if (error) {
    console.error('[EventBus/audit] Failed to write audit log:', error);
  }
};
