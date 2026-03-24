'use client';

// Shared form for creating and editing clients.
// In create mode (no client prop), POSTs to /api/clients then navigates to /clients.
// In edit mode (client prop provided), PATCHes /api/clients/[id] then navigates back.
//
// Props:
//   client        — pre-filled Client data; omit for create mode
//   organizations — list of all organizations, passed from server component parent

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input, Select, Textarea } from '@/components/ui';
import type { Client, ClientStatus } from '@/lib/types/clients';
import type { Organization, Contact } from '@/lib/types/crm';

interface ClientFormProps {
  client?: Client;
  organizations: Organization[];
}

interface FormState {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  status: ClientStatus;
  notes: string;
  organizationId: string;
}

interface FormErrors {
  name?: string;
  contactName?: string;
  email?: string;
  submit?: string;
}

const STATUS_OPTIONS = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'active',   label: 'Active' },
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

export function ClientForm({ client, organizations }: ClientFormProps) {
  const router = useRouter();
  const isEdit = Boolean(client);

  const [form, setForm] = useState<FormState>({
    name:           client?.name ?? '',
    contactName:    client?.contactName ?? '',
    email:          client?.email ?? '',
    phone:          client?.phone ?? '',
    status:         client?.status ?? 'prospect',
    notes:          client?.notes ?? '',
    organizationId: client?.organizationId ?? '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Contacts for the selected org — used for the prefill picker
  const [orgContacts, setOrgContacts] = useState<Contact[]>([]);
  const [selectedPrefillId, setSelectedPrefillId] = useState('');

  useEffect(() => {
    if (!form.organizationId) {
      setOrgContacts([]);
      setSelectedPrefillId('');
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

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function handleOrgChange(orgId: string) {
    setForm((prev) => ({ ...prev, organizationId: orgId }));
    setSelectedPrefillId('');
  }

  function handlePrefillContact(contactId: string) {
    setSelectedPrefillId(contactId);
    if (!contactId) return;
    const contact = orgContacts.find((c) => c.id === contactId);
    if (!contact) return;
    setForm((prev) => ({
      ...prev,
      contactName: `${contact.firstName} ${contact.lastName}`,
      email:       contact.email ?? prev.email,
      phone:       contact.phone ?? prev.phone,
    }));
    setErrors((prev) => ({ ...prev, contactName: undefined, email: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = {
        name:           form.name.trim(),
        contactName:    form.contactName.trim(),
        email:          form.email.trim(),
        phone:          form.phone.trim() || undefined,
        status:         form.status,
        notes:          form.notes.trim() || undefined,
        organizationId: form.organizationId || undefined,
      };

      const url    = isEdit ? `/api/clients/${client!.id}` : '/api/clients';
      const method = isEdit ? 'PATCH' : 'POST';

      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json() as { data: Client | null; error: string | null };

      if (!res.ok || json.error) {
        setErrors({ submit: json.error ?? 'Something went wrong. Please try again.' });
        return;
      }

      router.push(isEdit ? `/clients/${client!.id}` : '/clients');
      router.refresh();
    } catch {
      setErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    router.push(isEdit ? `/clients/${client!.id}` : '/clients');
  }

  const orgOptions = [
    { value: '', label: 'None' },
    ...organizations.map((o) => ({ value: o.id, label: o.name })),
  ];

  const contactPrefillOptions = [
    { value: '', label: 'Select a contact to prefill…' },
    ...orgContacts.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}${c.title ? ` — ${c.title}` : ''}` })),
  ];

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
          <Select
            id="organizationId"
            label="Linked Organization"
            options={orgOptions}
            value={form.organizationId}
            onChange={(e) => handleOrgChange(e.target.value)}
          />
        </div>

        {orgContacts.length > 0 && (
          <Select
            id="prefillContact"
            label="Prefill contact details from…"
            options={contactPrefillOptions}
            value={selectedPrefillId}
            onChange={(e) => handlePrefillContact(e.target.value)}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
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
          <Select
            id="status"
            label="Status"
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={(e) => handleChange('status', e.target.value)}
          />
        </div>

        <Textarea
          id="notes"
          label="Notes"
          placeholder="Any relevant context about this client..."
          value={form.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={4}
        />

        {errors.submit && (
          <p className="text-sm text-red-500">{errors.submit}</p>
        )}

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Client'}
          </Button>
          <Button type="button" variant="secondary" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
