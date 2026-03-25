'use client';

// Top navigation bar for the dashboard shell.
// Derives the current page title from the pathname and renders the Clerk UserButton.
// Includes a bell icon with unread badge and notification dropdown.

import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { useState, useEffect, useCallback } from 'react';
import { NotificationDropdown } from '@/components/modules/NotificationDropdown';
import type { Notification } from '@/lib/types/notifications';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':      'Dashboard',
  '/clients':        'Clients',
  '/proposals':      'Proposals',
  '/emails':         'Emails',
  '/settings':       'Settings',
  '/notifications':  'Notifications',
};

function resolvePageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];

  const match = Object.keys(PAGE_TITLES).find(
    (key) => key !== '/dashboard' && pathname.startsWith(key + '/')
  );

  return match ? PAGE_TITLES[match] : 'BLCG Internal';
}

export function TopNav() {
  const pathname = usePathname();
  const title = resolvePageTitle(pathname);

  const [dropdownOpen, setDropdownOpen]       = useState(false);
  const [notifications, setNotifications]     = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount]         = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res  = await fetch('/api/notifications');
      const json = await res.json() as { data: { notifications: Notification[]; unreadCount: number } | null; error: string | null };
      if (res.ok && json.data) {
        setNotifications(json.data.notifications);
        setUnreadCount(json.data.unreadCount);
      }
    } catch {
      // Silently ignore — badge is non-critical
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  async function handleMarkRead(id: string) {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: true }),
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

  return (
    <header className="flex items-center justify-between px-6 h-16 bg-white border-b border-gray-200">
      <h1 className="text-lg font-semibold text-brand-navy">{title}</h1>

      <div className="flex items-center gap-4">
        {/* Bell icon + dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setDropdownOpen((o) => !o);
              if (!dropdownOpen) void fetchNotifications();
            }}
            className="relative flex items-center justify-center rounded-full p-1.5 text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Notifications"
          >
            {/* Bell icon (inline SVG — heroicons outline bell) */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-blue text-white text-[10px] font-bold leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <NotificationDropdown
              notifications={notifications}
              unreadCount={unreadCount}
              onClose={() => setDropdownOpen(false)}
              onMarkRead={handleMarkRead}
              onDelete={handleDelete}
              onMarkAllRead={handleMarkAllRead}
            />
          )}
        </div>

        <UserButton />
      </div>
    </header>
  );
}
