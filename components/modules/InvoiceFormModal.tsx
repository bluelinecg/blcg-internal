'use client';

// Modal form for creating Invoices.
// Includes a dynamic line items editor that auto-calculates totals.
// Props:
//   isOpen            — controls visibility
//   onClose           — dismiss callback
//   onSave            — called with the new invoice data
//   organizations     — list of organizations
//   projects          — list of projects for optional linking
//   nextInvoiceNumber — pre-filled invoice number
//   isSaving          — disables buttons while the async save is in flight
//   saveError         — inline error message shown above the action buttons

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, Select, Textarea } from '@/components/ui';
import type { Invoice, InvoiceLineItem, InvoiceStatus } from '@/lib/types/finances';
import type { Organization } from '@/lib/types/crm';
import type { Project } from '@/lib/types/projects';

type InvoiceFormData = Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>;

interface InvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: InvoiceFormData) => void;
  organizations: Organization[];
  projects: Project[];
  nextInvoiceNumber: string;
  isSaving?: boolean;
  saveError?: string | null;
}

const STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: 'draft',     label: 'Draft' },
  { value: 'sent',      label: 'Sent' },
  { value: 'paid',      label: 'Paid' },
  { value: 'overdue',   label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

function newLineItem(): InvoiceLineItem {
  return { id: `ili_${Date.now()}`, invoiceId: '', description: '', quantity: 1, unitPrice: 0, total: 0, isIncluded: false, sortOrder: 0 };
}

function makeDefaults(invoiceNumber: string): InvoiceFormData {
  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + 30);
  return {
    organizationId: '',
    projectId: undefined,
    proposalId: undefined,
    invoiceNumber,
    status: 'draft',
    lineItems: [newLineItem()],
    subtotal: 0,
    tax: 0,
    total: 0,
    paymentTerms: 'Net 15',
    paymentMethod: undefined,
    depositAmount: undefined,
    balanceDue: undefined,
    dueDate: dueDate.toISOString(),
    paidDate: undefined,
    notes: undefined,
  };
}

export function InvoiceFormModal({ isOpen, onClose, onSave, organizations, projects, nextInvoiceNumber, isSaving, saveError }: InvoiceFormModalProps) {
  const [form, setForm] = useState<InvoiceFormData>(makeDefaults(nextInvoiceNumber));
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  useEffect(() => {
    if (isOpen) {
      setForm(makeDefaults(nextInvoiceNumber));
      setErrors({});
    }
  }, [isOpen, nextInvoiceNumber]);

  function setField<K extends keyof InvoiceFormData>(key: K, value: InvoiceFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function updateLineItem(index: number, field: keyof InvoiceLineItem, raw: string) {
    setForm((prev) => {
      const items = prev.lineItems.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: field === 'description' ? raw : parseFloat(raw) || 0 };
        updated.total = (updated.quantity ?? 0) * (updated.unitPrice ?? 0);
        return updated;
      });
      const subtotal = items.reduce((s, it) => s + it.total, 0);
      return { ...prev, lineItems: items, subtotal, total: subtotal };
    });
  }

  function addLineItem() {
    setForm((prev) => ({ ...prev, lineItems: [...prev.lineItems, newLineItem()] }));
  }

  function removeLineItem(index: number) {
    setForm((prev) => {
      const items = prev.lineItems.filter((_, i) => i !== index);
      const subtotal = items.reduce((s, it) => s + it.total, 0);
      return { ...prev, lineItems: items, subtotal, total: subtotal };
    });
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.organizationId) next.organizationId = 'Organization is required.';
    if (!form.dueDate) next.dueDate = 'Due date is required.';
    if (form.lineItems.length === 0) next.lineItems = 'Add at least one line item.';
    form.lineItems.forEach((item, i) => {
      if (!item.description.trim()) next[`li_desc_${i}`] = 'Required.';
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSave({
      ...form,
      projectId: form.projectId || undefined,
      notes: form.notes || undefined,
    });
  }

  const orgOptions = [
    { value: '', label: 'Select an organization...' },
    ...organizations.map((o) => ({ value: o.id, label: o.name })),
  ];

  const projectOptions = [
    { value: '', label: 'No linked project' },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Invoice" size="xl">
      <div className="px-6 py-5 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Organization"
            options={orgOptions}
            value={form.organizationId}
            onChange={(e) => setField('organizationId', e.target.value)}
            error={errors.organizationId}
          />
          <Input
            label="Invoice Number"
            value={form.invoiceNumber}
            onChange={(e) => setField('invoiceNumber', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Project (optional)"
            options={projectOptions}
            value={form.projectId ?? ''}
            onChange={(e) => setField('projectId', e.target.value || undefined)}
          />
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={(e) => setField('status', e.target.value as InvoiceStatus)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Due Date"
            type="date"
            value={form.dueDate ? form.dueDate.split('T')[0] : ''}
            onChange={(e) => setField('dueDate', e.target.value ? `${e.target.value}T00:00:00Z` : '')}
            error={errors.dueDate}
          />
          <Input
            label="Paid Date (optional)"
            type="date"
            value={form.paidDate ? form.paidDate.split('T')[0] : ''}
            onChange={(e) => setField('paidDate', e.target.value ? `${e.target.value}T00:00:00Z` : undefined)}
          />
        </div>

        {/* Line items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Line Items</label>
            {errors.lineItems && <span className="text-xs text-red-500">{errors.lineItems}</span>}
          </div>
          <div className="rounded-md border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-12 gap-2 bg-gray-50 border-b border-gray-200 px-3 py-2">
              <span className="col-span-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</span>
              <span className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</span>
              <span className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit Price</span>
              <span className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Total</span>
              <span className="col-span-1" />
            </div>
            {form.lineItems.map((item, i) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-gray-100 last:border-0 items-center">
                <div className="col-span-5">
                  <input
                    className={`w-full rounded border px-2 py-1.5 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue ${errors[`li_desc_${i}`] ? 'border-red-400' : 'border-gray-300'}`}
                    value={item.description}
                    onChange={(e) => updateLineItem(i, 'description', e.target.value)}
                    placeholder="Description..."
                  />
                </div>
                <div className="col-span-2">
                  <input
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                    type="number" min="1"
                    value={item.quantity ?? ''}
                    onChange={(e) => updateLineItem(i, 'quantity', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <input
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                    type="number" min="0" step="0.01"
                    value={item.unitPrice ?? ''}
                    onChange={(e) => updateLineItem(i, 'unitPrice', e.target.value)}
                  />
                </div>
                <div className="col-span-2 text-right text-sm font-medium text-gray-900">
                  {formatCurrency(item.total)}
                </div>
                <div className="col-span-1 flex justify-end">
                  {form.lineItems.length > 1 && (
                    <button onClick={() => removeLineItem(i)} className="text-gray-300 hover:text-red-400 transition-colors" aria-label="Remove">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-t border-gray-200">
              <button onClick={addLineItem} className="text-xs font-medium text-brand-blue hover:underline">+ Add line item</button>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</span>
                <span className="text-sm font-bold text-gray-900 w-24 text-right">{formatCurrency(form.total)}</span>
              </div>
            </div>
          </div>
        </div>

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
            {isSaving ? 'Saving…' : 'Create Invoice'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}
