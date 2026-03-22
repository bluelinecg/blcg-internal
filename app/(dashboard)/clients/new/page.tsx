// New client page — renders the shared ClientForm in create mode.

import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { PageHeader } from '@/components/layout';
import { ClientForm } from '@/components/modules';

export function NewClientPage() {
  return (
    <PageShell>
      <Link
        href="/clients"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700"
      >
        ← Back to Clients
      </Link>
      <PageHeader
        title="New Client"
        subtitle="Add a new client to your roster."
      />
      <ClientForm />
    </PageShell>
  );
}

export default NewClientPage;
