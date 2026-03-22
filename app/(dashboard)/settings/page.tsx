'use client';

// Settings page — tabbed sections: Profile | Notifications | Preferences.
// Profile section is mostly informational (real values will come from Clerk user object).
// All form values are local state (mock) — wire to Clerk/Supabase when ready.

import { useState } from 'react';
import { PageShell } from '@/components/layout';
import { PageHeader } from '@/components/layout';
import { Tabs, Card, Button, Input, Select, Textarea } from '@/components/ui';
import type { TabItem } from '@/components/ui/Tabs';
import { BRAND } from '@/lib/constants/brand';

const TABS: TabItem[] = [
  { id: 'profile',       label: 'Profile' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'preferences',   label: 'Preferences' },
];

const TIMEZONE_OPTIONS = [
  { value: 'America/Denver',        label: 'Mountain Time (MT)' },
  { value: 'America/Chicago',       label: 'Central Time (CT)' },
  { value: 'America/New_York',      label: 'Eastern Time (ET)' },
  { value: 'America/Los_Angeles',   label: 'Pacific Time (PT)' },
];

const DATE_FORMAT_OPTIONS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <PageShell>
      <PageHeader title="Settings" subtitle="Manage your account and application preferences" />

      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

      {activeTab === 'profile'       && <ProfileTab />}
      {activeTab === 'notifications' && <NotificationsTab />}
      {activeTab === 'preferences'   && <PreferencesTab />}
    </PageShell>
  );
}

export default SettingsPage;

// --- Profile tab ---

function ProfileTab() {
  const [firstName, setFirstName] = useState('Ryan');
  const [lastName, setLastName]   = useState('Matthews');
  const [email, setEmail]         = useState('ryan@bluelinecg.com');
  const [phone, setPhone]         = useState('');
  const [bio, setBio]             = useState('Founder and operator of Blue Line Consulting Group.');
  const [saved, setSaved]         = useState(false);

  function handleSave() {
    // TODO: update Clerk user profile via Clerk SDK
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Avatar */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Profile Photo</h3>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-blue text-white text-xl font-bold">
            RM
          </div>
          <div>
            <p className="text-sm text-gray-700">Your avatar is managed by Clerk.</p>
            <p className="text-xs text-gray-400 mt-0.5">Update it from the user menu in the top navigation.</p>
          </div>
        </div>
      </Card>

      {/* Personal info */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Personal Information</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Phone (optional)"
            type="tel"
            value={phone}
            placeholder="(555) 000-0000"
            onChange={(e) => setPhone(e.target.value)}
          />
          <Textarea
            label="Bio (optional)"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
          />
        </div>
        <div className="mt-5 flex items-center gap-3">
          <Button onClick={handleSave}>Save Changes</Button>
          {saved && <span className="text-sm text-green-600 font-medium">Saved!</span>}
        </div>
      </Card>

      {/* Company info (read-only) */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Company</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Company Name</span>
            <span className="font-medium text-gray-900">{BRAND.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">App</span>
            <span className="font-medium text-gray-900">{BRAND.appName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Support Email</span>
            <span className="font-medium text-gray-900">{BRAND.supportEmail}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">App URL</span>
            <span className="font-medium text-gray-900">{BRAND.url}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

// --- Notifications tab ---

function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    newProposal:      true,
    proposalAccepted: true,
    invoicePaid:      true,
    invoiceOverdue:   true,
    newEmail:         false,
    taskDue:          true,
    weeklyDigest:     true,
  });

  function toggle(key: keyof typeof prefs) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const notifGroups = [
    {
      label: 'Proposals & Finances',
      items: [
        { key: 'newProposal' as const,      label: 'New proposal created',          description: 'When a proposal is added to the system' },
        { key: 'proposalAccepted' as const, label: 'Proposal accepted',             description: 'When a client accepts a proposal' },
        { key: 'invoicePaid' as const,      label: 'Invoice paid',                  description: 'When an invoice is marked as paid' },
        { key: 'invoiceOverdue' as const,   label: 'Invoice overdue',               description: 'When an invoice passes its due date unpaid' },
      ],
    },
    {
      label: 'Tasks & Email',
      items: [
        { key: 'newEmail' as const,    label: 'New email received',   description: 'Notify when a new email arrives in any account' },
        { key: 'taskDue' as const,     label: 'Task due soon',        description: 'Reminder 24 hours before a task is due' },
      ],
    },
    {
      label: 'Digest',
      items: [
        { key: 'weeklyDigest' as const, label: 'Weekly digest email', description: 'Summary of activity, open tasks, and outstanding invoices every Monday' },
      ],
    },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      {notifGroups.map((group) => (
        <Card key={group.label} className="p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">{group.label}</h3>
          <div className="divide-y divide-gray-100">
            {group.items.map((item) => (
              <div key={item.key} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                </div>
                <ToggleSwitch
                  checked={prefs[item.key]}
                  onChange={() => toggle(item.key)}
                />
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

// --- Preferences tab ---

function PreferencesTab() {
  const [timezone, setTimezone]         = useState('America/Denver');
  const [dateFormat, setDateFormat]     = useState('MM/DD/YYYY');
  const [defaultView, setDefaultView]   = useState('dashboard');
  const [saved, setSaved]               = useState(false);

  const DEFAULT_VIEW_OPTIONS = [
    { value: 'dashboard',  label: 'Dashboard' },
    { value: 'clients',    label: 'Clients' },
    { value: 'proposals',  label: 'Proposals' },
    { value: 'tasks',      label: 'Tasks' },
  ];

  function handleSave() {
    // TODO: persist to user metadata in Clerk or Supabase
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Display</h3>
        <div className="space-y-4">
          <Select
            label="Timezone"
            options={TIMEZONE_OPTIONS}
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          />
          <Select
            label="Date Format"
            options={DATE_FORMAT_OPTIONS}
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value)}
          />
          <Select
            label="Default Landing Page"
            options={DEFAULT_VIEW_OPTIONS}
            value={defaultView}
            onChange={(e) => setDefaultView(e.target.value)}
          />
        </div>
        <div className="mt-5 flex items-center gap-3">
          <Button onClick={handleSave}>Save Preferences</Button>
          {saved && <span className="text-sm text-green-600 font-medium">Saved!</span>}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Danger Zone</h3>
        <p className="text-xs text-gray-400 mb-4">These actions are irreversible. Proceed with caution.</p>
        <Button variant="danger" size="sm">Delete My Account</Button>
      </Card>
    </div>
  );
}

// --- Toggle switch primitive (local to settings only) ---

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
}

function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
        checked ? 'bg-brand-blue' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
