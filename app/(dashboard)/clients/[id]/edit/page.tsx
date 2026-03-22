// Edit client page — looks up the client and renders ClientForm in edit mode.
// TODO: replace getClientById with a Supabase query when backend is connected.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { PageHeader } from '@/components/layout';
import { ClientForm } from '@/components/modules';
import { getClientById } from '@/lib/mock/clients';

interface EditClientPageProps {
  params: Promise<{ id: string }>;
}

export async function EditClientPage({ params }: EditClientPageProps) {
  const { id } = await params;
  const client = getClientById(id);

  if (!client) notFound();

  return (
    <PageShell>
      <Link
        href={`/clients/${client.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700"
      >
        ← Back to {client.name}
      </Link>
      <PageHeader
        title="Edit Client"
        subtitle={`Updating details for ${client.name}.`}
      />
      <ClientForm client={client} />
    </PageShell>
  );
}

export default EditClientPage;
