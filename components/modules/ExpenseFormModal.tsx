'use client';

// Modal form for creating and editing Expenses.
// Props:
//   isOpen    — controls visibility
//   onClose   — dismiss callback
//   onSave    — called with the new/updated expense data
//   initial   — pre-filled values for edit mode (omit for create)
//   projects  — list of projects for the optional project selector

import { useEffect } from 'react';
import { useFormState } from '@/lib/hooks/use-form-state';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, Select, Textarea } from '@/components/ui';
import type { Expense, ExpenseCategory } from '@/lib/types/finances';
import type { Project } from '@/lib/types/projects';

type ExpenseFormData = Omit<Expense, 'id' | 'createdAt'>;

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ExpenseFormData) => void;
  initial?: Partial<ExpenseFormData>;
  projects: Project[];
  isSaving?: boolean;
  saveError?: string | null;
}

const CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: 'software',    label: 'Software' },
  { value: 'contractors', label: 'Contractors' },
  { value: 'marketing',   label: 'Marketing' },
  { value: 'equipment',   label: 'Equipment' },
  { value: 'travel',      label: 'Travel' },
  { value: 'office',      label: 'Office' },
  { value: 'other',       label: 'Other' },
];

function makeDefaults(): ExpenseFormData {
  const now = new Date().toISOString();
  return {
    description: '',
    category: 'software',
    amount: 0,
    projectId: undefined,
    vendor: undefined,
    date: now.split('T')[0] + 'T00:00:00Z',
    notes: undefined,
    updatedAt: now,
  };
}

export function ExpenseFormModal({ isOpen, onClose, onSave, initial, projects, isSaving, saveError }: ExpenseFormModalProps) {
  const { form, errors, setField, reset, setErrors } = useFormState(makeDefaults(), initial);

  useEffect(() => {
    if (isOpen) reset(makeDefaults(), initial);
  }, [isOpen, initial]);

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.description.trim()) next.description = 'Description is required.';
    if (form.amount <= 0) next.amount = 'Amount must be greater than zero.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSave({
      ...form,
      projectId: form.projectId || undefined,
      vendor: form.vendor || undefined,
      notes: form.notes || undefined,
    });
  }

  const projectOptions = [
    { value: '', label: 'No project' },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];

  const isEdit = !!initial?.description;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Expense' : 'New Expense'} size="md">
      <div className="px-6 py-5 space-y-4">
        <Input
          label="Description"
          value={form.description}
          onChange={(e) => setField('description', e.target.value)}
          placeholder="e.g. Figma Professional — Monthly"
          error={errors.description}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Category"
            options={CATEGORY_OPTIONS}
            value={form.category}
            onChange={(e) => setField('category', e.target.value as ExpenseCategory)}
          />
          <Input
            label="Amount ($)"
            type="number"
            value={form.amount.toString()}
            onChange={(e) => setField('amount', parseFloat(e.target.value) || 0)}
            error={errors.amount}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Vendor (optional)"
            value={form.vendor ?? ''}
            onChange={(e) => setField('vendor', e.target.value || undefined)}
            placeholder="e.g. Figma"
          />
          <Input
            label="Date"
            type="date"
            value={form.date ? form.date.split('T')[0] : ''}
            onChange={(e) => setField('date', e.target.value ? `${e.target.value}T00:00:00Z` : '')}
          />
        </div>
        <Select
          label="Project (optional)"
          options={projectOptions}
          value={form.projectId ?? ''}
          onChange={(e) => setField('projectId', e.target.value || undefined)}
        />
        <Textarea
          label="Notes (optional)"
          value={form.notes ?? ''}
          onChange={(e) => setField('notes', e.target.value || undefined)}
          rows={2}
        />
        <div className="flex justify-end gap-3 pt-2">
          {saveError && <p className="text-sm text-red-500 mr-auto">{saveError}</p>}
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Expense'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
