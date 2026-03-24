'use client';

// Organizations page — searchable list with full CRUD.
// Create/edit via OrganizationFormModal, delete via ConfirmDialog (blocked if contacts exist).

import { useState, useEffect, useMemo } from 'react';
import { PageShell } from '@/components/layout';
import { PageHeader } from '@/components/layout';
import {
  Button, Badge, Card, ConfirmDialog, Spinner, Input,
} from '@/components/ui';
import { OrganizationFormModal } from '@/components/modules';
import { useRole } from '@/lib/auth/use-role';
import type { Organization } from '@/lib/types/crm';

type OrgFormData = Omit<Organization, 'id' | 'createdAt' | 'updatedAt' | 'contactCount'>;

export default function OrganizationsPage() {
  const role    = useRole();
  const isAdmin = role === 'admin';
  const canEdit = role !== 'viewer';

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [fetchError, setFetchError]       = useState<string | null>(null);
  const [search, setSearch]               = useState('');

  const [formOpen, setFormOpen]   = useState(false);
  const [editing, setEditing]     = useState<Organization | null>(null);
  const [isSaving, setIsSaving]   = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null);
  const [blockers, setBlockers]         = useState<string[]>([]);
  const [isDeleting, setIsDeleting]     = useState(false);
  const [deleteError, setDeleteError]   = useState<string | null>(null);

  useEffect(() => { void loadData(); }, []);

  async function loadData() {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res  = await fetch('/api/organizations?pageSize=200&sort=name&order=asc');
      const json = await res.json() as { data: Organization[] | null; error: string | null };
      if (!res.ok || json.error) { setFetchError(json.error ?? 'Failed to load organizations'); return; }
      setOrganizations(json.data ?? []);
    } catch {
      setFetchError('Failed to load organizations');
    } finally {
      setIsLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return organizations;
    return organizations.filter((o) =>
      o.name.toLowerCase().includes(q) ||
      o.industry?.toLowerCase().includes(q) ||
      o.phone?.toLowerCase().includes(q),
    );
  }, [organizations, search]);

  // --- CRUD ---

  async function handleCreate(data: OrgFormData) {
    setIsSaving(true);
    setSaveError(null);
    try {
      const res  = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json() as { data: Organization | null; error: string | null };
      if (!res.ok || json.error) { setSaveError(json.error ?? 'Failed to create organization'); return; }
      if (json.data) setOrganizations((prev) => [json.data!, ...prev]);
      closeForm();
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEdit(data: OrgFormData) {
    if (!editing) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const res  = await fetch(`/api/organizations/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json() as { data: Organization | null; error: string | null };
      if (!res.ok || json.error) { setSaveError(json.error ?? 'Failed to update organization'); return; }
      if (json.data) setOrganizations((prev) => prev.map((o) => (o.id === editing.id ? json.data! : o)));
      closeForm();
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function openDelete(org: Organization) {
    setDeleteTarget(org);
    setDeleteError(null);
    try {
      const res  = await fetch(`/api/organizations/${org.id}/blockers`);
      const json = await res.json() as { data: string[] | null; error: string | null };
      setBlockers(json.data ?? []);
    } catch {
      setBlockers([]);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res  = await fetch(`/api/organizations/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json() as { data: unknown; error: string | null };
      if (!res.ok || json.error) { setDeleteError(json.error ?? 'Failed to delete organization'); setDeleteTarget(null); return; }
      setOrganizations((prev) => prev.filter((o) => o.id !== deleteTarget.id));
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
        title="Organizations"
        subtitle="Companies and groups linked to your contacts and workflows"
        actions={canEdit && (
          <Button onClick={() => { setEditing(null); setSaveError(null); setFormOpen(true); }}>
            + New Organization
          </Button>
        )}
      />

      {deleteError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-600">{deleteError}</p>
        </div>
      )}

      <div className="mb-5">
        <Input
          placeholder="Search organizations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
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
            <p className="text-sm text-gray-400">No organizations yet. Add one to get started.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Industry</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Contacts</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((org) => (
                <tr key={org.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{org.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{org.industry ?? <span className="text-gray-400">—</span>}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{org.phone ?? <span className="text-gray-400">—</span>}</td>
                  <td className="px-6 py-4">
                    <Badge variant={(org.contactCount ?? 0) > 0 ? 'blue' : 'gray'}>
                      {org.contactCount ?? 0}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canEdit && (
                        <button
                          onClick={() => { setEditing(org); setSaveError(null); setFormOpen(true); }}
                          className="text-xs text-gray-400 hover:text-brand-blue transition-colors px-1"
                        >
                          Edit
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => openDelete(org)}
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
        )}
      </Card>

      <OrganizationFormModal
        isOpen={formOpen}
        onClose={closeForm}
        onSave={editing ? handleEdit : handleCreate}
        initial={editing ? {
          name:     editing.name,
          website:  editing.website,
          phone:    editing.phone,
          industry: editing.industry,
          address:  editing.address,
          notes:    editing.notes,
        } : undefined}
        isSaving={isSaving}
        saveError={saveError}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Organization"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        blockedBy={blockers}
        isLoading={isDeleting}
      />
    </PageShell>
  );
}
