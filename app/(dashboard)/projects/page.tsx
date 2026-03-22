'use client';

// Projects list page — full CRUD via local state.
// Create/edit via ProjectFormModal, delete with dependency check via ConfirmDialog.

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { PageHeader } from '@/components/layout';
import { Button, Card, Input, Select, Badge, ConfirmDialog } from '@/components/ui';
import { ProjectFormModal } from '@/components/modules';
import { MOCK_PROJECTS } from '@/lib/mock/projects';
import { MOCK_CLIENTS } from '@/lib/mock/clients';
import { MOCK_PROPOSALS } from '@/lib/mock/proposals';
import { MOCK_INVOICES } from '@/lib/mock/finances';
import { getProjectDeleteBlockers } from '@/lib/utils/dependencies';
import type { Project, ProjectStatus } from '@/lib/types/projects';

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

const CLIENT_MAP = Object.fromEntries(MOCK_CLIENTS.map((c) => [c.id, c]));

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [invoices, setInvoices] = useState(MOCK_INVOICES);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleteBlockers, setDeleteBlockers] = useState<string[]>([]);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const client = CLIENT_MAP[p.clientId];
      const q = search.toLowerCase();
      const matchesSearch =
        q === '' ||
        p.name.toLowerCase().includes(q) ||
        (client?.name.toLowerCase().includes(q) ?? false) ||
        (client?.contactName?.toLowerCase().includes(q) ?? false);
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  function handleCreate(data: Omit<Project, 'id' | 'milestones' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString();
    setProjects((prev) => [
      ...prev,
      { ...data, id: `proj_${Date.now()}`, milestones: [], createdAt: now, updatedAt: now },
    ]);
  }

  function handleEdit(data: Omit<Project, 'id' | 'milestones' | 'createdAt' | 'updatedAt'>) {
    if (!editing) return;
    setProjects((prev) =>
      prev.map((p) => p.id === editing.id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p)
    );
  }

  function openEdit(project: Project) {
    setEditing(project);
    setFormOpen(true);
  }

  function openDelete(project: Project) {
    setDeleteBlockers(getProjectDeleteBlockers(project.id, invoices));
    setDeleteTarget(project);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  return (
    <PageShell>
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} total projects`}
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            + New Project
          </Button>
        }
      />

      {/* Summary row */}
      <div className="flex gap-4 mb-5">
        {(['active', 'on_hold', 'completed'] as ProjectStatus[]).map((status) => {
          const count = projects.filter((p) => p.status === status).length;
          return (
            <div key={status} className="flex flex-col rounded-md border border-gray-200 bg-white px-4 py-3 min-w-28">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{STATUS_BADGE[status].label}</span>
              <span className="mt-1 text-xl font-bold text-gray-900">{count}</span>
            </div>
          );
        })}
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
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-gray-400">No projects match your search.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Project</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Client</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Milestones</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Budget</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Target</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((project) => {
                const client = CLIENT_MAP[project.clientId];
                const cfg = STATUS_BADGE[project.status];
                const completed = project.milestones.filter((m) => m.status === 'completed').length;
                const total = project.milestones.length;
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

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
                        <Link href={`/projects/${project.id}`}>
                          <Button variant="ghost" size="sm">View →</Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(project)}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => openDelete(project)} className="text-red-500 hover:text-red-600 hover:bg-red-50">Delete</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <ProjectFormModal
        isOpen={formOpen}
        onClose={closeForm}
        onSave={editing ? handleEdit : handleCreate}
        initial={editing ?? undefined}
        clients={MOCK_CLIENTS}
        proposals={MOCK_PROPOSALS}
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
