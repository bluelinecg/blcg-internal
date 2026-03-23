'use client';

// Tasks page — Kanban board with full CRUD.
// Create/edit via TaskFormModal, delete via ConfirmDialog (no dependency blockers).
// Drag-and-drop moves tasks between columns and updates their status.

import { useState, useEffect, useMemo } from 'react';
import { PageShell } from '@/components/layout';
import { PageHeader } from '@/components/layout';
import { Button, Select, KanbanBoard, Badge, ConfirmDialog, Spinner } from '@/components/ui';
import { useRole } from '@/lib/auth/use-role';
import type { KanbanColumn } from '@/components/ui/KanbanBoard';
import { TaskFormModal } from '@/components/modules';
import type { Task, TaskStatus, TaskPriority } from '@/lib/types/tasks';
import type { Project } from '@/lib/types/projects';

const COLUMNS: KanbanColumn[] = [
  { id: 'backlog',      label: 'Backlog' },
  { id: 'todo',         label: 'To Do' },
  { id: 'in_progress',  label: 'In Progress' },
  { id: 'in_review',    label: 'In Review' },
  { id: 'done',         label: 'Done' },
];

const COLUMN_ACCENT: Record<string, string> = {
  backlog:     'border-t-gray-400',
  todo:        'border-t-brand-steel',
  in_progress: 'border-t-brand-blue',
  in_review:   'border-t-yellow-400',
  done:        'border-t-green-500',
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; variant: 'red' | 'yellow' | 'blue' | 'gray' }> = {
  urgent: { label: 'Urgent', variant: 'red' },
  high:   { label: 'High',   variant: 'yellow' },
  medium: { label: 'Medium', variant: 'blue' },
  low:    { label: 'Low',    variant: 'gray' },
};

const ASSIGNEE_OPTIONS = [
  { value: 'all', label: 'All Assignees' },
  { value: 'Ryan', label: 'Ryan' },
  { value: 'Nick', label: 'Nick' },
];

type TaskFormData = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;

export function TasksPage() {
  const isAdmin = useRole() === 'admin';
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [projectFilter, setProjectFilter]   = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing]   = useState<Task | null>(null);
  const [isSaving, setIsSaving]   = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting]     = useState(false);
  const [deleteError, setDeleteError]   = useState<string | null>(null);

  useEffect(() => { void loadData(); }, []);

  async function loadData() {
    setIsLoading(true);
    setFetchError(null);
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/projects'),
      ]);
      const [tasksJson, projectsJson] = await Promise.all([
        tasksRes.json() as Promise<{ data: Task[] | null; error: string | null }>,
        projectsRes.json() as Promise<{ data: Project[] | null; error: string | null }>,
      ]);
      if (!tasksRes.ok || tasksJson.error) {
        setFetchError(tasksJson.error ?? 'Failed to load tasks');
        return;
      }
      setTasks(tasksJson.data ?? []);
      setProjects(projectsJson.data ?? []);
    } catch {
      setFetchError('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  }

  const projectMap = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p])),
    [projects],
  );

  const projectFilterOptions = useMemo(() => [
    { value: 'all',  label: 'All Projects' },
    { value: 'none', label: 'No Project (Internal)' },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ], [projects]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const matchesProject =
        projectFilter === 'all' ||
        (projectFilter === 'none' ? !t.projectId : t.projectId === projectFilter);
      const matchesAssignee = assigneeFilter === 'all' || t.assignee === assigneeFilter;
      return matchesProject && matchesAssignee;
    });
  }, [tasks, projectFilter, assigneeFilter]);

  // --- CRUD handlers ---

  async function handleMoveItem(taskId: string, toColumnId: string) {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: toColumnId as TaskStatus, updatedAt: new Date().toISOString() } : t,
      ),
    );
    try {
      const res  = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: toColumnId }),
      });
      const json = await res.json() as { data: Task | null; error: string | null };
      if (!res.ok || json.error) {
        // Revert optimistic update on failure
        void loadData();
      }
    } catch {
      void loadData();
    }
  }

  async function handleCreate(data: TaskFormData) {
    setIsSaving(true);
    setSaveError(null);
    try {
      const res  = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json() as { data: Task | null; error: string | null };
      if (!res.ok || json.error) { setSaveError(json.error ?? 'Failed to create task'); return; }
      if (json.data) setTasks((prev) => [json.data!, ...prev]);
      closeForm();
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEdit(data: TaskFormData) {
    if (!editing) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const res  = await fetch(`/api/tasks/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json() as { data: Task | null; error: string | null };
      if (!res.ok || json.error) { setSaveError(json.error ?? 'Failed to update task'); return; }
      if (json.data) setTasks((prev) => prev.map((t) => (t.id === editing.id ? json.data! : t)));
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
      const res  = await fetch(`/api/tasks/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json() as { data: unknown; error: string | null };
      if (!res.ok || json.error) { setDeleteError(json.error ?? 'Failed to delete task'); setDeleteTarget(null); return; }
      setTasks((prev) => prev.filter((t) => t.id !== deleteTarget.id));
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
        title="Tasks"
        subtitle="Internal task tracking across all projects"
        actions={
          <Button onClick={() => { setEditing(null); setSaveError(null); setFormOpen(true); }}>
            + New Task
          </Button>
        }
      />

      {deleteError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-600">{deleteError}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Spinner /></div>
      ) : fetchError ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-red-500">{fetchError}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-5">
            <Select options={projectFilterOptions} value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="w-56" />
            <Select options={ASSIGNEE_OPTIONS} value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="w-40" />
            <span className="text-xs text-gray-400 ml-1">{filtered.length} tasks shown</span>
          </div>

          <KanbanBoard
            columns={COLUMNS}
            items={filtered}
            getItemId={(t) => t.id}
            getItemColumn={(t) => t.status}
            onMoveItem={handleMoveItem}
            columnAccent={COLUMN_ACCENT}
            renderCard={(task) => (
              <TaskCard
                task={task}
                projectMap={projectMap}
                onEdit={(t) => { setEditing(t); setSaveError(null); setFormOpen(true); }}
                onDelete={isAdmin ? (t) => setDeleteTarget(t) : undefined}
              />
            )}
          />
        </>
      )}

      <TaskFormModal
        isOpen={formOpen}
        onClose={closeForm}
        onSave={editing ? handleEdit : handleCreate}
        initial={editing ?? undefined}
        projects={projects}
        isSaving={isSaving}
        saveError={saveError}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Task"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
      />
    </PageShell>
  );
}

export default TasksPage;

// --- Task card ---

interface TaskCardProps {
  task: Task;
  projectMap: Record<string, Project>;
  onEdit: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

function TaskCard({ task, projectMap, onEdit, onDelete }: TaskCardProps) {
  const priorityCfg = PRIORITY_CONFIG[task.priority];
  const project = task.projectId ? projectMap[task.projectId] : undefined;

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant={priorityCfg.variant}>{priorityCfg.label}</Badge>
        {project && (
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs bg-brand-navy/10 text-brand-navy font-medium truncate max-w-28" title={project.name}>
            {project.name.split('—')[0].trim()}
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-gray-900 leading-snug">{task.title}</p>
      {task.description && (
        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          {task.assignee && (
            <div className="flex items-center gap-1.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-blue text-white text-xs font-semibold">
                {task.assignee[0]}
              </div>
              <span className="text-xs text-gray-500">{task.assignee}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {task.dueDate && (
            <span className={`text-xs ${isDueSoon(task.dueDate) ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
              {formatDate(task.dueDate)}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className="ml-1 text-xs text-gray-400 hover:text-brand-blue transition-colors px-1"
            title="Edit task"
          >
            ✎
          </button>
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(task); }}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors px-1"
              title="Delete task"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isDueSoon(iso: string): boolean {
  const diff = new Date(iso).getTime() - Date.now();
  return diff >= 0 && diff < 3 * 24 * 60 * 60 * 1000;
}
