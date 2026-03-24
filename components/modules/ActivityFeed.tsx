'use client';

// ActivityFeed — displays the audit log for a specific entity or globally.
//
// Props:
//   entityType — the entity type to filter on (e.g. 'client')
//   entityId   — the entity id to filter on; if omitted, shows global log (admin only)
//   pageSize   — number of entries per page (default 10)

import { useState, useEffect, useCallback } from 'react';
import { Spinner } from '@/components/ui';
import type { AuditLog, AuditEntityType } from '@/lib/types/audit-log';

interface ActivityFeedProps {
  entityType?: AuditEntityType;
  entityId?: string;
  pageSize?: number;
}

const ACTION_LABELS: Record<string, string> = {
  created:        'created',
  updated:        'updated',
  deleted:        'deleted',
  status_changed: 'changed status',
};

const ACTION_COLOURS: Record<string, string> = {
  created:        'bg-green-100 text-green-700',
  updated:        'bg-blue-100 text-blue-700',
  deleted:        'bg-red-100 text-red-700',
  status_changed: 'bg-amber-100 text-amber-700',
};

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours   = Math.floor(diff / 3_600_000);
  const days    = Math.floor(diff / 86_400_000);

  if (minutes < 1)  return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24)   return `${hours}h ago`;
  if (days < 7)     return `${days}d ago`;
  return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function buildDescription(entry: AuditLog): string {
  const action = ACTION_LABELS[entry.action] ?? entry.action;
  if (entry.action === 'status_changed' && entry.metadata?.to) {
    return `changed status to "${entry.metadata.to}"`;
  }
  return `${action} ${entry.entityType.replace('_', ' ')} "${entry.entityLabel}"`;
}

export function ActivityFeed({ entityType, entityId, pageSize = 10 }: ActivityFeedProps) {
  const [entries, setEntries]   = useState<AuditLog[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const fetchEntries = useCallback(async (p: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: String(pageSize) });
      if (entityType) params.set('entityType', entityType);
      if (entityId)   params.set('entityId', entityId);

      const res  = await fetch(`/api/audit-log?${params.toString()}`);
      const json = await res.json() as { data: AuditLog[] | null; total: number | null; error: string | null };

      if (!res.ok || json.error) {
        setError(json.error ?? 'Failed to load activity');
        return;
      }
      setEntries(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [entityType, entityId, pageSize]);

  useEffect(() => {
    void fetchEntries(page);
  }, [fetchEntries, page]);

  const totalPages = Math.ceil(total / pageSize);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="sm" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-md border-2 border-dashed border-gray-200 py-8">
        <p className="text-sm text-gray-400">No activity yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Feed entries */}
      <ol className="relative border-l border-gray-200 pl-4">
        {entries.map((entry) => (
          <li key={entry.id} className="mb-6 last:mb-0">
            {/* Timeline dot */}
            <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-gray-300" />

            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-900">{entry.actorName}</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLOURS[entry.action] ?? 'bg-gray-100 text-gray-600'}`}>
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </span>
              </div>
              <p className="text-sm text-gray-600">{buildDescription(entry)}</p>
              <time className="text-xs text-gray-400" dateTime={entry.createdAt}>
                {formatRelativeTime(entry.createdAt)}
              </time>
            </div>
          </li>
        ))}
      </ol>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-500">{total} total</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            <span className="text-xs text-gray-500">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
