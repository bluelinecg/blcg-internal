import { notFound } from 'next/navigation';
import { getContactById } from '@/lib/db/contacts';
import { ContactDetailView } from '@/components/modules';

interface ContactDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const { id } = await params;
  const { data: contact, error } = await getContactById(id);
  if (error) throw new Error(error);
  if (!contact) notFound();
  return <ContactDetailView contact={contact} />;
}
