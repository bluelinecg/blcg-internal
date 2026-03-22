// Client detail page — shows full contact info, notes, and placeholder sections
// for proposals and activity. Looks up client by id from mock data.
// TODO: replace getClientById with a Supabase query when backend is connected.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { Button } from '@/components/ui';
import { Card } from '@/components/ui';
import { StatusBadge } from '@/components/modules';
import { getClientById } from '@/lib/mock/clients';
import { formatDate } from '@/lib/utils/format';

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params;
  const client = getClientById(id);

  if (!client) notFound();

  return (
    <PageShell>
      {/* Back link */}
      <Link
        href="/clients"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700"
      >
        ← Back to Clients
      </Link>

      {/* Page header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-base font-bold text-brand-blue">
            {getInitials(client.name)}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{client.name}</h2>
            {client.company && (
              <p className="mt-0.5 text-sm text-gray-500">{client.company}</p>
            )}
          </div>
        </div>
        <Link href={`/clients/${client.id}/edit`}>
          <Button variant="secondary">Edit Client</Button>
        </Link>
      </div>

      {/* Body: 2-col layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left column */}
        <div className="col-span-2 flex flex-col gap-6">
          {/* Contact info */}
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">Contact Information</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <dt className="mb-0.5 text-xs text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900">
                  <a
                    href={`mailto:${client.email}`}
                    className="text-blue-600 hover:underline"
                  >
                    {client.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="mb-0.5 text-xs text-gray-500">Phone</dt>
                <dd className="text-sm text-gray-900">{client.phone ?? '—'}</dd>
              </div>
              <div>
                <dt className="mb-0.5 text-xs text-gray-500">Company</dt>
                <dd className="text-sm text-gray-900">{client.company ?? '—'}</dd>
              </div>
            </dl>
          </Card>

          {/* Notes */}
          {client.notes && (
            <Card className="p-6">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Notes</h3>
              <p className="text-sm leading-relaxed text-gray-600">{client.notes}</p>
            </Card>
          )}

          {/* Proposals placeholder */}
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Proposals</h3>
              <Button size="sm" variant="secondary">
                + New Proposal
              </Button>
            </div>
            <div className="flex items-center justify-center rounded-md border-2 border-dashed border-gray-200 py-8">
              <p className="text-sm text-gray-400">No proposals yet.</p>
            </div>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Status
            </h3>
            <StatusBadge status={client.status} />
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Timeline
            </h3>
            <dl className="flex flex-col gap-3">
              <div>
                <dt className="mb-0.5 text-xs text-gray-500">Client since</dt>
                <dd className="text-sm text-gray-900">{formatDate(client.createdAt)}</dd>
              </div>
              <div>
                <dt className="mb-0.5 text-xs text-gray-500">Last updated</dt>
                <dd className="text-sm text-gray-900">{formatDate(client.updatedAt)}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

export default ClientDetailPage;

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
