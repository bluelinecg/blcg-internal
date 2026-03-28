import { notFound } from 'next/navigation';
import { getOrganizationById } from '@/lib/db/organizations';
import { OrganizationDetailView } from '@/components/modules';

interface OrganizationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrganizationDetailPage({ params }: OrganizationDetailPageProps) {
  const { id } = await params;
  const { data: organization, error } = await getOrganizationById(id);
  if (error) throw new Error(error);
  if (!organization) notFound();
  return <OrganizationDetailView organization={organization} />;
}
