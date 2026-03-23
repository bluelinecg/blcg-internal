'use client';

// Proposals list page — fetches live data from /api/proposals.
// Create/edit via ProposalFormModal, delete with dependency check via ConfirmDialog.

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { PageHeader } from '@/components/layout';
import { Button, Card, Input, Select, Spinner, ExpandableTable, ConfirmDialog } from '@/components/ui';
import { useRole } from '@/lib/auth/use-role';
import type { TableColumn } from '@/components/ui/ExpandableTable';
import { ProposalStatusBadge, ProposalFormModal } from '@/components/modules';
import type { Proposal, ProposalStatus } from '@/lib/types/proposals';
import type { Client } from '@/lib/types/clients';

type StatusFilter = ProposalStatus | 'all';

const STATUS_FILTER_OPTIONS = [
  { value: 'all',      label: 'All Statuses' },
  { value: 'draft',    label: 'Draft' },
  { value: 'sent',     label: 'Sent' },
  { value: 'viewed',   label: 'Viewed' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'expired',  label: 'Expired' },
];

type ProposalFormData = Omit<Proposal, 'id' | 'createdAt' | 'updatedAt'>;

export function ProposalsPage() {
  const isAdmin = useRole() === 'admin';
  const [proposals, setProposals]   = useState<Proposal[]>([]);
  const [clients, setClients]       = useState<Client[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Create/edit modal
  const [formOpen, setFormOpen]   = useState(false);
  const [editing, setEditing]     = useState<Proposal | null>(null);
  const [isSaving, setIsSaving]   = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget]   = useState<Proposal | null>(null);
  const [deleteBlockers, setDeleteBlockers] = useState<string[]>([]);
  const [isCheckingDeps, setIsCheckingDeps] = useState(false);
  const [isDeleting, setIsDeleting]       = useState(false);
  const [deleteError, setDeleteError]     = useState<string | null>(null);

  // Load proposals and clients in parallel
  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    setFetchError(null);
    try {
      const [proposalsRes, clientsRes] = await Promise.all([
        fetch('/api/proposals'),
        fetch('/api/clients'),
      ]);
      const proposalsJson = await proposalsRes.json() as { data: Proposal[] | null; error: string | null };
      const clientsJson   = await clientsRes.json()   as { data: Client[]   | null; error: string | null };
      if (!proposalsRes.ok || proposalsJson.error) {
        setFetchError(proposalsJson.error ?? 'Failed to load proposals');
      } else {
        setProposals(proposalsJson.data ?? []);
      }
      if (clientsRes.ok && !clientsJson.error) {
        setClients(clientsJson.data ?? []);
      }
    } catch {
      setFetchError('Failed to load proposals');
    } finally {
      setIsLoading(false);
    }
  }

  const clientMap = useMemo(
    () => Object.fromEntries(clients.map((c) => [c.id, c])),
    [clients]
  );

  const filtered = useMemo(() => {
    return proposals.filter((p) => {
      const client = clientMap[p.clientId];
      const q = search.toLowerCase();
      const matchesSearch =
        q === '' ||
        p.title.toLowerCase().includes(q) ||
        (client?.name.toLowerCase().includes(q) ?? false) ||
        (client?.contactName.toLowerCase().includes(q) ?? false);
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [proposals, search, statusFilter]);

  // --- CRUD handlers ---

  async function handleCreate(data: ProposalFormData) {
    setIsSaving(true);
    setSaveError(null);
    try {
      const res  = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json() as { data: Proposal | null; error: string | null };
      if (!res.ok || json.error) {
        setSaveError(json.error ?? 'Failed to create proposal');
        return;
      }
      if (json.data) setProposals((prev) => [json.data!, ...prev]);
      setFormOpen(false);
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEdit(data: ProposalFormData) {
    if (!editing) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const res  = await fetch(`/api/proposals/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json() as { data: Proposal | null; error: string | null };
      if (!res.ok || json.error) {
        setSaveError(json.error ?? 'Failed to update proposal');
        return;
      }
      if (json.data) {
        setProposals((prev) => prev.map((p) => (p.id === editing.id ? json.data! : p)));
      }
      closeForm();
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  function openEdit(proposal: Proposal) {
    setEditing(proposal);
    setSaveError(null);
    setFormOpen(true);
  }

  async function openDelete(proposal: Proposal) {
    setIsCheckingDeps(true);
    setDeleteError(null);
    try {
      const res  = await fetch(`/api/proposals/${proposal.id}/blockers`);
      const json = await res.json() as { data: string[] | null; error: string | null };
      if (!res.ok || json.error) {
        setDeleteError(json.error ?? 'Could not check dependencies');
        return;
      }
      setDeleteBlockers(json.data ?? []);
      setDeleteTarget(proposal);
    } catch {
      setDeleteError('Network error. Please try again.');
    } finally {
      setIsCheckingDeps(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res  = await fetch(`/api/proposals/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json() as { data: unknown; error: string | null };
      if (!res.ok || json.error) {
        setDeleteError(json.error ?? 'Failed to delete proposal');
        setDeleteTarget(null);
        return;
      }
      setProposals((prev) => prev.filter((p) => p.id !== deleteTarget.id));
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

  // --- Summary stats ---
  const totalValue    = proposals.reduce((s, p) => s + p.totalValue, 0);
  const acceptedValue = proposals.filter((p) => p.status === 'accepted').reduce((s, p) => s + p.totalValue, 0);
  const openCount     = proposals.filter((p) => p.status === 'sent' || p.status === 'viewed').length;
  const draftCount    = proposals.filter((p) => p.status === 'draft').length;

  // --- Table columns ---
  const COLUMNS: TableColumn<Proposal>[] = [
    {
      key: 'title',
      header: 'Proposal',
      render: (p) => <span className="font-medium text-gray-900">{p.title}</span>,
    },
    {
      key: 'client',
      header: 'Client',
      render: (p) => {
        const client = clientMap[p.clientId];
        return (
          <div>
            <p className="text-sm text-gray-800">{client?.name ?? '—'}</p>
            <p className="text-xs text-gray-400">{client?.contactName ?? ''}</p>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <ProposalStatusBadge status={p.status} />,
      width: '120px',
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (p) => <span className="font-semibold text-gray-900">{formatCurrency(p.totalValue)}</span>,
      width: '120px',
    },
    {
      key: 'sent',
      header: 'Sent',
      render: (p) => <span className="text-gray-500">{p.sentAt ? formatDate(p.sentAt) : '—'}</span>,
      width: '110px',
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (p) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>Edit</Button>
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openDelete(p)}
              disabled={isCheckingDeps}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              Delete
            </Button>
          )}
        </div>
      ),
      width: '140px',
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Proposals"
        subtitle={isLoading ? 'Loading…' : `${proposals.length} total proposals`}
        actions={
          <Button onClick={() => { setEditing(null); setSaveError(null); setFormOpen(true); }}>
            + New Proposal
          </Button>
        }
      />

      {deleteError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-600">{deleteError}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <Input
          placeholder="Search by title or client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
        />
        <Select
          options={STATUS_FILTER_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="w-44"
        />
      </div>

      {/* Summary stats */}
      <div className="flex gap-4 mb-5">
        {[
          { label: 'Total Value', value: formatCurrency(totalValue) },
          { label: 'Accepted',    value: formatCurrency(acceptedValue) },
          { label: 'Open',        value: openCount },
          { label: 'Drafts',      value: draftCount },
        ].map((s) => (
          <div key={s.label} className="flex flex-col rounded-md border border-gray-200 bg-white px-4 py-3 min-w-32">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{s.label}</span>
            <span className="mt-1 text-xl font-bold text-gray-900">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Spinner /></div>
        ) : fetchError ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-red-500">{fetchError}</p>
          </div>
        ) : (
          <ExpandableTable
            columns={COLUMNS}
            rows={filtered}
            getRowId={(p) => p.id}
            renderExpanded={(p) => <ProposalLineItemsPanel proposal={p} client={clientMap[p.clientId]} />}
            emptyMessage="No proposals match your search."
          />
        )}
      </Card>

      {/* Create / Edit modal */}
      <ProposalFormModal
        isOpen={formOpen}
        onClose={closeForm}
        onSave={editing ? handleEdit : handleCreate}
        initial={editing ?? undefined}
        clients={clients}
        isSaving={isSaving}
        saveError={saveError}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Proposal"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        blockedBy={deleteBlockers}
      />
    </PageShell>
  );
}

export default ProposalsPage;

// --- Line items expanded panel ---

function ProposalLineItemsPanel({ proposal, client }: { proposal: Proposal; client: Client | undefined }) {
  return (
    <div className="flex gap-8">
      <div className="flex-1">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Line Items</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="pb-1.5 text-left font-medium text-gray-500">Description</th>
              <th className="pb-1.5 text-right font-medium text-gray-500 w-16">Qty</th>
              <th className="pb-1.5 text-right font-medium text-gray-500 w-28">Unit Price</th>
              <th className="pb-1.5 text-right font-medium text-gray-500 w-28">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {proposal.lineItems.map((item) => (
              <tr key={item.id}>
                <td className="py-2 text-gray-700">{item.description}</td>
                <td className="py-2 text-right text-gray-500">{item.quantity}</td>
                <td className="py-2 text-right text-gray-500">{formatCurrency(item.unitPrice)}</td>
                <td className="py-2 text-right font-medium text-gray-900">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-300">
              <td colSpan={3} className="pt-2 text-right font-semibold text-gray-700">Total</td>
              <td className="pt-2 text-right font-bold text-gray-900">{formatCurrency(proposal.totalValue)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="w-56 flex-shrink-0 space-y-4">
        {client && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Client</p>
            <p className="text-sm font-medium text-gray-800">{client.name}</p>
            <p className="text-xs text-gray-500">{client.contactName}</p>
            <Link href={`/clients/${client.id}`} className="mt-1 text-xs text-brand-blue hover:underline">View client →</Link>
          </div>
        )}
        {proposal.notes && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Notes</p>
            <p className="text-xs text-gray-600 leading-relaxed">{proposal.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
