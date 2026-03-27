'use client';

// Full notification history page.
// Supports filtering by All / Unread and bulk mark-all-read.

import { useState, useEffect, useCallback } from 'react';
import { PageShell } from '@/components/layout';
import { PageHeader } from '@/components/layout';
import { Card, Button, Skeleton } from '@/components/ui';
import type { Notification } from '@/lib/types/notifications';

type Filter = 'all' | 'unread';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [fetchError, setFetchError]       = useState<string | null>(null);
  const [filter, setFilter]               = useState<Filter>('all');
  const [unreadCount, setUnreadCount]     = useState(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res  = await fetch('/api/notifications');
      const json = await res.json() as { data: { notifications: Notification[]; unreadCount: number } | null; error: string | null };
      if (!res.ok || json.error) { setFetchError(json.error ?? 'Failed to load'); return; }
      setNotifications(json.data?.notifications ?? []);
      setUnreadCount(json.data?.unreadCount ?? 0);
    } catch {
      setFetchError('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleMarkRead(id: string) {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
    await fetch(`/api/notifications/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ isRead: true }),
    });
  }

  async function handleMarkUnread(id: string) {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: false } : n));
    setUnreadCount((c) => c + 1);
    await fetch(`/api/notifications/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ isRead: false }),
    });
  }

  async function handleDelete(id: string) {
    const wasUnread = notifications.find((n) => n.id === id)?.isRead === false;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    await fetch('/api/notifications/mark-all-read', { method: 'POST' });
  }

  const visible = filter === 'unread'
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <PageHeader title="Notifications" subtitle="Your full notification history" />
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4">
        {(['all', 'unread'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
              filter === f
                ? 'bg-brand-blue text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {f === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
          </button>
        ))}
      </div>

      <Card>
        {isLoading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 px-6 py-4">
                <Skeleton className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-72" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-3 w-16 flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : fetchError ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-red-500">{fetchError}</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-gray-400">
              {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {visible.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-4 px-6 py-4 transition-colors hover:bg-gray-50 ${
                  !n.isRead ? 'bg-blue-50/30' : ''
                }`}
              >
                {/* Unread dot */}
                <div className="mt-1.5 flex-shrink-0">
                  {!n.isRead ? (
                    <span className="inline-block h-2 w-2 rounded-full bg-brand-blue" />
                  ) : (
                    <span className="inline-block h-2 w-2" />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{n.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => n.isRead ? handleMarkUnread(n.id) : handleMarkRead(n.id)}
                    className="text-xs text-gray-400 hover:text-brand-blue transition-colors"
                  >
                    {n.isRead ? 'Mark unread' : 'Mark read'}
                  </button>
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageShell>
  );
}
