// Client detail page — server wrapper.
// Fetches the client directly from the DB and passes it to the
// ClientDetailView client component which handles all UI and delete state.

import { notFound } from 'next/navigation';
import { getClientById } from '@/lib/db/clients';
import { ClientDetailView } from '@/components/modules';

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params;
  const { data: client, error } = await getClientById(id);

  if (error) throw new Error(error);
  if (!client) notFound();

  return <ClientDetailView client={client} />;
}
