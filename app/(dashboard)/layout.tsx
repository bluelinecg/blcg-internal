// Dashboard shell layout.
// Auth protection is handled by Clerk middleware — no auth check needed here.
// Composes Sidebar and TopNav around the page content area.

import { Sidebar } from '@/components/layout';
import { TopNav } from '@/components/layout';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopNav />
        <main className="flex flex-col flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
