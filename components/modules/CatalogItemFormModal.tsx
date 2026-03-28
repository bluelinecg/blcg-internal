'use client';

// Modal form for creating and editing catalog items.
// Props:
//   isOpen    — controls visibility
//   onClose   — dismiss callback
//   onSave    — called with the new/updated item data
//   initial   — pre-filled values for edit mode (omit for create)
//   isSaving  — disables buttons while the async save is in flight
//   saveError — inline error message shown above the action buttons

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, Textarea } from '@/components/ui';
import type { CatalogItem } from '@/lib/types/catalog';

type CatalogItemFormData = Omit<CatalogItem, 'id' | 'createdAt' | 'updatedAt'>;

interface CatalogItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CatalogItemFormData) => void;
  initial?: Partial<CatalogItemFormData>;
  isSaving?: boolean;
  saveError?: string | null;
}

const DEFAULTS: CatalogItemFormData = {
  name:        '',
  description: undefined,
  unitPrice:   0,
  category:    undefined,
  isActive:    true,
};

export function CatalogItemFormModal({
  isOpen,
  onClose,
  onSave,
  initial,
  isSaving,
  saveError,
}: CatalogItemFormModalProps) {
  const [form, setForm]     = useState<CatalogItemFormData>({ ...DEFAULTS, ...initial });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  useEffect(() => {
    if (isOpen) {
      setForm({ ...DEFAULTS, ...initial });
      setErrors({});
    }
  }, [isOpen, initial]);

  function setField<K extends keyof CatalogItemFormData>(key: K, value: CatalogItemFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = 'Name is required.';
    if (form.unitPrice < 0) next.unitPrice = 'Unit price must be 0 or greater.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSave({
      ...form,
      description: form.description || undefined,
      category:    form.category || undefined,
    });
  }

  const isEdit = !!initial?.name;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Catalog Item' : 'New Catalog Item'}>
      <div className="px-6 py-5 space-y-4">
        <Input
          label="Name"
          value={form.name}
          onChange={(e) => setField('name', e.target.value)}
          placeholder="e.g. Website Audit"
          error={errors.name}
        />

        <Textarea
          label="Description (optional)"
          value={form.description ?? ''}
          onChange={(e) => setField('description', e.target.value || undefined)}
          rows={2}
          placeholder="Brief description of the service or product..."
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Unit Price"
            type="number"
            min="0"
            step="0.01"
            value={form.unitPrice}
            onChange={(e) => setField('unitPrice', parseFloat(e.target.value) || 0)}
            error={errors.unitPrice}
          />
          <Input
            label="Category (optional)"
            value={form.category ?? ''}
            onChange={(e) => setField('category', e.target.value || undefined)}
            placeholder="e.g. Consulting"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setField('isActive', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
          />
          <span className="text-sm text-gray-700">Active (visible in picker)</span>
        </label>

        {saveError && (
          <p className="text-sm text-red-500">{saveError}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Item'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
