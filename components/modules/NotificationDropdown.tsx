'use client';

// Notification dropdown panel — shown when the bell icon in TopNav is clicked.
// Fetches the most recent 10 notifications and unread count.
// Supports: mark as read, delete, mark all as read, link to full /notifications page.

import { useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import type { Notification } from '@/lib/types/notifications';

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount:   number;
  onClose:       () => void;
  onMarkRead:    (id: string) => void;
  onDelete:      (id: string) => void;
  onMarkAllRead: () => void;
}

export function NotificationDropdown({
  notifications,
  unreadCount,
  onClose,
  onMarkRead,
  onDelete,
  onMarkAllRead,
}: NotificationDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleOutsideClick = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [handleOutsideClick]);

  const recent = notifications.slice(0, 10);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-96 rounded-lg border border-gray-200 bg-white shadow-lg z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <span className="text-sm font-semibold text-gray-800">Notifications</span>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="text-xs text-brand-blue hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
        {recent.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-400">
            No notifications yet.
          </p>
        ) : (
          recent.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 ${
                !n.isRead ? 'bg-blue-50/40' : ''
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
                <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(n.createdAt)}</p>
              </div>

              {/* Actions */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {!n.isRead && (
                  <button
                    onClick={() => onMarkRead(n.id)}
                    className="text-xs text-gray-400 hover:text-brand-blue whitespace-nowrap"
                  >
                    Mark read
                  </button>
                )}
                <button
                  onClick={() => onDelete(n.id)}
                  className="text-xs text-gray-400 hover:text-red-500 whitespace-nowrap"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-4 py-2">
        <Link
          href="/notifications"
          onClick={onClose}
          className="text-xs text-brand-blue hover:underline"
        >
          View all notifications
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);

  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
