'use client';

// OrganizationDetailView — client component for the /organizations/[id] detail page.
// Edit flow:
//   1. User clicks Edit → open OrganizationFormModal pre-filled
//   2. PATCH /api/organizations/[id] → update local state
//
// Delete flow:
//   1. User clicks Delete → fetch /api/organizations/[id]/blockers
//   2. Open ConfirmDialog with blockers; confirm button disabled when blocked
//   3. User confirms → DELETE /api/organizations/[id] → navigate to /organizations
//
// Props:
//   organization — the organization record to display

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { Button, Card, ConfirmDialog } from '@/components/ui';
import { ActivityFeed, OrganizationFormModal } from '@/components/modules';
import { formatDate } from '@/lib/utils/format';
import type { Contact, Organization } from '@/lib/types/crm';

type OrgFormData = Omit<Organization, 'id' | 'createdAt' | 'updatedAt' | 'contactCount'>;

interface OrganizationDetailViewProps {
  organization: Organization;
}

export function OrganizationDetailView({ organization: initialOrg }: OrganizationDetailViewProps) {
  const router = useRouter();
  const [organization, setOrganization]   = useState(initialOrg);
  const [contacts, setContacts]           = useState<Contact[]>([]);

  const [editOpen, setEditOpen]           = useState(false);
  const [isSaving, setIsSaving]           = useState(false);
  const [saveError, setSaveError]         = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen]       = useState(false);
  const [deleteBlockers, setDeleteBlockers] = useState<string[]>([]);
  const [isCheckingDeps, setIsCheckingDeps] = useState(false);
  const [isDeleting, setIsDeleting]       = useState(false);
  const [actionError, setActionError]     = useState<string | null>(null);

  // Load contacts linked to this org
  useEffect(() => {
    async function loadContacts() {
      try {
        const res  = await fetch(`/api/contacts?organizationId=${organization.id}&pageSize=100&sort=last_name&order=asc`);
        const json = await res.json() as { data: Contact[] | null; error: string | null };
        setContacts(json.data ?? []);
      } catch {
        // non-critical; contact list degrades gracefully
      }
    }
    void loadContacts();
  }, [organization.id]);

  async function handleEdit(data: OrgFormData) {
    setIsSaving(true);
    setSaveError(null);
    try {
      const res  = await fetch(`/api/organizations/${organization.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });
      const json = await res.json() as { data: Organization | null; error: string | null };
      if (!res.ok || json.error) { setSaveError(json.error ?? 'Failed to update organization'); return; }
      if (json.data) setOrganization(json.data);
      setEditOpen(false);
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function openDelete() {
    setIsCheckingDeps(true);
    setActionError(null);
    try {
      const res  = await fetch(`/api/organizations/${organization.id}/blockers`);
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
      const res  = await fetch(`/api/organizations/${organization.id}`, { method: 'DELETE' });
      const json = await res.json() as { data: unknown; error: string | null };
      if (!res.ok || json.error) {
        setActionError(json.error ?? 'Failed to delete organization');
        setDeleteOpen(false);
        return;
      }
      router.push('/organizations');
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
        href="/organizations"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700"
      >
        ← Back to Organizations
      </Link>

      {/* Page header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-base font-bold text-brand-blue">
            {getInitials(organization.name)}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{organization.name}</h2>
            {organization.industry && (
              <p className="mt-0.5 text-sm text-gray-500">{organization.industry}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => { setSaveError(null); setEditOpen(true); }}>
            Edit Organization
          </Button>
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

      {/* Body: 3-col layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left column */}
        <div className="col-span-2 flex flex-col gap-6">
          {/* Organization info */}
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">Organization Details</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              {organization.phone && (
                <div>
                  <dt className="mb-0.5 text-xs text-gray-500">Phone</dt>
                  <dd className="text-sm text-gray-900">{organization.phone}</dd>
                </div>
              )}
              {organization.website && (
                <div>
                  <dt className="mb-0.5 text-xs text-gray-500">Website</dt>
                  <dd className="text-sm text-gray-900">
                    <a href={organization.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {organization.website}
                    </a>
                  </dd>
                </div>
              )}
              {organization.industry && (
                <div>
                  <dt className="mb-0.5 text-xs text-gray-500">Industry</dt>
                  <dd className="text-sm text-gray-900">{organization.industry}</dd>
                </div>
              )}
              {organization.address && (
                <div className="col-span-2">
                  <dt className="mb-0.5 text-xs text-gray-500">Address</dt>
                  <dd className="text-sm text-gray-900">{organization.address}</dd>
                </div>
              )}
            </dl>
          </Card>

          {/* Contacts */}
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">
              Contacts
              {contacts.length > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-400">({contacts.length})</span>
              )}
            </h3>
            {contacts.length > 0 ? (
              <ul className="flex flex-col divide-y divide-gray-50">
                {contacts.map((contact) => (
                  <li key={contact.id} className="flex items-start justify-between py-3 first:pt-0 last:pb-0">
                    <div>
                      <Link
                        href={`/contacts/${contact.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-brand-blue hover:underline"
                      >
                        {contact.firstName} {contact.lastName}
                      </Link>
                      {contact.title && (
                        <span className="ml-1 text-xs text-gray-400">— {contact.title}</span>
                      )}
                      {contact.email && (
                        <div className="mt-0.5 text-xs text-gray-500">
                          <a href={`mailto:${contact.email}`} className="hover:underline">
                            {contact.email}
                          </a>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="mt-0.5 text-xs text-gray-500">{contact.phone}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">No contacts linked to this organization.</p>
            )}
          </Card>

          {/* Notes */}
          {organization.notes && (
            <Card className="p-6">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Notes</h3>
              <p className="text-sm leading-relaxed text-gray-600">{organization.notes}</p>
            </Card>
          )}

          {/* Proposals placeholder */}
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Proposals</h3>
            </div>
            <div className="flex items-center justify-center rounded-md border-2 border-dashed border-gray-200 py-8">
              <p className="text-sm text-gray-400">No proposals linked to this organization.</p>
            </div>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Timeline</h3>
            <dl className="flex flex-col gap-3">
              <div>
                <dt className="mb-0.5 text-xs text-gray-500">Added</dt>
                <dd className="text-sm text-gray-900">{formatDate(organization.createdAt)}</dd>
              </div>
              <div>
                <dt className="mb-0.5 text-xs text-gray-500">Last updated</dt>
                <dd className="text-sm text-gray-900">{formatDate(organization.updatedAt)}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Activity</h3>
            <ActivityFeed entityType="organization" entityId={organization.id} pageSize={5} />
          </Card>
        </div>
      </div>

      {/* Edit modal */}
      <OrganizationFormModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleEdit}
        initial={{
          name:     organization.name,
          website:  organization.website,
          phone:    organization.phone,
          industry: organization.industry,
          address:  organization.address,
          notes:    organization.notes,
        }}
        isSaving={isSaving}
        saveError={saveError}
      />

      {/* Delete confirm dialog */}
      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Organization"
        description={`Are you sure you want to delete ${organization.name}? This cannot be undone.`}
        confirmLabel="Delete Organization"
        confirmVariant="danger"
        blockedBy={deleteBlockers}
        isLoading={isDeleting}
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
