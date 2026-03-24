'use client';

// Modal form for creating and editing Tasks.
// Props:
//   isOpen       — controls visibility
//   onClose      — dismiss callback
//   onSave       — called with the new/updated task data
//   initial      — pre-filled values for edit mode (omit for create)
//   projects     — list of projects for the project selector
//   allTasks     — full task list for the blocked-by selector (excludes the task being edited)
//   isSaving     — disables buttons while the async save is in flight
//   saveError    — inline error message shown above the action buttons

import { useState, useEffect } from 'react';
import { useFormState } from '@/lib/hooks/use-form-state';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, Select, Textarea } from '@/components/ui';
import type { Task, TaskStatus, TaskPriority, TaskRecurrence, ChecklistItem } from '@/lib/types/tasks';
import type { Project } from '@/lib/types/projects';

type TaskFormData = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;

interface TaskFormModalProps {
  isOpen:     boolean;
  onClose:    () => void;
  onSave:     (data: TaskFormData) => void;
  initial?:   Partial<TaskFormData>;
  projects:   Project[];
  allTasks?:  Task[];
  isSaving?:  boolean;
  saveError?: string | null;
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

const RECURRENCE_OPTIONS: { value: TaskRecurrence; label: string }[] = [
  { value: 'none',      label: 'Does not repeat' },
  { value: 'daily',     label: 'Daily' },
  { value: 'weekly',    label: 'Weekly' },
  { value: 'biweekly',  label: 'Every 2 weeks' },
  { value: 'monthly',   label: 'Monthly' },
];

const DEFAULTS: TaskFormData = {
  title:       '',
  description: '',
  status:      'todo',
  priority:    'medium',
  projectId:   undefined,
  assignee:    undefined,
  dueDate:     undefined,
  recurrence:  'none',
  checklist:   [],
  blockedBy:   [],
};

export function TaskFormModal({
  isOpen, onClose, onSave, initial, projects, allTasks = [], isSaving, saveError,
}: TaskFormModalProps) {
  const { form, errors, setField, reset, setErrors } = useFormState(DEFAULTS, initial);
  const [checklistInput, setChecklistInput] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      reset(DEFAULTS, initial);
      setChecklistInput('');
    }
  }, [isOpen, initial]);

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.title.trim()) next.title = 'Title is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSave({ ...form, dueDate: form.dueDate || undefined });
  }

  // --- Checklist helpers ---

  function addChecklistItem() {
    const text = checklistInput.trim();
    if (!text) return;
    const item: ChecklistItem = { id: crypto.randomUUID(), text, completed: false };
    setField('checklist', [...form.checklist, item]);
    setChecklistInput('');
  }

  function removeChecklistItem(id: string) {
    setField('checklist', form.checklist.filter((i) => i.id !== id));
  }

  // --- Blocked-by helpers ---

  function toggleBlockedBy(taskId: string) {
    const current = form.blockedBy;
    setField('blockedBy', current.includes(taskId)
      ? current.filter((id) => id !== taskId)
      : [...current, taskId],
    );
  }

  // Tasks available as blockers (exclude self when editing)
  const editingId = (initial as Task | undefined)?.id;
  const blockerOptions = allTasks.filter((t) => t.id !== editingId);

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
          onChange={(e) => setField('title', e.target.value)}
          placeholder="Describe the task..."
          error={errors.title}
        />
        <Textarea
          label="Description (optional)"
          value={form.description ?? ''}
          onChange={(e) => setField('description', e.target.value)}
          placeholder="Additional context or acceptance criteria..."
          rows={3}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={(e) => setField('status', e.target.value as TaskStatus)}
          />
          <Select
            label="Priority"
            options={PRIORITY_OPTIONS}
            value={form.priority}
            onChange={(e) => setField('priority', e.target.value as TaskPriority)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Project"
            options={projectOptions}
            value={form.projectId ?? ''}
            onChange={(e) => setField('projectId', e.target.value)}
          />
          <Select
            label="Assignee"
            options={ASSIGNEE_OPTIONS}
            value={form.assignee ?? ''}
            onChange={(e) => setField('assignee', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Due Date (optional)"
            type="date"
            value={form.dueDate ? form.dueDate.split('T')[0] : ''}
            onChange={(e) => setField('dueDate', e.target.value ? `${e.target.value}T00:00:00Z` : undefined)}
          />
          <Select
            label="Recurrence"
            options={RECURRENCE_OPTIONS}
            value={form.recurrence}
            onChange={(e) => setField('recurrence', e.target.value as TaskRecurrence)}
          />
        </div>

        {/* Checklist */}
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Checklist</p>
          {form.checklist.length > 0 && (
            <ul className="mb-2 space-y-1">
              {form.checklist.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="flex-1 truncate">{item.text}</span>
                  <button
                    type="button"
                    onClick={() => removeChecklistItem(item.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors text-xs px-1"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={checklistInput}
              onChange={(e) => setChecklistInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChecklistItem(); } }}
              placeholder="Add a checklist item..."
              className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue"
            />
            <Button variant="secondary" size="sm" onClick={addChecklistItem} type="button">Add</Button>
          </div>
        </div>

        {/* Blocked by */}
        {blockerOptions.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Blocked by (optional)</p>
            <div className="max-h-32 overflow-y-auto space-y-1 rounded-md border border-gray-200 p-2">
              {blockerOptions.map((t) => (
                <label key={t.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                  <input
                    type="checkbox"
                    checked={form.blockedBy.includes(t.id)}
                    onChange={() => toggleBlockedBy(t.id)}
                    className="rounded border-gray-300 text-brand-blue"
                  />
                  <span className="text-xs text-gray-700 truncate">{t.title}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          {saveError && <p className="text-sm text-red-500 mr-auto">{saveError}</p>}
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
