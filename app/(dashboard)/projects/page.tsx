'use client';

// Projects list page — fetches live data from /api/projects (paginated, sortable).
// Clients and proposals are fetched in full (unpaginated) for form dropdowns and display.
// Text search and status filter run client-side against the current page.

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { PageHeader } from '@/components/layout';
import { Button, Card, Input, Select, Badge, Spinner, ConfirmDialog, Pagination, SortableHeader } from '@/components/ui';
import { useRole } from '@/lib/auth/use-role';
import { useListState } from '@/lib/hooks/use-list-state';
import { ProjectFormModal } from '@/components/modules';
import type { Project, ProjectStatus } from '@/lib/types/projects';
import type { Client } from '@/lib/types/clients';
import type { Proposal } from '@/lib/types/proposals';

type StatusFilter = ProjectStatus | 'all';

const STATUS_FILTER_OPTIONS = [
  { value: 'all',       label: 'All Projects' },
  { value: 'active',    label: 'Active' },
  { value: 'on_hold',   label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_BADGE: Record<ProjectStatus, { variant: 'green' | 'blue' | 'yellow' | 'red' | 'gray'; label: string }> = {
  active:    { variant: 'green',  label: 'Active' },
  on_hold:   { variant: 'yellow', label: 'On Hold' },
  completed: { variant: 'gray',   label: 'Completed' },
  cancelled: { variant: 'red',    label: 'Cancelled' },
};

type ProjectFormData = Omit<Project, 'id' | 'milestones' | 'createdAt' | 'updatedAt'>;

export function ProjectsPage() {
  const role    = useRole();
  const isAdmin = role === 'admin';
  const canEdit = role !== 'viewer';

  // Paginated projects via hook
  const { data: projects, isLoading, error: fetchError, page, totalPages, totalRecords, sort, order, setPage, setSort, reload } =
    useListState<Project>({ endpoint: '/api/projects', defaultSort: 'created_at', defaultOrder: 'desc' });

  // Full clients + proposals for form dropdowns (unpaginated)
  const [clients, setClients]     = useState<Client[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  useEffect(() => {
    Promise.all([
      fetch('/api/clients?pageSize=100&sort=name').then((r) => r.json()),
      fetch('/api/proposals?pageSize=100&sort=title').then((r) => r.json()),
    ]).then(([cj, pj]: [{ data: Client[] | null }, { data: Proposal[] | null }]) => {
      setClients(cj.data ?? []);
      setProposals(pj.data ?? []);
    }).catch(() => { /* non-critical */ });
  }, []);

  const clientMap = useMemo(
    () => Object.fromEntries(clients.map((c) => [c.id, c])),
    [clients],
  );

  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>('all');
  const [formOpen, setFormOpen]           = useState(false);
  const [editing, setEditing]             = useState<Project | null>(null);
  const [isSaving, setIsSaving]           = useState(false);
  const [saveError, setSaveError]         = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget]   = useState<Project | null>(null);
  const [deleteBlockers, setDeleteBlockers] = useState<string[]>([]);
  const [isCheckingDeps, setIsCheckingDeps] = useState(false);
  const [isDeleting, setIsDeleting]       = useState(false);
  const [deleteError, setDeleteError]     = useState<string | null>(null);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const client = clientMap[p.clientId];
      const q = search.toLowerCase();
      const matchesSearch =
        q === '' ||
        p.name.toLowerCase().includes(q) ||
        (client?.name.toLowerCase().includes(q) ?? false) ||
        (client?.contactName?.toLowerCase().includes(q) ?? false);
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter, clientMap]);

  // --- CRUD handlers ---

  async function handleCreate(data: ProjectFormData) {
    setIsSaving(true);
    setSaveError(null);
    try {
      const res  = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, milestones: [] }),
      });
      const json = await res.json() as { data: Project | null; error: string | null };
      if (!res.ok || json.error) { setSaveError(json.error ?? 'Failed to create project'); return; }
      closeForm();
      reload();
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEdit(data: ProjectFormData) {
    if (!editing) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const res  = await fetch(`/api/projects/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json() as { data: Project | null; error: string | null };
      if (!res.ok || json.error) { setSaveError(json.error ?? 'Failed to update project'); return; }
      closeForm();
      reload();
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  function openEdit(project: Project) {
    setEditing(project);
    setSaveError(null);
    setFormOpen(true);
  }

  async function openDelete(project: Project) {
    setIsCheckingDeps(true);
    setDeleteError(null);
    try {
      const res  = await fetch(`/api/projects/${project.id}/blockers`);
      const json = await res.json() as { data: string[] | null; error: string | null };
      if (!res.ok || json.error) { setDeleteError(json.error ?? 'Could not check dependencies'); return; }
      setDeleteBlockers(json.data ?? []);
      setDeleteTarget(project);
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
      const res  = await fetch(`/api/projects/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json() as { data: unknown; error: string | null };
      if (!res.ok || json.error) { setDeleteError(json.error ?? 'Failed to delete project'); setDeleteTarget(null); return; }
      setDeleteTarget(null);
      reload();
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
        title="Projects"
        subtitle={isLoading ? 'Loading…' : `${totalRecords} total projects`}
        actions={canEdit && (
          <Button onClick={() => { setEditing(null); setSaveError(null); setFormOpen(true); }}>
            + New Project
          </Button>
        )}
      />

      {deleteError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-600">{deleteError}</p>
        </div>
      )}

      {/* Summary row (current page) */}
      <div className="flex gap-4 mb-5">
        {(['active', 'on_hold', 'completed'] as ProjectStatus[]).map((status) => (
          <div key={status} className="flex flex-col rounded-md border border-gray-200 bg-white px-4 py-3 min-w-28">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{STATUS_BADGE[status].label}</span>
            <span className="mt-1 text-xl font-bold text-gray-900">{projects.filter((p) => p.status === status).length}</span>
          </div>
        ))}
        <div className="flex flex-col rounded-md border border-gray-200 bg-white px-4 py-3 min-w-28">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Active Budget</span>
          <span className="mt-1 text-xl font-bold text-gray-900">
            {formatCurrency(projects.filter((p) => p.status === 'active').reduce((s, p) => s + p.budget, 0))}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Input placeholder="Search by project name or client..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-72" />
        <Select options={STATUS_FILTER_OPTIONS} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="w-40" />
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
            <p className="text-sm text-gray-400">No projects match your search.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <SortableHeader column="name" currentSort={sort} order={order} onSort={setSort} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Project</SortableHeader>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Client</th>
                <SortableHeader column="status" currentSort={sort} order={order} onSort={setSort} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</SortableHeader>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Milestones</th>
                <SortableHeader column="budget" currentSort={sort} order={order} onSort={setSort} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Budget</SortableHeader>
                <SortableHeader column="end_date" currentSort={sort} order={order} onSort={setSort} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Target</SortableHeader>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((project) => {
                const client    = clientMap[project.clientId];
                const cfg       = STATUS_BADGE[project.status];
                const completed = project.milestones.filter((m) => m.status === 'completed').length;
                const total     = project.milestones.length;
                const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
                return (
                  <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{project.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Started {formatDate(project.startDate)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-700">{client?.name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{client?.contactName ?? ''}</p>
                    </td>
                    <td className="px-6 py-4"><Badge variant={cfg.variant}>{cfg.label}</Badge></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 rounded-full bg-gray-200">
                          <div className="h-1.5 rounded-full bg-brand-blue" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{completed}/{total}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(project.budget)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{project.targetDate ? formatDate(project.targetDate) : '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/projects/${project.id}`}><Button variant="ghost" size="sm">View →</Button></Link>
                        {canEdit && <Button variant="ghost" size="sm" onClick={() => openEdit(project)}>Edit</Button>}
                        {isAdmin && (
                          <Button variant="ghost" size="sm" onClick={() => openDelete(project)} disabled={isCheckingDeps} className="text-red-500 hover:text-red-600 hover:bg-red-50">Delete</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-4" />

      <ProjectFormModal
        isOpen={formOpen}
        onClose={closeForm}
        onSave={editing ? handleEdit : handleCreate}
        initial={editing ?? undefined}
        clients={clients}
        proposals={proposals}
        isSaving={isSaving}
        saveError={saveError}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Project"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        blockedBy={deleteBlockers}
      />
    </PageShell>
  );
}

export default ProjectsPage;

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
