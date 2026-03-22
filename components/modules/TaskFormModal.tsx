'use client';

// Modal form for creating and editing Tasks.
// Props:
//   isOpen    — controls visibility
//   onClose   — dismiss callback
//   onSave    — called with the new/updated task data
//   initial   — pre-filled values for edit mode (omit for create)
//   projects  — list of projects for the project selector

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, Select, Textarea } from '@/components/ui';
import type { Task, TaskStatus, TaskPriority } from '@/lib/types/tasks';
import type { Project } from '@/lib/types/projects';

type TaskFormData = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TaskFormData) => void;
  initial?: Partial<TaskFormData>;
  projects: Project[];
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'backlog',     label: 'Backlog' },
  { value: 'todo',        label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review',   label: 'In Review' },
  { value: 'done',        label: 'Done' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high',   label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low',    label: 'Low' },
];

const ASSIGNEE_OPTIONS = [
  { value: '',     label: 'Unassigned' },
  { value: 'Ryan', label: 'Ryan' },
  { value: 'Nick', label: 'Nick' },
];

const DEFAULTS: TaskFormData = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  projectId: undefined,
  assignee: undefined,
  dueDate: undefined,
};

export function TaskFormModal({ isOpen, onClose, onSave, initial, projects }: TaskFormModalProps) {
  const [form, setForm] = useState<TaskFormData>({ ...DEFAULTS, ...initial });
  const [errors, setErrors] = useState<Partial<Record<keyof TaskFormData, string>>>({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm({ ...DEFAULTS, ...initial });
      setErrors({});
    }
  }, [isOpen, initial]);

  function set<K extends keyof TaskFormData>(key: K, value: TaskFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.title.trim()) next.title = 'Title is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSave({
      ...form,
      projectId: form.projectId || undefined,
      assignee: form.assignee || undefined,
      dueDate: form.dueDate || undefined,
    });
    onClose();
  }

  const projectOptions = [
    { value: '', label: 'No project (internal)' },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];

  const isEdit = !!initial?.title;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Task' : 'New Task'} size="md">
      <div className="px-6 py-5 space-y-4">
        <Input
          label="Title"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Describe the task..."
          error={errors.title}
        />
        <Textarea
          label="Description (optional)"
          value={form.description ?? ''}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Additional context or acceptance criteria..."
          rows={3}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={(e) => set('status', e.target.value as TaskStatus)}
          />
          <Select
            label="Priority"
            options={PRIORITY_OPTIONS}
            value={form.priority}
            onChange={(e) => set('priority', e.target.value as TaskPriority)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Project"
            options={projectOptions}
            value={form.projectId ?? ''}
            onChange={(e) => set('projectId', e.target.value || undefined)}
          />
          <Select
            label="Assignee"
            options={ASSIGNEE_OPTIONS}
            value={form.assignee ?? ''}
            onChange={(e) => set('assignee', e.target.value || undefined)}
          />
        </div>
        <Input
          label="Due Date (optional)"
          type="date"
          value={form.dueDate ? form.dueDate.split('T')[0] : ''}
          onChange={(e) => set('dueDate', e.target.value ? `${e.target.value}T00:00:00Z` : undefined)}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>{isEdit ? 'Save Changes' : 'Create Task'}</Button>
        </div>
      </div>
    </Modal>
  );
}
