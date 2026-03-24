// Database query functions for the audit_log module.
// The audit log is append-only — insertLog() is the only write operation.
// All reads return paginated results; filtering by entity is the primary access pattern.
//
// All functions use serverClient() (service role, bypasses RLS).
// Call these only from server-side code — API routes, Server Actions, or async Server Components.

import { serverClient } from '@/lib/db/supabase';
import type { AuditLog, AuditAction, AuditEntityType } from '@/lib/types/audit-log';
import type { ListOptions, PaginatedResult } from '@/lib/types/pagination';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';

// ---------------------------------------------------------------------------
// Row type (mirrors DB columns)
// ---------------------------------------------------------------------------

interface AuditLogRow {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_label: string;
  action: string;
  actor_id: string;
  actor_name: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Mapping helper
// ---------------------------------------------------------------------------

function fromRow(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    entityType: row.entity_type as AuditEntityType,
    entityId: row.entity_id,
    entityLabel: row.entity_label,
    action: row.action as AuditAction,
    actorId: row.actor_id,
    actorName: row.actor_name,
    metadata: row.metadata ?? undefined,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Insert type (input to insertLog)
// ---------------------------------------------------------------------------

export interface InsertLogInput {
  entityType: AuditEntityType;
  entityId: string;
  entityLabel: string;
  action: AuditAction;
  actorId: string;
  actorName: string;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * Append a new entry to the audit log.
 * Fires and returns; errors are caught and returned as { error } — they must
 * never crash the calling operation.
 */
export async function insertLog(
  input: InsertLogInput,
): Promise<{ error: string | null }> {
  try {
    const db = serverClient();
    const { error } = await db.from('audit_log').insert({
      entity_type: input.entityType,
      entity_id: input.entityId,
      entity_label: input.entityLabel,
      action: input.action,
      actor_id: input.actorId,
      actor_name: input.actorName,
      metadata: input.metadata ?? null,
    });

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ---------------------------------------------------------------------------
// Read — global log (all entities)
// ---------------------------------------------------------------------------

/**
 * List all audit log entries, newest first.
 * Supports pagination via ListOptions.
 */
export async function listLogs(
  options: ListOptions = {},
): Promise<PaginatedResult<AuditLog>> {
  try {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const db = serverClient();
    const { data, count, error } = await db
      .from('audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) return { data: null, total: null, error: error.message };

    return {
      data: (data as AuditLogRow[]).map(fromRow),
      total: count ?? 0,
      error: null,
    };
  } catch (err) {
    return { data: null, total: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ---------------------------------------------------------------------------
// Read — entity-scoped log
// ---------------------------------------------------------------------------

/**
 * List audit log entries for a specific entity, newest first.
 * Used to power the ActivityFeed on detail pages.
 */
export async function listLogsForEntity(
  entityType: AuditEntityType,
  entityId: string,
  options: ListOptions = {},
): Promise<PaginatedResult<AuditLog>> {
  try {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const db = serverClient();
    const { data, count, error } = await db
      .from('audit_log')
      .select('*', { count: 'exact' })
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) return { data: null, total: null, error: error.message };

    return {
      data: (data as AuditLogRow[]).map(fromRow),
      total: count ?? 0,
      error: null,
    };
  } catch (err) {
    return { data: null, total: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
