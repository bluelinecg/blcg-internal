'use client';

// Contacts page — searchable list with status/org filters and full CRUD.
// Create/edit via ContactFormModal, delete via ConfirmDialog (no dependency blockers).

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { PageHeader } from '@/components/layout';
import {
  Button, Badge, Card, ConfirmDialog, Spinner, Input, Select,
} from '@/components/ui';
import { ContactFormModal } from '@/components/modules';
import { useRole } from '@/lib/auth/use-role';
import type { Contact, ContactStatus, Organization } from '@/lib/types/crm';

type ContactFormData = Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>;

const STATUS_BADGE_VARIANT: Record<ContactStatus, 'green' | 'blue' | 'gray' | 'yellow'> = {
  active:   'green',
  prospect: 'blue',
  lead:     'yellow',
  inactive: 'gray',
};

const STATUS_OPTIONS = [
  { value: '',         label: 'All statuses' },
  { value: 'lead',     label: 'Lead' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'active',   label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function ContactsPage() {
  const role    = useRole();
  const isAdmin = role === 'admin';
  const canEdit = role !== 'viewer';

  const [contacts, setContacts]           = useState<Contact[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [fetchError, setFetchError]       = useState<string | null>(null);
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState('');

  const [formOpen, setFormOpen]   = useState(false);
  const [editing, setEditing]     = useState<Contact | null>(null);
  const [isSaving, setIsSaving]   = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [isDeleting, setIsDeleting]     = useState(false);
  const [deleteError, setDeleteError]   = useState<string | null>(null);

  useEffect(() => { void loadData(); }, []);

  async function loadData() {
    setIsLoading(true);
    setFetchError(null);
    try {
      const [contactsRes, orgsRes] = await Promise.all([
        fetch('/api/contacts?pageSize=200&sort=last_name&order=asc'),
        fetch('/api/organizations?pageSize=200&sort=name&order=asc'),
      ]);
      const [contactsJson, orgsJson] = await Promise.all([
        contactsRes.json() as Promise<{ data: Contact[] | null; error: string | null }>,
        orgsRes.json()     as Promise<{ data: Organization[] | null; error: string | null }>,
      ]);
      if (!contactsRes.ok || contactsJson.error) { setFetchError(contactsJson.error ?? 'Failed to load contacts'); return; }
      setContacts(contactsJson.data ?? []);
      setOrganizations(orgsJson.data ?? []);
    } catch {
      setFetchError('Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  }

  const orgMap = useMemo(
    () => new Map(organizations.map((o) => [o.id, o.name])),
    [organizations],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contacts.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        (c.organizationId && orgMap.get(c.organizationId)?.toLowerCase().includes(q))
      );
    });
  }, [contacts, search, statusFilter, orgMap]);

  // --- CRUD ---

  async function handleCreate(data: ContactFormData) {
    setIsSaving(true);
    setSaveError(null);
    try {
      const res  = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json() as { data: Contact | null; error: string | null };
      if (!res.ok || json.error) { setSaveError(json.error ?? 'Failed to create contact'); return; }
      if (json.data) setContacts((prev) => [json.data!, ...prev]);
      closeForm();
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEdit(data: ContactFormData) {
    if (!editing) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const res  = await fetch(`/api/contacts/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json() as { data: Contact | null; error: string | null };
      if (!res.ok || json.error) { setSaveError(json.error ?? 'Failed to update contact'); return; }
      if (json.data) setContacts((prev) => prev.map((c) => (c.id === editing.id ? json.data! : c)));
      closeForm();
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res  = await fetch(`/api/contacts/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json() as { data: unknown; error: string | null };
      if (!res.ok || json.error) { setDeleteError(json.error ?? 'Failed to delete contact'); setDeleteTarget(null); return; }
      setContacts((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setDeleteError('Network error. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setSaveError(null);
  }

  return (
    <PageShell>
      <PageHeader
        title="Contacts"
        subtitle="Individuals linked to your organizations and workflows"
        actions={canEdit && (
          <Button onClick={() => { setEditing(null); setSaveError(null); setFormOpen(true); }}>
            + New Contact
          </Button>
        )}
      />

      {deleteError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-600">{deleteError}</p>
        </div>
      )}

      <div className="mb-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <Input
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72"
        />
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-44"
        />
      </div>

      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Spinner /></div>
        ) : fetchError ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-red-500">{fetchError}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-gray-400">No contacts yet. Add one to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Organization</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Phone</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((contact) => (
                  <tr key={contact.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <Link href={`/contacts/${contact.id}`} className="hover:text-brand-blue hover:underline">
                        {contact.firstName} {contact.lastName}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={STATUS_BADGE_VARIANT[contact.status]}>
                        {contact.status.charAt(0).toUpperCase() + contact.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{contact.title ?? <span className="text-gray-400">—</span>}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {contact.organizationId ? (orgMap.get(contact.organizationId) ?? <span className="text-gray-400">—</span>) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{contact.email ?? <span className="text-gray-400">—</span>}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{contact.phone ?? <span className="text-gray-400">—</span>}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canEdit && (
                          <button
                            onClick={() => { setEditing(contact); setSaveError(null); setFormOpen(true); }}
                            className="text-xs text-gray-400 hover:text-brand-blue transition-colors px-1"
                          >
                            Edit
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => { setDeleteTarget(contact); setDeleteError(null); }}
                            className="text-xs text-gray-400 hover:text-red-500 transition-colors px-1"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ContactFormModal
        isOpen={formOpen}
        onClose={closeForm}
        onSave={editing ? handleEdit : handleCreate}
        initial={editing ? {
          firstName:      editing.firstName,
          lastName:       editing.lastName,
          email:          editing.email,
          phone:          editing.phone,
          title:          editing.title,
          organizationId: editing.organizationId,
          status:         editing.status,
          notes:          editing.notes,
        } : undefined}
        organizations={organizations}
        isSaving={isSaving}
        saveError={saveError}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Contact"
        description={`Are you sure you want to delete "${deleteTarget?.firstName} ${deleteTarget?.lastName}"? This cannot be undone.`}
        isLoading={isDeleting}
      />
    </PageShell>
  );
}
