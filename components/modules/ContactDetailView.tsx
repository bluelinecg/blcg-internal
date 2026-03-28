'use client';

// ContactDetailView — client component for the /contacts/[id] detail page.
// Edit flow:
//   1. User clicks Edit → open ContactFormModal pre-filled
//   2. PATCH /api/contacts/[id] → update local state
//
// Delete flow:
//   1. User clicks Delete → open ConfirmDialog (contacts have no blockers)
//   2. User confirms → DELETE /api/contacts/[id] → navigate to /contacts
//
// Props:
//   contact — the contact record to display

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { Button, Badge, Card, ConfirmDialog } from '@/components/ui';
import { ActivityFeed, ContactFormModal } from '@/components/modules';
import { formatDate } from '@/lib/utils/format';
import type { Contact, ContactStatus, Organization } from '@/lib/types/crm';

type ContactFormData = Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>;

interface ContactDetailViewProps {
  contact: Contact;
}

const STATUS_BADGE_VARIANT: Record<ContactStatus, 'green' | 'blue' | 'gray' | 'yellow'> = {
  active:   'green',
  prospect: 'blue',
  lead:     'yellow',
  inactive: 'gray',
};

export function ContactDetailView({ contact: initialContact }: ContactDetailViewProps) {
  const router = useRouter();
  const [contact, setContact]               = useState(initialContact);
  const [organization, setOrganization]     = useState<Organization | null>(null);
  const [organizations, setOrganizations]   = useState<Organization[]>([]);

  const [editOpen, setEditOpen]             = useState(false);
  const [isSaving, setIsSaving]             = useState(false);
  const [saveError, setSaveError]           = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen]         = useState(false);
  const [isDeleting, setIsDeleting]         = useState(false);
  const [actionError, setActionError]       = useState<string | null>(null);

  // Load organization details and full org list for the edit modal
  useEffect(() => {
    async function loadOrgs() {
      try {
        const res  = await fetch('/api/organizations?pageSize=200&sort=name&order=asc');
        const json = await res.json() as { data: Organization[] | null; error: string | null };
        const list = json.data ?? [];
        setOrganizations(list);
        if (contact.organizationId) {
          setOrganization(list.find((o) => o.id === contact.organizationId) ?? null);
        }
      } catch {
        // non-critical; org name degrades gracefully
      }
    }
    void loadOrgs();
  }, [contact.organizationId]);

  async function handleEdit(data: ContactFormData) {
    setIsSaving(true);
    setSaveError(null);
    try {
      const res  = await fetch(`/api/contacts/${contact.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });
      const json = await res.json() as { data: Contact | null; error: string | null };
      if (!res.ok || json.error) { setSaveError(json.error ?? 'Failed to update contact'); return; }
      if (json.data) setContact(json.data);
      setEditOpen(false);
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    setIsDeleting(true);
    setActionError(null);
    try {
      const res  = await fetch(`/api/contacts/${contact.id}`, { method: 'DELETE' });
      const json = await res.json() as { data: unknown; error: string | null };
      if (!res.ok || json.error) {
        setActionError(json.error ?? 'Failed to delete contact');
        setDeleteOpen(false);
        return;
      }
      router.push('/contacts');
      router.refresh();
    } catch {
      setActionError('Network error. Please try again.');
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  }

  const fullName = `${contact.firstName} ${contact.lastName}`;

  return (
    <PageShell>
      {/* Back link */}
      <Link
        href="/contacts"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700"
      >
        ← Back to Contacts
      </Link>

      {/* Page header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-base font-bold text-brand-blue">
            {getInitials(contact.firstName, contact.lastName)}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{fullName}</h2>
            {contact.title && (
              <p className="mt-0.5 text-sm text-gray-500">{contact.title}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => { setSaveError(null); setEditOpen(true); }}>
            Edit Contact
          </Button>
          <Button
            variant="ghost"
            onClick={() => { setActionError(null); setDeleteOpen(true); }}
            disabled={isDeleting}
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            Delete
          </Button>
        </div>
      </div>

      {actionError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-600">{actionError}</p>
        </div>
      )}

      {/* Body: 2-col layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left column */}
        <div className="col-span-2 flex flex-col gap-6">
          {/* Contact info */}
          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">Contact Information</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              {contact.email && (
                <div>
                  <dt className="mb-0.5 text-xs text-gray-500">Email</dt>
                  <dd className="text-sm text-gray-900">
                    <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                      {contact.email}
                    </a>
                  </dd>
                </div>
              )}
              <div>
                <dt className="mb-0.5 text-xs text-gray-500">Phone</dt>
                <dd className="text-sm text-gray-900">{contact.phone ?? <span className="text-gray-400">—</span>}</dd>
              </div>
              {contact.title && (
                <div>
                  <dt className="mb-0.5 text-xs text-gray-500">Title</dt>
                  <dd className="text-sm text-gray-900">{contact.title}</dd>
                </div>
              )}
            </dl>
          </Card>

          {/* Organization */}
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Organization</h3>
              {organization && (
                <Link
                  href={`/organizations/${organization.id}`}
                  className="text-xs text-brand-blue hover:underline"
                >
                  View org →
                </Link>
              )}
            </div>
            {organization ? (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="col-span-2">
                  <dt className="mb-0.5 text-xs text-gray-500">Name</dt>
                  <dd className="text-sm font-medium text-gray-900">{organization.name}</dd>
                </div>
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
              </dl>
            ) : (
              <p className="text-sm text-gray-400">No organization linked.</p>
            )}
          </Card>

          {/* Notes */}
          {contact.notes && (
            <Card className="p-6">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Notes</h3>
              <p className="text-sm leading-relaxed text-gray-600">{contact.notes}</p>
            </Card>
          )}

          {/* Proposals placeholder */}
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Proposals</h3>
            </div>
            <div className="flex items-center justify-center rounded-md border-2 border-dashed border-gray-200 py-8">
              <p className="text-sm text-gray-400">No proposals linked to this contact.</p>
            </div>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</h3>
            <Badge variant={STATUS_BADGE_VARIANT[contact.status]}>
              {contact.status.charAt(0).toUpperCase() + contact.status.slice(1)}
            </Badge>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Timeline</h3>
            <dl className="flex flex-col gap-3">
              <div>
                <dt className="mb-0.5 text-xs text-gray-500">Added</dt>
                <dd className="text-sm text-gray-900">{formatDate(contact.createdAt)}</dd>
              </div>
              <div>
                <dt className="mb-0.5 text-xs text-gray-500">Last updated</dt>
                <dd className="text-sm text-gray-900">{formatDate(contact.updatedAt)}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Activity</h3>
            <ActivityFeed entityType="contact" entityId={contact.id} pageSize={5} />
          </Card>
        </div>
      </div>

      {/* Edit modal */}
      <ContactFormModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleEdit}
        initial={{
          firstName:      contact.firstName,
          lastName:       contact.lastName,
          email:          contact.email,
          phone:          contact.phone,
          title:          contact.title,
          organizationId: contact.organizationId,
          status:         contact.status,
          notes:          contact.notes,
        }}
        organizations={organizations}
        isSaving={isSaving}
        saveError={saveError}
      />

      {/* Delete confirm dialog */}
      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Contact"
        description={`Are you sure you want to delete ${fullName}? This cannot be undone.`}
        confirmLabel="Delete Contact"
        confirmVariant="danger"
        isLoading={isDeleting}
      />
    </PageShell>
  );
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}
