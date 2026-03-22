// Dashboard overview page — first page users land on after sign-in.
// Currently a placeholder; replace with real dashboard content in a future phase.

import { PageShell } from '@/components/layout';
import { PageHeader } from '@/components/layout';

export function DashboardPage() {
  return (
    <PageShell>
      <PageHeader
        title="Dashboard"
        subtitle="Welcome to the BLCG internal admin."
      />
      <div className="flex items-center justify-center flex-1 rounded-lg border-2 border-dashed border-gray-300 bg-white">
        <p className="text-sm text-gray-400">Dashboard content coming soon.</p>
      </div>
    </PageShell>
  );
}

export default DashboardPage;
