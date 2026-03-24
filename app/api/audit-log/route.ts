// GET /api/audit-log — list audit log entries
//
// Query params:
//   entityType — filter to a specific entity type (e.g. 'client')
//   entityId   — filter to a specific entity (requires entityType)
//   page       — page number (default 1)
//   pageSize   — page size (default 25, max 100)
//
// When both entityType and entityId are provided, returns entries for that entity only.
// When neither is provided, returns the global log — admin only.
//
// Auth: all authenticated users can read entity-scoped logs.
//       Global log (no entityId filter) requires admin role.
// Response shape: { data: AuditLog[] | null, total: number | null, error: string | null }

import { NextResponse } from 'next/server';
import { listLogs, listLogsForEntity } from '@/lib/db/audit-log';
import { guardAdmin } from '@/lib/auth/roles';
import { parseListParams } from '@/lib/utils/parse-list-params';
import type { AuditEntityType } from '@/lib/types/audit-log';
import { requireAuth, apiError } from '@/lib/api/utils';

const VALID_ENTITY_TYPES: AuditEntityType[] = [
  'client', 'contact', 'organization', 'proposal',
  'project', 'task', 'invoice', 'expense',
];

export async function GET(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const url = new URL(request.url);
    const entityType = url.searchParams.get('entityType');
    const entityId   = url.searchParams.get('entityId');
    const options    = parseListParams(url.searchParams);

    // Entity-scoped request — any authenticated user
    if (entityType && entityId) {
      if (!VALID_ENTITY_TYPES.includes(entityType as AuditEntityType)) {
        return apiError(`Invalid entityType: ${entityType}`, 400);
      }

      const { data, total, error } = await listLogsForEntity(
        entityType as AuditEntityType,
        entityId,
        options,
      );
      if (error) return apiError(error, 500);
      return NextResponse.json({ data, total, error: null });
    }

    // Global log — admin only
    const guard = await guardAdmin();
    if (guard) return guard;

    const { data, total, error } = await listLogs(options);
    if (error) return apiError(error, 500);

    return NextResponse.json({ data, total, error: null });
  } catch (err) {
    console.error('[GET /api/audit-log]', err);
    return apiError('Failed to load audit log', 500);
  }
}
