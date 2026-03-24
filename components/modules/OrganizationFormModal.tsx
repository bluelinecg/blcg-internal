'use client';

// Modal form for creating and editing Organizations.
// Props:
//   isOpen     — controls visibility
//   onClose    — dismiss callback
//   onSave     — called with the new/updated organization data
//   initial    — pre-filled values for edit mode (omit for create)
//   isSaving   — disables buttons while the async save is in flight
//   saveError  — inline error message shown above the action buttons

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, Textarea } from '@/components/ui';
import type { Organization } from '@/lib/types/crm';

type OrgFormData = Omit<Organization, 'id' | 'createdAt' | 'updatedAt' | 'contactCount'>;

interface OrganizationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: OrgFormData) => void;
  initial?: Partial<OrgFormData>;
  isSaving?: boolean;
  saveError?: string | null;
}

const DEFAULTS: OrgFormData = {
  name:     '',
  website:  undefined,
  phone:    undefined,
  industry: undefined,
  address:  undefined,
  notes:    undefined,
};

export function OrganizationFormModal({
  isOpen,
  onClose,
  onSave,
  initial,
  isSaving,
  saveError,
}: OrganizationFormModalProps) {
  const [form, setForm] = useState<OrgFormData>({ ...DEFAULTS, ...initial });
  const [errors, setErrors] = useState<Partial<Record<keyof OrgFormData, string>>>({});

  useEffect(() => {
    if (isOpen) {
      setForm({ ...DEFAULTS, ...initial });
      setErrors({});
    }
  }, [isOpen, initial]);

  function set<K extends keyof OrgFormData>(key: K, value: OrgFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = 'Name is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSave(form);
  }

  const isEdit = !!initial?.name;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Organization' : 'New Organization'} size="md">
      <div className="px-6 py-5 space-y-4">
        <Input
          label="Name"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Acme Inc."
          error={errors.name}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Industry (optional)"
            value={form.industry ?? ''}
            onChange={(e) => set('industry', e.target.value || undefined)}
            placeholder="Technology"
          />
          <Input
            label="Phone (optional)"
            value={form.phone ?? ''}
            onChange={(e) => set('phone', e.target.value || undefined)}
            placeholder="+1 (555) 000-0000"
          />
        </div>
        <Input
          label="Website (optional)"
          value={form.website ?? ''}
          onChange={(e) => set('website', e.target.value || undefined)}
          placeholder="https://example.com"
        />
        <Input
          label="Address (optional)"
          value={form.address ?? ''}
          onChange={(e) => set('address', e.target.value || undefined)}
          placeholder="123 Main St, City, State"
        />
        <Textarea
          label="Notes (optional)"
          value={form.notes ?? ''}
          onChange={(e) => set('notes', e.target.value || undefined)}
          placeholder="Any relevant context..."
          rows={3}
        />
        <div className="flex justify-end gap-3 pt-2">
          {saveError && <p className="text-sm text-red-500 mr-auto">{saveError}</p>}
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Organization'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
