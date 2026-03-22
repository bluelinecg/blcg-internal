'use client';

// Modal form for inviting a new user by email with a pre-assigned role.
// Calls POST /api/users which creates a Clerk invitation — the invitee
// receives an email with a sign-up link and lands with the role pre-set.
// Props:
//   isOpen   — controls visibility
//   onClose  — dismiss callback
//   onInvited — called after a successful invite so the parent can refresh

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, Select } from '@/components/ui';
import type { UserRole } from '@/lib/types/users';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvited: () => void;
}

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: 'owner',  label: 'Owner',  description: 'Full access including user management' },
  { value: 'admin',  label: 'Admin',  description: 'Full CRUD on all modules' },
  { value: 'member', label: 'Member', description: 'Limited edit access' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only across all modules' },
];

const ROLE_SELECT_OPTIONS = ROLE_OPTIONS.map(({ value, label }) => ({ value, label }));

interface FormState {
  email: string;
  role: UserRole;
}

const DEFAULTS: FormState = {
  email: '',
  role: 'member',
};

export function InviteUserModal({ isOpen, onClose, onInvited }: InviteUserModalProps) {
  const [form, setForm] = useState<FormState>({ ...DEFAULTS });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm({ ...DEFAULTS });
      setErrors({});
      setApiError(null);
    }
  }, [isOpen]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setApiError(null);
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.email.trim()) {
      next.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Enter a valid email address.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setIsSubmitting(true);
    setApiError(null);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim(), role: form.role }),
      });

      const json = (await res.json()) as { data: unknown; error: string | null };

      if (!res.ok || json.error) {
        setApiError(json.error ?? 'Failed to send invitation. Please try again.');
        return;
      }

      onInvited();
      onClose();
    } catch {
      setApiError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedRoleInfo = ROLE_OPTIONS.find((r) => r.value === form.role);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite Team Member" size="sm">
      <div className="px-6 py-5 space-y-4">
        <Input
          label="Email Address"
          type="email"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          placeholder="colleague@example.com"
          error={errors.email}
        />

        <div className="space-y-1.5">
          <Select
            label="Role"
            options={ROLE_SELECT_OPTIONS}
            value={form.role}
            onChange={(e) => set('role', e.target.value as UserRole)}
          />
          {selectedRoleInfo && (
            <p className="text-xs text-gray-500">{selectedRoleInfo.description}</p>
          )}
        </div>

        {apiError && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{apiError}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Sending…' : 'Send Invitation'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
