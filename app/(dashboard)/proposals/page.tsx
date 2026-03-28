'use client';

// Proposals list page — fetches live data from /api/proposals (paginated, sortable).
// Clients are fetched in full (unpaginated) for the form dropdown and client name display.
// Text search and status filter run client-side against the current page.

import { useState, useEffect, useMemo } from 'react';
import { PageShell } from '@/components/layout';
import { PageHeader } from '@/components/layout';
import { Button, Card, Input, Select, Spinner, ExpandableTable, ConfirmDialog, Pagination, SortableHeader } from '@/components/ui';
import { useRole } from '@/lib/auth/use-role';
import { useListState } from '@/lib/hooks/use-list-state';
import type { TableColumn } from '@/components/ui/ExpandableTable';
import { ProposalStatusBadge, ProposalFormModal } from '@/components/modules';
import { Modal } from '@/components/ui';
import type { Proposal, ProposalStatus } from '@/lib/types/proposals';
import type { Organization } from '@/lib/types/crm';
import type { CatalogItem } from '@/lib/types/catalog';

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
  const role    = useRole();
  const isAdmin = role === 'admin';
  const canEdit = role !== 'viewer';

  // Paginated proposals via hook
  const { data: proposals, isLoading, error: fetchError, page, totalPages, totalRecords, sort, order, setPage, setSort, reload } =
    useListState<Proposal>({ endpoint: '/api/proposals', defaultSort: 'created_at', defaultOrder: 'desc' });

  // Full organizations list for form dropdown (unpaginated)
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  useEffect(() => {
    fetch('/api/organizations?pageSize=200&sort=name')
      .then((r) => r.json())
      .then((j: { data: Organization[] | null }) => setOrganizations(j.data ?? []))
      .catch(() => setOrganizations([]));
  }, []);

  // Active catalog items for the line item picker
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  useEffect(() => {
    fetch('/api/catalog?activeOnly=true&pageSize=200&sort=name')
      .then((r) => r.json())
      .then((j: { data: CatalogItem[] | null }) => setCatalogItems(j.data ?? []))
      .catch(() => setCatalogItems([]));
  }, []);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Create/edit modal
  const [formOpen, setFormOpen]   = useState(false);
  const [editing, setEditing]     = useState<Proposal | null>(null);
  const [isSaving, setIsSaving]   = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // PDF send modal
  const [sendTarget, setSendTarget]   = useState<Proposal | null>(null);
  const [isSending, setIsSending]     = useState(false);
  const [sendError, setSendError]     = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget]     = useState<Proposal | null>(null);
  const [deleteBlockers, setDeleteBlockers] = useState<string[]>([]);
  const [isCheckingDeps, setIsCheckingDeps] = useState(false);
  const [isDeleting, setIsDeleting]         = useState(false);
  const [deleteError, setDeleteError]       = useState<string | null>(null);

  const filtered = useMemo(() => {
    return proposals.filter((p) => {
      const q = search.toLowerCase();
      const matchesSearch =
        q === '' ||
        p.title.toLowerCase().includes(q) ||
        (p.organization?.name.toLowerCase().includes(q) ?? false);
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
      if (!res.ok || json.error) { setSaveError(json.error ?? 'Failed to create proposal'); return; }
      setFormOpen(false);
      reload();
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
      if (!res.ok || json.error) { setSaveError(json.error ?? 'Failed to update proposal'); return; }
      closeForm();
      reload();
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
      if (!res.ok || json.error) { setDeleteError(json.error ?? 'Could not check dependencies'); return; }
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
      if (!res.ok || json.error) { setDeleteError(json.error ?? 'Failed to delete proposal'); setDeleteTarget(null); return; }
      setDeleteTarget(null);
      reload();
    } catch {
      setDeleteError('Network error. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSendPdf(proposalId: string, payload: SendPdfPayload) {
    setIsSending(true);
    setSendError(null);
    setSendSuccess(false);
    try {
      const res  = await fetch(`/api/proposals/${proposalId}/send`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const json = await res.json() as { data: unknown; error: string | null };
      if (!res.ok || json.error) { setSendError(json.error ?? 'Failed to send'); return; }
      setSendSuccess(true);
      setTimeout(() => { setSendTarget(null); setSendSuccess(false); }, 1500);
    } catch {
      setSendError('Network error. Please try again.');
    } finally {
      setIsSending(false);
    }
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setSaveError(null);
  }

  // Summary stats from current page
  const totalValue    = proposals.reduce((s, p) => s + p.totalValue, 0);
  const acceptedValue = proposals.filter((p) => p.status === 'accepted').reduce((s, p) => s + p.totalValue, 0);
  const openCount     = proposals.filter((p) => p.status === 'sent' || p.status === 'viewed').length;
  const draftCount    = proposals.filter((p) => p.status === 'draft').length;

  // Table columns with sortable headers
  const COLUMNS: TableColumn<Proposal>[] = [
    {
      key: 'title',
      header: <SortableHeader column="title" currentSort={sort} order={order} onSort={setSort}>Proposal</SortableHeader>,
      render: (p) => <span className="font-medium text-gray-900">{p.title}</span>,
    },
    {
      key: 'organization',
      header: 'Organization',
      render: (p) => (
        <p className="text-sm text-gray-800">{p.organization?.name ?? '—'}</p>
      ),
    },
    {
      key: 'status',
      header: <SortableHeader column="status" currentSort={sort} order={order} onSort={setSort}>Status</SortableHeader>,
      render: (p) => <ProposalStatusBadge status={p.status} />,
      width: '120px',
    },
    {
      key: 'total',
      header: <SortableHeader column="total_value" currentSort={sort} order={order} onSort={setSort} align="right">Total</SortableHeader>,
      align: 'right',
      render: (p) => <span className="font-semibold text-gray-900">{formatCurrency(p.totalValue)}</span>,
      width: '120px',
    },
    {
      key: 'sent',
      header: <SortableHeader column="sent_at" currentSort={sort} order={order} onSort={setSort}>Sent</SortableHeader>,
      render: (p) => <span className="text-gray-500">{p.sentAt ? formatDate(p.sentAt) : '—'}</span>,
      width: '110px',
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (p) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(`/api/proposals/${p.id}/pdf`, '_blank')}
          >
            PDF
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSendTarget(p); setSendError(null); setSendSuccess(false); }}
          >
            Send
          </Button>
          {canEdit && <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>Edit</Button>}
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
      width: '220px',
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Proposals"
        subtitle={isLoading ? 'Loading…' : `${totalRecords} total proposals`}
        actions={canEdit && (
          <Button onClick={() => { setEditing(null); setSaveError(null); setFormOpen(true); }}>
            + New Proposal
          </Button>
        )}
      />

      {deleteError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-600">{deleteError}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <Input
          placeholder="Search by title or client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72"
        />
        <Select
          options={STATUS_FILTER_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="w-full sm:w-44"
        />
      </div>

      {/* Summary stats (current page) */}
      <div className="flex flex-wrap gap-4 mb-5">
        {[
          { label: 'Page Value',  value: formatCurrency(totalValue) },
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
        <div className="overflow-x-auto">
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
            renderExpanded={(p) => <ProposalLineItemsPanel proposal={p} />}
            emptyMessage="No proposals match your search."
          />
        )}
        </div>
      </Card>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-4" />

      {/* Create / Edit modal */}
      <ProposalFormModal
        isOpen={formOpen}
        onClose={closeForm}
        onSave={editing ? handleEdit : handleCreate}
        initial={editing ?? undefined}
        organizations={organizations}
        catalogItems={catalogItems}
        isSaving={isSaving}
        saveError={saveError}
      />

      {/* Send PDF modal */}
      {sendTarget && (
        <SendPdfModal
          proposal={sendTarget}
          isOpen={!!sendTarget}
          onClose={() => { setSendTarget(null); setSendError(null); setSendSuccess(false); }}
          onSend={(payload) => handleSendPdf(sendTarget.id, payload)}
          isSending={isSending}
          sendError={sendError}
          sendSuccess={sendSuccess}
        />
      )}

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

// --- Send PDF modal ---

export interface SendPdfPayload {
  to:      string;
  cc?:     string;
  subject: string;
  body:    string;
  from:    'ryan@bluelinecg.com' | 'bluelinecgllc@gmail.com';
}

const FROM_OPTIONS = [
  { value: 'ryan@bluelinecg.com',      label: 'ryan@bluelinecg.com' },
  { value: 'bluelinecgllc@gmail.com',  label: 'bluelinecgllc@gmail.com' },
];

function SendPdfModal({
  proposal,
  isOpen,
  onClose,
  onSend,
  isSending,
  sendError,
  sendSuccess,
}: {
  proposal:    Proposal;
  isOpen:      boolean;
  onClose:     () => void;
  onSend:      (payload: SendPdfPayload) => void;
  isSending:   boolean;
  sendError:   string | null;
  sendSuccess: boolean;
}) {
  const [to,      setTo]      = useState('');
  const [cc,      setCc]      = useState('');
  const [subject, setSubject] = useState(`Proposal ${proposal.proposalNumber} — ${proposal.title}`);
  const [body,    setBody]    = useState(
    `Please find attached Proposal ${proposal.proposalNumber}: ${proposal.title}.\n\nLet us know if you have any questions.\n\n— Blue Line Consulting Group`
  );
  const [from, setFrom] = useState<SendPdfPayload['from']>('ryan@bluelinecg.com');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSend({ to, cc: cc || undefined, subject, body, from });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Send Proposal PDF`} size="lg">
      {sendSuccess ? (
        <div className="py-8 text-center">
          <p className="text-green-600 font-medium">Proposal sent successfully.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">From</label>
            <Select options={FROM_OPTIONS} value={from} onChange={(e) => setFrom(e.target.value as SendPdfPayload['from'])} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">To *</label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="recipient@example.com" required type="email" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">CC</label>
            <Input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="optional" type="email" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Subject *</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>
          {sendError && (
            <p className="text-sm text-red-600">{sendError}</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={onClose} disabled={isSending}>Cancel</Button>
            <Button type="submit" disabled={isSending}>
              {isSending ? 'Sending…' : 'Send PDF'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// --- Line items expanded panel ---

function ProposalLineItemsPanel({ proposal }: { proposal: Proposal }) {
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
        {proposal.organization && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Organization</p>
            <p className="text-sm font-medium text-gray-800">{proposal.organization.name}</p>
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
