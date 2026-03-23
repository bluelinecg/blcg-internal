// Edit client page — fetches the client from DB and renders ClientForm in edit mode.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { PageHeader } from '@/components/layout';
import { ClientForm } from '@/components/modules';
import { getClientById } from '@/lib/db/clients';

interface EditClientPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditClientPage({ params }: EditClientPageProps) {
  const { id } = await params;
  const { data: client, error } = await getClientById(id);

  if (error) throw new Error(error);
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
