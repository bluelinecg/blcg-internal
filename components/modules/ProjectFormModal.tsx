'use client';

// Modal form for creating and editing Projects.
// Props:
//   isOpen     — controls visibility
//   onClose    — dismiss callback
//   onSave     — called with the new/updated project data
//   initial    — pre-filled values for edit mode (omit for create)
//   clients    — list of clients for the client selector
//   proposals  — list of accepted proposals for the linked proposal selector

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, Select, Textarea } from '@/components/ui';
import type { Project, ProjectStatus } from '@/lib/types/projects';
import type { Client } from '@/lib/types/clients';
import type { Proposal } from '@/lib/types/proposals';

type ProjectFormData = Omit<Project, 'id' | 'milestones' | 'createdAt' | 'updatedAt'>;

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProjectFormData) => void;
  initial?: Partial<ProjectFormData>;
  clients: Client[];
  proposals: Proposal[];
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'active',    label: 'Active' },
  { value: 'on_hold',   label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const DEFAULTS: ProjectFormData = {
  clientId: '',
  proposalId: undefined,
  name: '',
  status: 'active',
  startDate: new Date().toISOString(),
  targetDate: undefined,
  completedDate: undefined,
  budget: 0,
  notes: undefined,
};

export function ProjectFormModal({ isOpen, onClose, onSave, initial, clients, proposals }: ProjectFormModalProps) {
  const [form, setForm] = useState<ProjectFormData>({ ...DEFAULTS, ...initial });
  const [errors, setErrors] = useState<Partial<Record<keyof ProjectFormData, string>>>({});

  useEffect(() => {
    if (isOpen) {
      setForm({ ...DEFAULTS, ...initial });
      setErrors({});
    }
  }, [isOpen, initial]);

  function set<K extends keyof ProjectFormData>(key: K, value: ProjectFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = 'Project name is required.';
    if (!form.clientId) next.clientId = 'Client is required.';
    if (form.budget < 0) next.budget = 'Budget cannot be negative.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSave({
      ...form,
      proposalId: form.proposalId || undefined,
      targetDate: form.targetDate || undefined,
      notes: form.notes || undefined,
    });
    onClose();
  }

  const clientOptions = [
    { value: '', label: 'Select a client...' },
    ...clients.map((c) => ({ value: c.id, label: `${c.name}${c.contactName ? ` · ${c.contactName}` : ''}` })),
  ];

  const proposalOptions = [
    { value: '', label: 'No linked proposal' },
    ...proposals
      .filter((p) => p.status === 'accepted')
      .map((p) => ({ value: p.id, label: p.title })),
  ];

  const isEdit = !!initial?.name;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Project' : 'New Project'} size="md">
      <div className="px-6 py-5 space-y-4">
        <Input
          label="Project Name"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. Acme Corp — Website Redesign"
          error={errors.name}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Client"
            options={clientOptions}
            value={form.clientId}
            onChange={(e) => set('clientId', e.target.value)}
            error={errors.clientId}
          />
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={(e) => set('status', e.target.value as ProjectStatus)}
          />
        </div>
        <Select
          label="Linked Proposal (optional)"
          options={proposalOptions}
          value={form.proposalId ?? ''}
          onChange={(e) => set('proposalId', e.target.value || undefined)}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={form.startDate ? form.startDate.split('T')[0] : ''}
            onChange={(e) => set('startDate', e.target.value ? `${e.target.value}T00:00:00Z` : '')}
          />
          <Input
            label="Target Date (optional)"
            type="date"
            value={form.targetDate ? form.targetDate.split('T')[0] : ''}
            onChange={(e) => set('targetDate', e.target.value ? `${e.target.value}T00:00:00Z` : undefined)}
          />
        </div>
        <Input
          label="Budget ($)"
          type="number"
          value={form.budget.toString()}
          onChange={(e) => set('budget', parseFloat(e.target.value) || 0)}
          error={errors.budget}
        />
        <Textarea
          label="Notes (optional)"
          value={form.notes ?? ''}
          onChange={(e) => set('notes', e.target.value || undefined)}
          rows={3}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>{isEdit ? 'Save Changes' : 'Create Project'}</Button>
        </div>
      </div>
    </Modal>
  );
}
