// Client detail page — server wrapper.
// Awaits async params, fetches client data, and passes it to the
// ClientDetailView client component which handles all UI and delete state.
// TODO: replace getClientById with a Supabase query when backend is connected.

import { notFound } from 'next/navigation';
import { getClientById } from '@/lib/mock/clients';
import { ClientDetailView } from '@/components/modules';

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params;
  const client = getClientById(id);

  if (!client) notFound();

  return <ClientDetailView client={client} />;
}

export default ClientDetailPage;
