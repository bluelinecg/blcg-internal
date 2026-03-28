'use client';

// Catalog page — searchable list of services/products with full CRUD.
// Create/edit via CatalogItemFormModal, delete via ConfirmDialog (admin only).
// Items can be filtered by category and active status.

import { useState, useEffect, useMemo } from 'react';
import { PageShell } from '@/components/layout';
import { PageHeader } from '@/components/layout';
import { Button, Badge, Card, ConfirmDialog, Spinner, Input, Select } from '@/components/ui';
import { CatalogItemFormModal } from '@/components/modules';
import { useRole } from '@/lib/auth/use-role';
import type { CatalogItem } from '@/lib/types/catalog';

type CatalogItemFormData = Omit<CatalogItem, 'id' | 'createdAt' | 'updatedAt'>;

const ACTIVE_OPTIONS = [
  { value: '',      label: 'All items' },
  { value: 'true',  label: 'Active only' },
  { value: 'false', label: 'Inactive only' },
];

export default function CatalogPage() {
  const role    = useRole();
  const isAdmin = role === 'admin';
  const canEdit = role !== 'viewer';

  const [items, setItems]             = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [fetchError, setFetchError]   = useState<string | null>(null);
  const [search, setSearch]           = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  const [formOpen, setFormOpen]   = useState(false);
  const [editing, setEditing]     = useState<CatalogItem | null>(null);
  const [isSaving, setIsSaving]   = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<CatalogItem | null>(null);
  const [isDeleting, setIsDeleting]     = useState(false);
  const [deleteError, setDeleteError]   = useState<string | null>(null);

  useEffect(() => { void loadData(); }, []);

  async function loadData() {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res  = await fetch('/api/catalog?pageSize=200&sort=name&order=asc');
      const json = await res.json() as { data: CatalogItem[] | null; error: string | null };
      if (!res.ok || json.error) { setFetchError(json.error ?? 'Failed to load catalog'); return; }
      setItems(json.data ?? []);
    } catch {
      setFetchError('Failed to load catalog');
    } finally {
      setIsLoading(false);
    }
  }

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category).filter(Boolean) as string[])).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((item) => {
      if (activeFilter === 'true'  && !item.isActive) return false;
      if (activeFilter === 'false' && item.isActive)  return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q)
      );
    });
  }, [items, search, activeFilter]);

  // --- CRUD ---

  async function handleCreate(data: CatalogItemFormData) {
    setIsSaving(true);
    setSaveError(null);
    try {
      const res  = await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json() as { data: CatalogItem | null; error: string | null };
      if (!res.ok || json.error) { setSaveError(json.error ?? 'Failed to create item'); return; }
      if (json.data) setItems((prev) => [...prev, json.data!].sort((a, b) => a.name.localeCompare(b.name)));
      closeForm();
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEdit(data: CatalogItemFormData) {
    if (!editing) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const res  = await fetch(`/api/catalog/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json() as { data: CatalogItem | null; error: string | null };
      if (!res.ok || json.error) { setSaveError(json.error ?? 'Failed to update item'); return; }
      if (json.data) setItems((prev) => prev.map((i) => (i.id === editing.id ? json.data! : i)));
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
      const res  = await fetch(`/api/catalog/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json() as { data: unknown; error: string | null };
      if (!res.ok || json.error) { setDeleteError(json.error ?? 'Failed to delete item'); setDeleteTarget(null); return; }
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
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
        title="Catalog"
        subtitle="Standard services and products with default pricing"
        actions={canEdit && (
          <Button onClick={() => { setEditing(null); setSaveError(null); setFormOpen(true); }}>
            + New Item
          </Button>
        )}
      />

      {deleteError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-600">{deleteError}</p>
        </div>
      )}

      <div className="mb-5 flex gap-3">
        <Input
          placeholder="Search catalog..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
        />
        <Select
          options={ACTIVE_OPTIONS}
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="w-40"
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
            <p className="text-sm text-gray-400">
              {items.length === 0
                ? 'No catalog items yet. Add one to get started.'
                : 'No items match your filters.'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Category</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Description</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Unit Price</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.category ?? <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {item.description ?? <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={item.isActive ? 'green' : 'gray'}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canEdit && (
                        <button
                          onClick={() => { setEditing(item); setSaveError(null); setFormOpen(true); }}
                          className="text-xs text-gray-400 hover:text-brand-blue transition-colors px-1"
                        >
                          Edit
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => { setDeleteTarget(item); setDeleteError(null); }}
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

      <CatalogItemFormModal
        isOpen={formOpen}
        onClose={closeForm}
        onSave={editing ? handleEdit : handleCreate}
        initial={editing ? {
          name:        editing.name,
          description: editing.description,
          unitPrice:   editing.unitPrice,
          category:    editing.category,
          isActive:    editing.isActive,
        } : undefined}
        isSaving={isSaving}
        saveError={saveError}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Catalog Item"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        isLoading={isDeleting}
      />
    </PageShell>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style:    'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}
