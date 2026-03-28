'use client';

// Settings page — tabbed sections: Profile | Notifications | Preferences.
// Profile section is mostly informational (real values will come from Clerk user object).
// All form values are local state (mock) — wire to Clerk/Supabase when ready.

import { useState, useEffect, useCallback } from 'react';
import { PageShell } from '@/components/layout';
import { PageHeader } from '@/components/layout';
import { Tabs, Card, Button, Input, Select, Textarea, Badge, ConfirmDialog, Spinner } from '@/components/ui';
import type { TabItem } from '@/components/ui/Tabs';
import { BRAND } from '@/lib/constants/brand';
import { useRole } from '@/lib/auth/use-role';
import type { WebhookEndpoint, WebhookDelivery, WebhookEventType } from '@/lib/types/webhooks';
import { ActivityFeed } from '@/components/modules';
import type { NotificationPreferences } from '@/lib/types/notifications';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/lib/types/notifications';

const TABS: TabItem[] = [
  { id: 'profile',       label: 'Profile' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'preferences',   label: 'Preferences' },
  { id: 'webhooks',      label: 'Webhooks' },
  { id: 'activity',      label: 'Activity Log' },
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
  const role = useRole();

  const tabs = role === 'admin'
    ? TABS
    : TABS.filter((t) => t.id !== 'webhooks' && t.id !== 'activity');

  return (
    <PageShell>
      <PageHeader title="Settings" subtitle="Manage your account and application preferences" />

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

      {activeTab === 'profile'       && <ProfileTab />}
      {activeTab === 'notifications' && <NotificationsTab />}
      {activeTab === 'preferences'   && <PreferencesTab />}
      {activeTab === 'webhooks'      && <WebhooksTab />}
      {activeTab === 'activity'      && <ActivityLogTab />}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
  const [prefs, setPrefs]       = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved]         = useState(false);

  const loadPrefs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res  = await fetch('/api/notifications/preferences');
      const json = await res.json() as { data: NotificationPreferences | null; error: string | null };
      if (res.ok && json.data) setPrefs(json.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadPrefs(); }, [loadPrefs]);

  async function toggle(key: keyof NotificationPreferences) {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSaveError(null);
    try {
      const res  = await fetch('/api/notifications/preferences', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(updated),
      });
      const json = await res.json() as { data: null; error: string | null };
      if (!res.ok || json.error) {
        setSaveError(json.error ?? 'Failed to save preferences');
        setPrefs(prefs); // revert
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError('Network error. Please try again.');
      setPrefs(prefs); // revert
    }
  }

  const notifGroups: Array<{
    label: string;
    items: Array<{ key: keyof NotificationPreferences; label: string; description: string }>;
  }> = [
    {
      label: 'Proposals & Finances',
      items: [
        { key: 'newProposal',      label: 'New proposal created',  description: 'When a proposal is added to the system' },
        { key: 'proposalAccepted', label: 'Proposal accepted',     description: 'When a client accepts a proposal' },
        { key: 'invoicePaid',      label: 'Invoice paid',          description: 'When an invoice is marked as paid' },
        { key: 'invoiceOverdue',   label: 'Invoice overdue',       description: 'When an invoice passes its due date unpaid' },
      ],
    },
    {
      label: 'Tasks & Email',
      items: [
        { key: 'newEmail', label: 'New email received', description: 'Notify when a new email arrives in any account' },
        { key: 'taskDue',  label: 'Task due soon',      description: 'Reminder 24 hours before a task is due' },
      ],
    },
    {
      label: 'Digest',
      items: [
        { key: 'weeklyDigest', label: 'Weekly digest email', description: 'Summary of activity, open tasks, and outstanding invoices every Monday' },
      ],
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {saveError && (
        <div className="rounded bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-600">{saveError}</p>
        </div>
      )}
      {saved && (
        <div className="rounded bg-green-50 border border-green-200 px-4 py-3">
          <p className="text-sm text-green-600">Preferences saved.</p>
        </div>
      )}
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
                  onChange={() => void toggle(item.key)}
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

// --- Webhooks tab ---

const ALL_EVENTS: { value: WebhookEventType; label: string }[] = [
  { value: 'contact.created',             label: 'Contact Created' },
  { value: 'contact.updated',             label: 'Contact Updated' },
  { value: 'organization.created',        label: 'Organization Created' },
  { value: 'task.created',                label: 'Task Created' },
  { value: 'task.status_changed',         label: 'Task Status Changed' },
  { value: 'proposal.status_changed',     label: 'Proposal Status Changed' },
  { value: 'pipeline.item_stage_changed', label: 'Pipeline Item Stage Changed' },
];

const DELIVERY_STATUS_VARIANT: Record<string, 'green' | 'red' | 'gray'> = {
  success: 'green',
  failed:  'red',
  pending: 'gray',
};

function WebhooksTab() {
  const [endpoints, setEndpoints]         = useState<WebhookEndpoint[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [fetchError, setFetchError]       = useState<string | null>(null);

  const [formOpen, setFormOpen]           = useState(false);
  const [url, setUrl]                     = useState('');
  const [description, setDescription]     = useState('');
  const [selectedEvents, setSelectedEvents] = useState<WebhookEventType[]>([]);
  const [isSaving, setIsSaving]           = useState(false);
  const [saveError, setSaveError]         = useState<string | null>(null);
  const [newSecret, setNewSecret]         = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget]   = useState<WebhookEndpoint | null>(null);
  const [isDeleting, setIsDeleting]       = useState(false);
  const [deleteError, setDeleteError]     = useState<string | null>(null);

  const [logEndpoint, setLogEndpoint]     = useState<WebhookEndpoint | null>(null);
  const [deliveries, setDeliveries]       = useState<WebhookDelivery[]>([]);
  const [logLoading, setLogLoading]       = useState(false);
  const [logError, setLogError]           = useState<string | null>(null);

  useEffect(() => { void loadEndpoints(); }, []);

  async function loadEndpoints() {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res  = await fetch('/api/webhooks/endpoints');
      const json = await res.json() as { data: WebhookEndpoint[] | null; error: string | null };
      if (!res.ok || json.error) { setFetchError(json.error ?? 'Failed to load'); return; }
      setEndpoints(json.data ?? []);
    } catch {
      setFetchError('Failed to load webhook endpoints');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate() {
    setIsSaving(true);
    setSaveError(null);
    try {
      const res  = await fetch('/api/webhooks/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, description: description || undefined, events: selectedEvents }),
      });
      const json = await res.json() as { data: WebhookEndpoint | null; error: string | null };
      if (!res.ok || json.error) { setSaveError(json.error ?? 'Failed to create'); return; }
      if (json.data) {
        setNewSecret(json.data.secret);
        setEndpoints((prev) => [json.data!, ...prev]);
        setUrl('');
        setDescription('');
        setSelectedEvents([]);
        setFormOpen(false);
      }
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res  = await fetch(`/api/webhooks/endpoints/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json() as { data: unknown; error: string | null };
      if (!res.ok || json.error) { setDeleteError(json.error ?? 'Failed to delete'); setDeleteTarget(null); return; }
      setEndpoints((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setDeleteError('Network error. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }

  async function openLog(endpoint: WebhookEndpoint) {
    setLogEndpoint(endpoint);
    setLogLoading(true);
    setLogError(null);
    setDeliveries([]);
    try {
      const res  = await fetch(`/api/webhooks/endpoints/${endpoint.id}/deliveries`);
      const json = await res.json() as { data: WebhookDelivery[] | null; error: string | null };
      if (!res.ok || json.error) { setLogError(json.error ?? 'Failed to load'); return; }
      setDeliveries(json.data ?? []);
    } catch {
      setLogError('Failed to load delivery log');
    } finally {
      setLogLoading(false);
    }
  }

  function toggleEvent(event: WebhookEventType) {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Webhook Endpoints</h2>
          <p className="text-xs text-gray-400 mt-0.5">Receive signed HTTP POST events when key actions occur in the app.</p>
        </div>
        <Button onClick={() => { setFormOpen(true); setSaveError(null); setNewSecret(null); }} size="sm">
          + Add Endpoint
        </Button>
      </div>

      {deleteError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-600">{deleteError}</p>
        </div>
      )}

      {/* New secret banner — shown once after creation */}
      {newSecret && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3">
          <p className="text-xs font-semibold text-green-700 mb-1">Endpoint created — save your signing secret now. It will not be shown again.</p>
          <code className="text-xs font-mono text-green-900 break-all">{newSecret}</code>
          <button onClick={() => setNewSecret(null)} className="ml-4 text-xs text-green-600 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Create form */}
      {formOpen && (
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">New Endpoint</h3>
          {saveError && <p className="text-xs text-red-500">{saveError}</p>}
          <Input
            label="URL"
            placeholder="https://example.com/webhook"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Input
            label="Description (optional)"
            placeholder="e.g. Zapier CRM sync"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Events</p>
            <div className="grid grid-cols-2 gap-2">
              {ALL_EVENTS.map((ev) => (
                <label key={ev.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(ev.value)}
                    onChange={() => toggleEvent(ev.value)}
                    className="rounded border-gray-300 text-brand-blue"
                  />
                  <span className="text-xs text-gray-700">{ev.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={handleCreate} disabled={isSaving || !url || selectedEvents.length === 0} size="sm">
              {isSaving ? 'Saving…' : 'Save Endpoint'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setFormOpen(false); setSaveError(null); }}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Endpoint list */}
      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Spinner /></div>
        ) : fetchError ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-red-500">{fetchError}</p>
          </div>
        ) : endpoints.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-400">No endpoints configured. Add one to start receiving events.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">URL</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Events</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {endpoints.map((ep) => (
                  <tr key={ep.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-xs" title={ep.url}>{ep.url}</p>
                      {ep.description && <p className="text-xs text-gray-400 mt-0.5">{ep.description}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {ep.events.map((ev) => (
                          <span key={ev} className="inline-flex items-center rounded px-1.5 py-0.5 text-xs bg-brand-navy/10 text-brand-navy font-medium">
                            {ev}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={ep.isActive ? 'green' : 'gray'}>{ep.isActive ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openLog(ep)}
                          className="text-xs text-gray-400 hover:text-brand-blue transition-colors px-1"
                        >
                          View Log
                        </button>
                        <button
                          onClick={() => setDeleteTarget(ep)}
                          className="text-xs text-gray-400 hover:text-red-500 transition-colors px-1"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Delivery log panel */}
      {logEndpoint && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Delivery Log</h3>
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-sm">{logEndpoint.url}</p>
            </div>
            <button onClick={() => setLogEndpoint(null)} className="text-xs text-gray-400 hover:text-gray-600">Close</button>
          </div>
          {logLoading ? (
            <div className="flex items-center justify-center py-8"><Spinner /></div>
          ) : logError ? (
            <p className="text-sm text-red-500 py-4">{logError}</p>
          ) : deliveries.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">No deliveries recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-2 text-left font-semibold text-gray-500">Event</th>
                    <th className="pb-2 text-left font-semibold text-gray-500">Status</th>
                    <th className="pb-2 text-left font-semibold text-gray-500">HTTP</th>
                    <th className="pb-2 text-left font-semibold text-gray-500">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {deliveries.map((d) => (
                    <tr key={d.id}>
                      <td className="py-2 text-gray-700 font-mono">{d.eventType}</td>
                      <td className="py-2">
                        <Badge variant={DELIVERY_STATUS_VARIANT[d.status] ?? 'gray'}>{d.status}</Badge>
                      </td>
                      <td className="py-2 text-gray-500">{d.httpStatus ?? '—'}</td>
                      <td className="py-2 text-gray-400">{new Date(d.attemptedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Webhook Endpoint"
        description={`Are you sure you want to delete the endpoint at "${deleteTarget?.url}"? All delivery history will be removed.`}
        isLoading={isDeleting}
      />
    </div>
  );
}

// --- Toggle switch primitive (local to settings only) ---

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
}

// --- Activity Log tab (admin only) ---

function ActivityLogTab() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Global Activity Log</h3>
          <p className="mt-1 text-sm text-gray-500">
            All create, update, delete, and status change events across every entity in the system.
          </p>
        </div>
        <ActivityFeed pageSize={25} />
      </Card>
    </div>
  );
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

