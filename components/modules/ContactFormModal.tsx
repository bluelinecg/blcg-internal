'use client';

// Modal form for creating and editing Contacts.
// Props:
//   isOpen         — controls visibility
//   onClose        — dismiss callback
//   onSave         — called with the new/updated contact data
//   initial        — pre-filled values for edit mode (omit for create)
//   organizations  — list of organizations for the organization selector
//   isSaving       — disables buttons while the async save is in flight
//   saveError      — inline error message shown above the action buttons

import { useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, Select, Textarea } from '@/components/ui';
import { useFormState } from '@/lib/hooks/use-form-state';
import type { Contact, ContactStatus, Organization } from '@/lib/types/crm';

type ContactFormData = Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>;

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ContactFormData) => void;
  initial?: Partial<ContactFormData>;
  organizations: Organization[];
  isSaving?: boolean;
  saveError?: string | null;
}

const STATUS_OPTIONS: { value: ContactStatus; label: string }[] = [
  { value: 'lead',      label: 'Lead' },
  { value: 'prospect',  label: 'Prospect' },
  { value: 'active',    label: 'Active' },
  { value: 'inactive',  label: 'Inactive' },
];

const DEFAULTS: ContactFormData = {
  firstName:      '',
  lastName:       '',
  email:          undefined,
  phone:          undefined,
  title:          undefined,
  organizationId: undefined,
  status:         'lead',
  notes:          undefined,
};

export function ContactFormModal({
  isOpen,
  onClose,
  onSave,
  initial,
  organizations,
  isSaving,
  saveError,
}: ContactFormModalProps) {
  const { form, errors, setField, reset, setErrors } = useFormState(DEFAULTS, initial);

  useEffect(() => {
    if (isOpen) reset(DEFAULTS, initial);
  }, [isOpen, initial]);

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.firstName.trim()) next.firstName = 'First name is required.';
    if (!form.lastName.trim())  next.lastName  = 'Last name is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSave(form);
  }

  const orgOptions = [
    { value: '', label: 'No organization' },
    ...organizations.map((o) => ({ value: o.id, label: o.name })),
  ];

  const isEdit = !!(initial?.firstName || initial?.lastName);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Contact' : 'New Contact'} size="md">
      <div className="px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            value={form.firstName}
            onChange={(e) => setField('firstName', e.target.value)}
            placeholder="Jane"
            error={errors.firstName}
          />
          <Input
            label="Last Name"
            value={form.lastName}
            onChange={(e) => setField('lastName', e.target.value)}
            placeholder="Smith"
            error={errors.lastName}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Email (optional)"
            type="email"
            value={form.email ?? ''}
            onChange={(e) => setField('email', e.target.value || undefined)}
            placeholder="jane@example.com"
          />
          <Input
            label="Phone (optional)"
            value={form.phone ?? ''}
            onChange={(e) => setField('phone', e.target.value || undefined)}
            placeholder="+1 (555) 000-0000"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Title (optional)"
            value={form.title ?? ''}
            onChange={(e) => setField('title', e.target.value || undefined)}
            placeholder="CEO"
          />
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={(e) => setField('status', e.target.value as ContactStatus)}
          />
        </div>
        <Select
          label="Organization (optional)"
          options={orgOptions}
          value={form.organizationId ?? ''}
          onChange={(e) => setField('organizationId', e.target.value || undefined)}
        />
        <Textarea
          label="Notes (optional)"
          value={form.notes ?? ''}
          onChange={(e) => setField('notes', e.target.value || undefined)}
          placeholder="Any relevant context..."
          rows={3}
        />
        <div className="flex justify-end gap-3 pt-2">
          {saveError && <p className="text-sm text-red-500 mr-auto">{saveError}</p>}
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Contact'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
