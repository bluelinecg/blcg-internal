'use client';

// Modal form for creating and editing a Pipeline.
// Props:
//   isOpen     — controls visibility
//   onClose    — dismiss callback
//   onSave     — called with create/update payload
//   initial    — pre-filled values for edit mode
//   isSaving   — shows loading state on submit button
//   saveError  — displays an API error below the form

import { useEffect } from 'react';
import { useFormState } from '@/lib/hooks/use-form-state';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, Textarea } from '@/components/ui';
import type { PipelineInput } from '@/lib/validations/pipelines';

interface PipelineFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PipelineInput) => void;
  initial?: Partial<PipelineInput>;
  isSaving?: boolean;
  saveError?: string | null;
}

const DEFAULTS: PipelineInput = {
  name: '',
  description: undefined,
  isActive: true,
};

export function PipelineFormModal({ isOpen, onClose, onSave, initial, isSaving, saveError }: PipelineFormModalProps) {
  const { form, errors, setField, reset, setErrors } = useFormState(DEFAULTS, initial);

  useEffect(() => {
    if (isOpen) reset(DEFAULTS, initial);
  }, [isOpen, initial]);

  function handleSubmit() {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = 'Name is required.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSave({
      name: form.name.trim(),
      description: form.description?.trim() || undefined,
      isActive: form.isActive,
    });
  }

  const isEdit = !!initial?.name;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Pipeline' : 'New Pipeline'} size="md">
      <div className="px-6 py-5 space-y-4">
        <Input
          label="Pipeline Name"
          value={form.name}
          onChange={(e) => setField('name', e.target.value)}
          placeholder="e.g. Sales Pipeline"
          error={errors.name}
        />
        <Textarea
          label="Description (optional)"
          value={form.description ?? ''}
          onChange={(e) => setField('description', e.target.value || undefined)}
          rows={2}
          placeholder="What is this pipeline for?"
        />
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setField('isActive', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand-blue cursor-pointer"
          />
          <span className="text-sm text-gray-700">Active</span>
        </label>

        {saveError && <p className="text-sm text-red-500">{saveError}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Pipeline'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
