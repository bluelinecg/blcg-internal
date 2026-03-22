'use client';

// Tasks page — Kanban board with full CRUD.
// Create/edit via TaskFormModal, delete via ConfirmDialog (no dependency blockers).
// Drag-and-drop moves tasks between columns and updates their status.

import { useState, useMemo } from 'react';
import { PageShell } from '@/components/layout';
import { PageHeader } from '@/components/layout';
import { Button, Select, KanbanBoard, Badge, ConfirmDialog } from '@/components/ui';
import type { KanbanColumn } from '@/components/ui/KanbanBoard';
import { TaskFormModal } from '@/components/modules';
import { MOCK_TASKS } from '@/lib/mock/tasks';
import { MOCK_PROJECTS } from '@/lib/mock/projects';
import type { Task, TaskStatus, TaskPriority } from '@/lib/types/tasks';

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

const PROJECT_MAP = Object.fromEntries(MOCK_PROJECTS.map((p) => [p.id, p]));

const PROJECT_FILTER_OPTIONS = [
  { value: 'all', label: 'All Projects' },
  { value: 'none', label: 'No Project (Internal)' },
  ...MOCK_PROJECTS.map((p) => ({ value: p.id, label: p.name })),
];

const ASSIGNEE_OPTIONS = [
  { value: 'all', label: 'All Assignees' },
  { value: 'Ryan', label: 'Ryan' },
  { value: 'Nick', label: 'Nick' },
];

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [projectFilter, setProjectFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  // Create/edit modal
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  // Delete confirm (tasks have no dependency blockers)
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

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

  function handleMoveItem(taskId: string, toColumnId: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: toColumnId as TaskStatus, updatedAt: new Date().toISOString() } : t
      )
    );
  }

  function handleCreate(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString();
    setTasks((prev) => [...prev, { ...data, id: `task_${Date.now()}`, createdAt: now, updatedAt: now }]);
  }

  function handleEdit(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) {
    if (!editing) return;
    setTasks((prev) =>
      prev.map((t) => t.id === editing.id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t)
    );
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    setTasks((prev) => prev.filter((t) => t.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  return (
    <PageShell>
      <PageHeader
        title="Tasks"
        subtitle="Internal task tracking across all projects"
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            + New Task
          </Button>
        }
      />

      <div className="flex items-center gap-3 mb-5">
        <Select options={PROJECT_FILTER_OPTIONS} value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="w-56" />
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
            onEdit={(t) => { setEditing(t); setFormOpen(true); }}
            onDelete={(t) => setDeleteTarget(t)}
          />
        )}
      />

      <TaskFormModal
        isOpen={formOpen}
        onClose={closeForm}
        onSave={editing ? handleEdit : handleCreate}
        initial={editing ?? undefined}
        projects={MOCK_PROJECTS}
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
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  const priorityCfg = PRIORITY_CONFIG[task.priority];
  const project = task.projectId ? PROJECT_MAP[task.projectId] : undefined;

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
          {/* Edit / delete buttons — visible on hover via group */}
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className="ml-1 text-xs text-gray-400 hover:text-brand-blue transition-colors px-1"
            title="Edit task"
          >
            ✎
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task); }}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors px-1"
            title="Delete task"
          >
            ✕
          </button>
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
