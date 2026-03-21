// Dashboard shell layout.
// Auth protection is handled by Clerk middleware — no auth check needed here.
// This layout will grow to include Sidebar and TopNav in a future phase.

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return <div className="min-h-screen bg-gray-100">{children}</div>;
}

export default DashboardLayout;
