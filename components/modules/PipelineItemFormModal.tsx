'use client';

// Modal form for creating and editing a Pipeline Item (deal/opportunity).
// Props:
//   isOpen      — controls visibility
//   onClose     — dismiss callback
//   onSave      — called with create/update payload
//   initial     — pre-filled values for edit mode
//   stages      — list of stages for this pipeline (for the stage selector)
//   contacts    — list of contacts to optionally link
//   clients     — list of clients to optionally link
//   isSaving    — shows loading state on submit button
//   saveError   — displays an API error below the form

import { useEffect } from 'react';
import { useFormState } from '@/lib/hooks/use-form-state';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, Select, Textarea } from '@/components/ui';
import type { PipelineStage } from '@/lib/types/pipelines';
import type { Contact } from '@/lib/types/crm';
import type { Client } from '@/lib/types/clients';
import type { PipelineItemInput } from '@/lib/validations/pipelines';

interface PipelineItemFormData {
  stageId: string;
  title: string;
  value: string;
  contactId: string;
  clientId: string;
  notes: string;
}

interface PipelineItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<PipelineItemInput, 'pipelineId'>) => void;
  initial?: Partial<PipelineItemFormData>;
  defaultStageId?: string;
  stages: PipelineStage[];
  contacts: Contact[];
  clients: Client[];
  isSaving?: boolean;
  saveError?: string | null;
}

export function PipelineItemFormModal({
  isOpen,
  onClose,
  onSave,
  initial,
  defaultStageId,
  stages,
  contacts,
  clients,
  isSaving,
  saveError,
}: PipelineItemFormModalProps) {
  function makeDefaults(): PipelineItemFormData {
    return {
      stageId:   defaultStageId ?? stages[0]?.id ?? '',
      title:     '',
      value:     '',
      contactId: '',
      clientId:  '',
      notes:     '',
    };
  }

  const { form, errors, setField, reset, setErrors } = useFormState(makeDefaults(), initial);

  useEffect(() => {
    if (isOpen) reset(makeDefaults(), initial);
  }, [isOpen, initial, defaultStageId, stages]);

  function handleSubmit() {
    const next: typeof errors = {};
    if (!form.title.trim()) next.title = 'Title is required.';
    if (!form.stageId) next.stageId = 'Stage is required.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const parsed = parseFloat(form.value);
    onSave({
      stageId:   form.stageId,
      title:     form.title.trim(),
      value:     form.value && !isNaN(parsed) ? parsed : undefined,
      contactId: form.contactId || undefined,
      clientId:  form.clientId  || undefined,
      notes:     form.notes.trim() || undefined,
    });
  }

  const isEdit = !!initial?.title;

  const stageOptions = stages.map((s) => ({ value: s.id, label: s.name }));
  const contactOptions = [
    { value: '', label: 'None' },
    ...contacts.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}${c.title ? ` — ${c.title}` : ''}` })),
  ];
  const clientOptions = [
    { value: '', label: 'None' },
    ...clients.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Item' : 'New Item'} size="md">
      <div className="px-6 py-5 space-y-4">
        <Input
          label="Title"
          value={form.title}
          onChange={(e) => setField('title', e.target.value)}
          placeholder="e.g. Acme Corp — Website Redesign"
          error={errors.title}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Stage"
            options={stageOptions}
            value={form.stageId}
            onChange={(e) => setField('stageId', e.target.value)}
            error={errors.stageId}
          />
          <Input
            label="Value (optional)"
            type="number"
            min="0"
            step="0.01"
            value={form.value}
            onChange={(e) => setField('value', e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Contact (optional)"
            options={contactOptions}
            value={form.contactId}
            onChange={(e) => setField('contactId', e.target.value)}
          />
          <Select
            label="Client (optional)"
            options={clientOptions}
            value={form.clientId}
            onChange={(e) => setField('clientId', e.target.value)}
          />
        </div>
        <Textarea
          label="Notes (optional)"
          value={form.notes}
          onChange={(e) => setField('notes', e.target.value)}
          rows={2}
          placeholder="Any context about this deal…"
        />

        {saveError && <p className="text-sm text-red-500">{saveError}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Item'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
