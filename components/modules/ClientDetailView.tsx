'use client';

// ClientDetailView — client component for the /clients/[id] detail page.
// Delete flow:
//   1. User clicks Delete → fetch /api/clients/[id]/blockers
//   2. Open ConfirmDialog with blockers (if any); confirm button disabled when blocked
//   3. User confirms → DELETE /api/clients/[id] → navigate to /clients
//
// Props:
//   client — the client record to display

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { Button, Card, ConfirmDialog } from '@/components/ui';
import { StatusBadge, ActivityFeed } from '@/components/modules';
import { formatDate } from '@/lib/utils/format';
import type { Client } from '@/lib/types/clients';
import type { Contact } from '@/lib/types/crm';

interface ClientDetailViewProps {
  client: Client;
}

export function ClientDetailView({ client }: ClientDetailViewProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen]         = useState(false);
  const [deleteBlockers, setDeleteBlockers] = useState<string[]>([]);
  const [isCheckingDeps, setIsCheckingDeps] = useState(false);
  const [isDeleting, setIsDeleting]         = useState(false);
  const [actionError, setActionError]       = useState<string | null>(null);
  const [orgContacts, setOrgContacts]       = useState<Contact[]>([]);

  useEffect(() => {
    if (!client.organizationId) return;

    async function fetchContacts() {
      try {
        const res = await fetch(`/api/contacts?organizationId=${client.organizationId}&pageSize=100`);
        const json = await res.json() as { data: Contact[] | null; error: string | null };
        setOrgContacts(json.data ?? []);
      } catch {
        setOrgContacts([]);
      }
    }

    void fetchContacts();
  }, [client.organizationId]);

  async function openDelete() {
    setIsCheckingDeps(true);
    setActionError(null);
    try {
      const res  = await fetch(`/api/clients/${client.id}/blockers`);
      const json = await res.json() as { data: string[] | null; error: string | null };

      if (!res.ok || json.error) {
        setActionError(json.error ?? 'Could not check dependencies');
        return;
      }

      setDeleteBlockers(json.data ?? []);
      setDeleteOpen(true);
    } catch {
      setActionError('Network error. Please try again.');
    } finally {
      setIsCheckingDeps(false);
    }
  }

  async function confirmDelete() {
    setIsDeleting(true);
    setActionError(null);
    try {
      const res  = await fetch(`/api/clients/${client.id}`, { method: 'DELETE' });
      const json = await res.json() as { data: unknown; error: string | null };

      if (!res.ok || json.error) {
        setActionError(json.error ?? 'Failed to delete client');
        setDeleteOpen(false);
        return;
      }

      router.push('/clients');
      router.refresh();
    } catch {
      setActionError('Network error. Please try again.');
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  }

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
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-base font-bold text-brand-blue">
            {getInitials(client.name)}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{client.name}</h2>
            {client.contactName && (
              <p className="mt-0.5 text-sm text-gray-500">{client.contactName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/clients/${client.id}/edit`}>
            <Button variant="secondary">Edit Client</Button>
          </Link>
          <Button
            variant="ghost"
            onClick={openDelete}
            disabled={isCheckingDeps || isDeleting}
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            {isCheckingDeps ? 'Checking…' : 'Delete'}
          </Button>
        </div>
      </div>

      {actionError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-600">{actionError}</p>
        </div>
      )}

      {/* Body: 2-col layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="md:col-span-2 flex flex-col gap-6">
          {/* Contact / Organization info */}
          <Card className="p-6">
            {client.organization ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">Organization</h3>
                  <Link
                    href={`/organizations/${client.organization.id}`}
                    className="text-xs text-brand-blue hover:underline"
                  >
                    View org →
                  </Link>
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="sm:col-span-2">
                    <dt className="mb-0.5 text-xs text-gray-500">Organization</dt>
                    <dd className="text-sm font-medium text-gray-900">{client.organization.name}</dd>
                  </div>
                  {client.organization.phone && (
                    <div>
                      <dt className="mb-0.5 text-xs text-gray-500">Phone</dt>
                      <dd className="text-sm text-gray-900">{client.organization.phone}</dd>
                    </div>
                  )}
                  {client.organization.website && (
                    <div>
                      <dt className="mb-0.5 text-xs text-gray-500">Website</dt>
                      <dd className="text-sm text-gray-900">
                        <a href={client.organization.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {client.organization.website}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
                {orgContacts.length > 0 && (
                  <div className="mt-5 border-t border-gray-100 pt-4">
                    <h4 className="mb-3 text-xs font-semibold text-gray-500">Contacts at this org</h4>
                    <ul className="flex flex-col gap-2">
                      {orgContacts.map((contact) => (
                        <li key={contact.id} className="flex items-start justify-between text-sm">
                          <div>
                            <span className="font-medium text-gray-900">{contact.firstName} {contact.lastName}</span>
                            {contact.title && <span className="ml-1 text-gray-400">— {contact.title}</span>}
                            {contact.email && (
                              <div className="text-xs text-gray-500">
                                <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a>
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <>
                <h3 className="mb-4 text-sm font-semibold text-gray-700">Contact Information</h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <dt className="mb-0.5 text-xs text-gray-500">Email</dt>
                    <dd className="text-sm text-gray-900">
                      <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline">
                        {client.email}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="mb-0.5 text-xs text-gray-500">Phone</dt>
                    <dd className="text-sm text-gray-900">{client.phone ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="mb-0.5 text-xs text-gray-500">Contact</dt>
                    <dd className="text-sm text-gray-900">{client.contactName}</dd>
                  </div>
                </dl>
              </>
            )}
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
              <Button size="sm" variant="secondary">+ New Proposal</Button>
            </div>
            <div className="flex items-center justify-center rounded-md border-2 border-dashed border-gray-200 py-8">
              <p className="text-sm text-gray-400">No proposals yet.</p>
            </div>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</h3>
            <StatusBadge status={client.status} />
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Timeline</h3>
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

          <Card className="p-5">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Activity</h3>
            <ActivityFeed entityType="client" entityId={client.id} pageSize={5} />
          </Card>
        </div>
      </div>

      {/* Delete confirm dialog */}
      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Client"
        description={`Are you sure you want to delete ${client.name}? This cannot be undone.`}
        confirmLabel="Delete Client"
        confirmVariant="danger"
        blockedBy={deleteBlockers}
      />
    </PageShell>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
