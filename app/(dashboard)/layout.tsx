'use client';

// Dashboard shell layout.
// Auth protection is handled by Clerk middleware — no auth check needed here.
// Composes Sidebar and TopNav around the page content area.
// Owns sidebar open/close state and passes it down to Sidebar and TopNav.

import { useState, useCallback } from 'react';
import { Sidebar } from '@/components/layout';
import { TopNav } from '@/components/layout';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openSidebar  = useCallback(() => setSidebarOpen(true),  []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="flex flex-col flex-1 min-w-0">
        <TopNav onMenuClick={openSidebar} />
        <main className="flex flex-col flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
