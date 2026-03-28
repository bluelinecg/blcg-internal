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
import { AuditLogQuerySchema } from '@/lib/validations/audit-log';
import { requireAuth, apiError } from '@/lib/api/utils';

export async function GET(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const url = new URL(request.url);
    const options = parseListParams(url.searchParams);

    const parsed = AuditLogQuerySchema.safeParse({
      entityType: url.searchParams.get('entityType') ?? undefined,
      entityId:   url.searchParams.get('entityId')   ?? undefined,
    });

    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? 'Invalid query parameters';
      return apiError(error, 400);
    }

    const { entityType, entityId } = parsed.data;

    // Entity-scoped request — any authenticated user
    if (entityType && entityId) {
      const { data, total, error } = await listLogsForEntity(entityType, entityId, options);
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
