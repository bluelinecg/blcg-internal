// Automations page — list all automation rules with edit/delete controls.
// Server component: fetches data, passes to client wrapper for interactivity.

import { PageShell, PageHeader } from '@/components/layout';
import { listAutomationRules } from '@/lib/db/automations';
import { AutomationsPageClient } from './page.client';

export default async function AutomationsPage() {
  const { data: rules, error } = await listAutomationRules();

  if (error) {
    return (
      <PageShell>
        <PageHeader title="Automations" subtitle="Manage automation rules" />
        <div className="rounded bg-red-50 p-4 text-red-700">Error loading automation rules: {error}</div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader title="Automations" subtitle="Create and manage automation rules to automate common workflows" />
      <AutomationsPageClient initialRules={rules ?? []} />
    </PageShell>
  );
}
