'use client';

// Modal form for composing a new email.
// Simulates sending — in production this would call an email API (SendGrid, Resend, etc.)
// Props:
//   isOpen   — controls visibility
//   onClose  — dismiss callback
//   onSend   — called with the composed email data

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, Select, Textarea } from '@/components/ui';
import type { EmailAccount } from '@/lib/types/emails';

interface ComposeData {
  from: EmailAccount;
  to: string;
  cc: string;
  subject: string;
  body: string;
}

interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (data: ComposeData) => void;
  defaultFrom?: EmailAccount;
}

const ACCOUNT_OPTIONS: { value: EmailAccount; label: string }[] = [
  { value: 'ryan@bluelinecg.com',    label: 'ryan@bluelinecg.com' },
  { value: 'bluelinecgllc@gmail.com', label: 'bluelinecgllc@gmail.com' },
];

const DEFAULTS: ComposeData = {
  from: 'ryan@bluelinecg.com',
  to: '',
  cc: '',
  subject: '',
  body: '',
};

export function ComposeEmailModal({ isOpen, onClose, onSend, defaultFrom }: ComposeEmailModalProps) {
  const [form, setForm] = useState<ComposeData>({ ...DEFAULTS, from: defaultFrom ?? DEFAULTS.from });
  const [errors, setErrors] = useState<Partial<Record<keyof ComposeData, string>>>({});

  useEffect(() => {
    if (isOpen) {
      setForm({ ...DEFAULTS, from: defaultFrom ?? DEFAULTS.from });
      setErrors({});
    }
  }, [isOpen, defaultFrom]);

  function set<K extends keyof ComposeData>(key: K, value: ComposeData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.to.trim()) next.to = 'Recipient is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.to.trim())) next.to = 'Enter a valid email address.';
    if (!form.subject.trim()) next.subject = 'Subject is required.';
    if (!form.body.trim()) next.body = 'Message body is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSend() {
    if (!validate()) return;
    onSend(form);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Email" size="lg">
      <div className="px-6 py-5 space-y-4">
        <Select
          label="From"
          options={ACCOUNT_OPTIONS}
          value={form.from}
          onChange={(e) => set('from', e.target.value as EmailAccount)}
        />
        <Input
          label="To"
          type="email"
          value={form.to}
          onChange={(e) => set('to', e.target.value)}
          placeholder="recipient@example.com"
          error={errors.to}
        />
        <Input
          label="CC (optional)"
          value={form.cc}
          onChange={(e) => set('cc', e.target.value)}
          placeholder="cc@example.com"
        />
        <Input
          label="Subject"
          value={form.subject}
          onChange={(e) => set('subject', e.target.value)}
          placeholder="Email subject..."
          error={errors.subject}
        />
        <Textarea
          label="Message"
          value={form.body}
          onChange={(e) => set('body', e.target.value)}
          placeholder="Write your message..."
          rows={8}
          error={errors.body}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Discard</Button>
          <Button onClick={handleSend}>Send Email</Button>
        </div>
      </div>
    </Modal>
  );
}
