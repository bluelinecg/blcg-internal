'use client';

// Shared form for creating and editing clients.
// In create mode (no client prop), submits navigate to /clients.
// In edit mode (client prop provided), submits navigate to /clients/[id].
// TODO: replace console.log with Supabase insert/update when backend is connected.
//
// Props:
//   client — pre-filled Client data; omit for create mode

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { Card } from '@/components/ui';
import { Input } from '@/components/ui';
import { Select } from '@/components/ui';
import { Textarea } from '@/components/ui';
import type { Client, ClientStatus } from '@/lib/types/clients';

interface ClientFormProps {
  client?: Client;
}

interface FormState {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  status: ClientStatus;
  notes: string;
}

interface FormErrors {
  name?: string;
  contactName?: string;
  email?: string;
}

const STATUS_OPTIONS = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = 'Company name is required.';
  if (!form.contactName.trim()) errors.contactName = 'Contact name is required.';
  if (!form.email.trim()) errors.email = 'Email is required.';
  else if (!EMAIL_REGEX.test(form.email)) errors.email = 'Enter a valid email address.';
  return errors;
}

export function ClientForm({ client }: ClientFormProps) {
  const router = useRouter();
  const isEdit = Boolean(client);

  const [form, setForm] = useState<FormState>({
    name: client?.name ?? '',
    contactName: client?.contactName ?? '',
    email: client?.email ?? '',
    phone: client?.phone ?? '',
    status: client?.status ?? 'prospect',
    notes: client?.notes ?? '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (isEdit && client) {
      // TODO: wire to Supabase update
      console.log('Update client:', { id: client.id, ...form });
      router.push(`/clients/${client.id}`);
    } else {
      // TODO: wire to Supabase insert
      console.log('Create client:', form);
      router.push('/clients');
    }
  }

  function handleCancel() {
    if (isEdit && client) {
      router.push(`/clients/${client.id}`);
    } else {
      router.push('/clients');
    }
  }

  return (
    <Card className="max-w-2xl p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div className="grid grid-cols-2 gap-4">
          <Input
            id="name"
            label="Company Name"
            placeholder="Acme Corp"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={errors.name}
            required
          />
          <Input
            id="contactName"
            label="Contact Name"
            placeholder="Jane Smith"
            value={form.contactName}
            onChange={(e) => handleChange('contactName', e.target.value)}
            error={errors.contactName}
            required
          />
          <Input
            id="email"
            label="Email"
            type="email"
            placeholder="jane@acmecorp.com"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            error={errors.email}
            required
          />
          <Input
            id="phone"
            label="Phone"
            placeholder="(555) 123-4567"
            value={form.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
          />
        </div>

        <Select
          id="status"
          label="Status"
          options={STATUS_OPTIONS}
          value={form.status}
          onChange={(e) => handleChange('status', e.target.value)}
          className="max-w-xs"
        />

        <Textarea
          id="notes"
          label="Notes"
          placeholder="Any relevant context about this client..."
          value={form.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={4}
        />

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit">{isEdit ? 'Save Changes' : 'Save Client'}</Button>
          <Button type="button" variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
