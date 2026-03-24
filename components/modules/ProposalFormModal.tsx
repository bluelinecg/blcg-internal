'use client';

// Modal form for creating and editing Proposals.
// Includes a dynamic line items editor that auto-calculates totals.
// Props:
//   isOpen        — controls visibility
//   onClose       — dismiss callback
//   onSave        — called with the new/updated proposal data
//   initial       — pre-filled values for edit mode (omit for create)
//   organizations — list of organizations for the organization selector

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, Select, Textarea } from '@/components/ui';
import type { Proposal, ProposalLineItem, ProposalStatus } from '@/lib/types/proposals';
import type { Contact, Organization } from '@/lib/types/crm';

type ProposalFormData = Omit<Proposal, 'id' | 'createdAt' | 'updatedAt'>;

interface ProposalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProposalFormData) => void;
  initial?: Partial<ProposalFormData>;
  organizations: Organization[];
  isSaving?: boolean;
  saveError?: string | null;
}

const STATUS_OPTIONS: { value: ProposalStatus; label: string }[] = [
  { value: 'draft',    label: 'Draft' },
  { value: 'sent',     label: 'Sent' },
  { value: 'viewed',   label: 'Viewed' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'expired',  label: 'Expired' },
];

function newLineItem(): ProposalLineItem {
  return { id: `li_${Date.now()}`, proposalId: '', description: '', quantity: 1, unitPrice: 0, total: 0, sortOrder: 0 };
}

const DEFAULTS: ProposalFormData = {
  organizationId: '',
  proposalNumber: '',
  title: '',
  status: 'draft',
  lineItems: [newLineItem()],
  totalValue: 0,
  notes: undefined,
  expiresAt: undefined,
  sentAt: undefined,
  contactId: undefined,
};

export function ProposalFormModal({ isOpen, onClose, onSave, initial, organizations, isSaving, saveError }: ProposalFormModalProps) {
  const [form, setForm] = useState<ProposalFormData>({ ...DEFAULTS, ...initial });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [orgContacts, setOrgContacts] = useState<Contact[]>([]);

  useEffect(() => {
    if (isOpen) {
      setForm({
        ...DEFAULTS,
        ...initial,
        lineItems: initial?.lineItems?.length ? initial.lineItems : [newLineItem()],
      });
      setErrors({});
      setOrgContacts([]);
    }
  }, [isOpen, initial]);

  // Fetch contacts for the selected organization
  useEffect(() => {
    if (!form.organizationId) {
      setOrgContacts([]);
      return;
    }

    async function fetchContacts() {
      try {
        const res = await fetch(`/api/contacts?organizationId=${form.organizationId}&pageSize=100`);
        const json = await res.json() as { data: Contact[] | null; error: string | null };
        setOrgContacts(json.data ?? []);
      } catch {
        setOrgContacts([]);
      }
    }

    void fetchContacts();
  }, [form.organizationId]);

  function setField<K extends keyof ProposalFormData>(key: K, value: ProposalFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  // --- Line item helpers ---

  function updateLineItem(index: number, field: keyof ProposalLineItem, raw: string) {
    setForm((prev) => {
      const items = prev.lineItems.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: field === 'description' ? raw : parseFloat(raw) || 0 };
        updated.total = updated.quantity * updated.unitPrice;
        return updated;
      });
      const totalValue = items.reduce((s, it) => s + it.total, 0);
      return { ...prev, lineItems: items, totalValue };
    });
  }

  function addLineItem() {
    setForm((prev) => ({ ...prev, lineItems: [...prev.lineItems, newLineItem()] }));
  }

  function removeLineItem(index: number) {
    setForm((prev) => {
      const items = prev.lineItems.filter((_, i) => i !== index);
      const totalValue = items.reduce((s, it) => s + it.total, 0);
      return { ...prev, lineItems: items, totalValue };
    });
  }

  // --- Validation ---

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.organizationId) next.organizationId = 'Organization is required.';
    if (!form.title.trim()) next.title = 'Title is required.';
    if (form.lineItems.length === 0) next.lineItems = 'Add at least one line item.';
    form.lineItems.forEach((item, i) => {
      if (!item.description.trim()) next[`li_desc_${i}`] = 'Description required.';
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSave({
      ...form,
      notes: form.notes || undefined,
      expiresAt: form.expiresAt || undefined,
      sentAt: form.sentAt || undefined,
    });
    onClose();
  }

  const orgOptions = [
    { value: '', label: 'Select an organization...' },
    ...organizations.map((o) => ({ value: o.id, label: o.name })),
  ];

  const contactOptions = [
    { value: '', label: 'None' },
    ...orgContacts.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}${c.title ? ` — ${c.title}` : ''}` })),
  ];

  const isEdit = !!initial?.title;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Proposal' : 'New Proposal'} size="xl">
      <div className="px-6 py-5 space-y-5">
        {/* Basic fields */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Organization"
            options={orgOptions}
            value={form.organizationId}
            onChange={(e) => {
              setField('organizationId', e.target.value);
              setField('contactId', undefined);
            }}
            error={errors.organizationId}
          />
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={(e) => setField('status', e.target.value as ProposalStatus)}
          />
        </div>
        {orgContacts.length > 0 && (
          <Select
            label="Contact (optional)"
            options={contactOptions}
            value={form.contactId ?? ''}
            onChange={(e) => setField('contactId', e.target.value || undefined)}
          />
        )}
        <Input
          label="Proposal Title"
          value={form.title}
          onChange={(e) => setField('title', e.target.value)}
          placeholder="e.g. E-Commerce Redesign — Full Stack Build"
          error={errors.title}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Expires (optional)"
            type="date"
            value={form.expiresAt ? form.expiresAt.split('T')[0] : ''}
            onChange={(e) => setField('expiresAt', e.target.value ? `${e.target.value}T00:00:00Z` : undefined)}
          />
          <Input
            label="Sent Date (optional)"
            type="date"
            value={form.sentAt ? form.sentAt.split('T')[0] : ''}
            onChange={(e) => setField('sentAt', e.target.value ? `${e.target.value}T00:00:00Z` : undefined)}
          />
        </div>

        {/* Line items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Line Items</label>
            {errors.lineItems && <span className="text-xs text-red-500">{errors.lineItems}</span>}
          </div>
          <div className="rounded-md border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 bg-gray-50 border-b border-gray-200 px-3 py-2">
              <span className="col-span-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</span>
              <span className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</span>
              <span className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit Price</span>
              <span className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Total</span>
              <span className="col-span-1" />
            </div>
            {/* Rows */}
            {form.lineItems.map((item, i) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-gray-100 last:border-0 items-center">
                <div className="col-span-5">
                  <input
                    className={`w-full rounded border px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue ${errors[`li_desc_${i}`] ? 'border-red-400' : 'border-gray-300'}`}
                    value={item.description}
                    onChange={(e) => updateLineItem(i, 'description', e.target.value)}
                    placeholder="Description..."
                  />
                </div>
                <div className="col-span-2">
                  <input
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(i, 'quantity', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <input
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-800 outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateLineItem(i, 'unitPrice', e.target.value)}
                  />
                </div>
                <div className="col-span-2 text-right text-sm font-medium text-gray-900">
                  {formatCurrency(item.total)}
                </div>
                <div className="col-span-1 flex justify-end">
                  {form.lineItems.length > 1 && (
                    <button
                      onClick={() => removeLineItem(i)}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                      aria-label="Remove line item"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
            {/* Footer: total + add row */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-t border-gray-200">
              <button
                onClick={addLineItem}
                className="text-xs font-medium text-brand-blue hover:underline"
              >
                + Add line item
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</span>
                <span className="text-sm font-bold text-gray-900 w-24 text-right">{formatCurrency(form.totalValue)}</span>
              </div>
            </div>
          </div>
        </div>

        <Textarea
          label="Notes (optional)"
          value={form.notes ?? ''}
          onChange={(e) => setField('notes', e.target.value || undefined)}
          rows={2}
          placeholder="Payment terms, special conditions..."
        />

        {saveError && (
          <p className="text-sm text-red-500">{saveError}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Proposal'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}
