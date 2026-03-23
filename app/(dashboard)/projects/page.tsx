'use client';

// Projects list page — fetches live data from /api/projects.
// Create/edit via ProjectFormModal, delete with dependency check via ConfirmDialog.

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { PageHeader } from '@/components/layout';
import { Button, Card, Input, Select, Badge, Spinner, ConfirmDialog } from '@/components/ui';
import { useRole } from '@/lib/auth/use-role';
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
  const isAdmin = useRole() === 'admin';
  const [projects, setProjects]     = useState<Project[]>([]);
  const [clients, setClients]       = useState<Client[]>([]);
  const [proposals, setProposals]   = useState<Proposal[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [formOpen, setFormOpen]   = useState(false);
  const [editing, setEditing]     = useState<Project | null>(null);
  const [isSaving, setIsSaving]   = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget]     = useState<Project | null>(null);
  const [deleteBlockers, setDeleteBlockers] = useState<string[]>([]);
  const [isCheckingDeps, setIsCheckingDeps] = useState(false);
  const [isDeleting, setIsDeleting]         = useState(false);
  const [deleteError, setDeleteError]       = useState<string | null>(null);

  useEffect(() => { void loadData(); }, []);

  async function loadData() {
    setIsLoading(true);
    setFetchError(null);
    try {
      const [projectsRes, clientsRes, proposalsRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/clients'),
        fetch('/api/proposals'),
      ]);
      const projectsJson  = await projectsRes.json()  as { data: Project[]  | null; error: string | null };
      const clientsJson   = await clientsRes.json()   as { data: Client[]   | null; error: string | null };
      const proposalsJson = await proposalsRes.json() as { data: Proposal[] | null; error: string | null };
      if (!projectsRes.ok || projectsJson.error) {
        setFetchError(projectsJson.error ?? 'Failed to load projects');
      } else {
        setProjects(projectsJson.data ?? []);
      }
      if (clientsRes.ok && !clientsJson.error)     setClients(clientsJson.data ?? []);
      if (proposalsRes.ok && !proposalsJson.error) setProposals(proposalsJson.data ?? []);
    } catch {
      setFetchError('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }

  const clientMap = useMemo(
    () => Object.fromEntries(clients.map((c) => [c.id, c])),
    [clients]
  );

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
  }, [projects, search, statusFilter]);

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
      if (json.data) setProjects((prev) => [json.data!, ...prev]);
      closeForm();
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
      if (json.data) setProjects((prev) => prev.map((p) => (p.id === editing.id ? json.data! : p)));
      closeForm();
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
      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
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
        title="Projects"
        subtitle={isLoading ? 'Loading…' : `${projects.length} total projects`}
        actions={
          <Button onClick={() => { setEditing(null); setSaveError(null); setFormOpen(true); }}>
            + New Project
          </Button>
        }
      />

      {deleteError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-600">{deleteError}</p>
        </div>
      )}

      {/* Summary row */}
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
                const client  = clientMap[project.clientId];
                const cfg     = STATUS_BADGE[project.status];
                const completed = project.milestones.filter((m) => m.status === 'completed').length;
                const total   = project.milestones.length;
                const pct     = total > 0 ? Math.round((completed / total) * 100) : 0;
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
                        <Button variant="ghost" size="sm" onClick={() => openEdit(project)}>Edit</Button>
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
