'use client';

// Time Tracking page — log and review billable/non-billable hours.
// Week navigation (Mon–Sun), KPI summary cards, and a filterable entry table.
// Entries are created via the Log Time modal; edit/delete per row.

import { useState, useEffect, useCallback } from 'react';
import { PageShell, PageHeader } from '@/components/layout';
import { StatCard, Card, Badge, Button, Input, Select, ConfirmDialog, Spinner } from '@/components/ui';
import type { TimeEntry, TimeEntrySummary } from '@/lib/types/time-tracking';
import type { Project } from '@/lib/types/projects';

// ---------------------------------------------------------------------------
// Week helpers
// ---------------------------------------------------------------------------

function getWeekBounds(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  const start = new Date(d);
  start.setDate(d.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0] ?? '';
}

function formatDate(str: string): string {
  const d = new Date(`${str}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatWeekLabel(start: Date, end: Date): string {
  const s = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const e = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${s} – ${e}`;
}

// ---------------------------------------------------------------------------
// Log Time Modal
// ---------------------------------------------------------------------------

interface EntryFormState {
  date:        string;
  projectId:   string;
  hours:       string;
  description: string;
  isBillable:  boolean;
}

const EMPTY_FORM: EntryFormState = {
  date:        toDateStr(new Date()),
  projectId:   '',
  hours:       '',
  description: '',
  isBillable:  true,
};

interface EntryModalProps {
  mode:       'create' | 'edit';
  initial:    EntryFormState;
  projects:   Project[];
  saving:     boolean;
  onSave:     (form: EntryFormState) => void;
  onClose:    () => void;
}

function EntryModal({ mode, initial, projects, saving, onSave, onClose }: EntryModalProps) {
  const [form, setForm] = useState<EntryFormState>(initial);

  function set<K extends keyof EntryFormState>(key: K, value: EntryFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const isValid =
    form.date.length > 0 &&
    form.description.trim().length > 0 &&
    parseFloat(form.hours) > 0 &&
    parseFloat(form.hours) <= 24;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">
          {mode === 'create' ? 'Log Time' : 'Edit Time Entry'}
        </h2>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project (optional)</label>
            <Select
              value={form.projectId}
              onChange={(e) => set('projectId', e.target.value)}
              options={[
                { value: '', label: '— No project —' },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
            <Input
              type="number"
              min="0.25"
              max="24"
              step="0.25"
              value={form.hours}
              placeholder="e.g. 2.5"
              onChange={(e) => set('hours', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
              rows={3}
              value={form.description}
              placeholder="What did you work on?"
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="isBillable"
              type="checkbox"
              checked={form.isBillable}
              onChange={(e) => set('isBillable', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-blue"
            />
            <label htmlFor="isBillable" className="text-sm text-gray-700">Billable</label>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!isValid || saving}>
            {saving ? 'Saving…' : mode === 'create' ? 'Log Time' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TimeTrackingPage() {
  const [weekAnchor, setWeekAnchor]   = useState(() => new Date());
  const { start, end }                = getWeekBounds(weekAnchor);
  const startStr                      = toDateStr(start);
  const endStr                        = toDateStr(end);

  const [entries,   setEntries]   = useState<TimeEntry[]>([]);
  const [summary,   setSummary]   = useState<TimeEntrySummary | null>(null);
  const [projects,  setProjects]  = useState<Project[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const [projectFilter, setProjectFilter] = useState('');

  const [showModal,   setShowModal]   = useState(false);
  const [editEntry,   setEditEntry]   = useState<TimeEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<TimeEntry | null>(null);
  const [saving,      setSaving]      = useState(false);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ startDate: startStr, endDate: endStr, pageSize: '200' });
      const [entriesRes, summaryRes] = await Promise.all([
        fetch(`/api/time-entries?${params}`),
        fetch(`/api/time-entries/summary?startDate=${startStr}&endDate=${endStr}`),
      ]);

      if (!entriesRes.ok || !summaryRes.ok) {
        setError('Failed to load time entries');
        return;
      }

      const entriesJson = await entriesRes.json() as { data: TimeEntry[] | null; error: string | null };
      const summaryJson = await summaryRes.json() as { data: TimeEntrySummary | null; error: string | null };

      if (entriesJson.error) { setError(entriesJson.error); return; }
      if (summaryJson.error) { setError(summaryJson.error); return; }

      setEntries(entriesJson.data ?? []);
      setSummary(summaryJson.data);
    } catch {
      setError('Failed to load time entries');
    } finally {
      setLoading(false);
    }
  }, [startStr, endStr]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    fetch('/api/projects?pageSize=200')
      .then((r) => r.json())
      .then((json: { data: Project[] | null }) => setProjects(json.data ?? []))
      .catch(() => {});
  }, []);

  // ---------------------------------------------------------------------------
  // CRUD handlers
  // ---------------------------------------------------------------------------

  async function handleSave(form: EntryFormState) {
    setSaving(true);
    try {
      const body = {
        date:        form.date,
        hours:       parseFloat(form.hours),
        description: form.description.trim(),
        isBillable:  form.isBillable,
        projectId:   form.projectId || undefined,
      };

      const url    = editEntry ? `/api/time-entries/${editEntry.id}` : '/api/time-entries';
      const method = editEntry ? 'PATCH' : 'POST';

      const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json() as { data: TimeEntry | null; error: string | null };

      if (!res.ok || json.error) {
        alert(json.error ?? 'Failed to save entry');
        return;
      }

      setShowModal(false);
      setEditEntry(null);
      void fetchEntries();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry: TimeEntry) {
    const res = await fetch(`/api/time-entries/${entry.id}`, { method: 'DELETE' });
    if (!res.ok) {
      alert('Failed to delete entry');
      return;
    }
    setDeleteEntry(null);
    void fetchEntries();
  }

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  const displayed = projectFilter
    ? entries.filter((e) => e.projectId === projectFilter)
    : entries;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <PageShell>
      <PageHeader
        title="Time Tracking"
        actions={
          <Button onClick={() => { setEditEntry(null); setShowModal(true); }}>
            Log Time
          </Button>
        }
      />

      {/* Week navigation */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="secondary" onClick={() => setWeekAnchor((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })}>
          ← Previous
        </Button>
        <span className="text-sm font-medium text-gray-700 min-w-48 text-center">
          {formatWeekLabel(start, end)}
        </span>
        <Button variant="secondary" onClick={() => setWeekAnchor((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })}>
          Next →
        </Button>
        <Button variant="secondary" onClick={() => setWeekAnchor(new Date())}>
          This Week
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Total Hours"
          value={loading ? '—' : (summary?.totalHours ?? 0).toFixed(1)}
          subLabel="This week"
        />
        <StatCard
          label="Billable Hours"
          value={loading ? '—' : (summary?.billableHours ?? 0).toFixed(1)}
          subLabel="This week"
        />
        <StatCard
          label="Non-Billable Hours"
          value={loading ? '—' : (summary?.nonBillableHours ?? 0).toFixed(1)}
          subLabel="This week"
        />
      </div>

      {/* Filter bar */}
      <div className="flex gap-3 mb-4">
        <Select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          options={[
            { value: '', label: 'All Projects' },
            ...projects.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
      </div>

      {/* Entry table */}
      <Card>
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Spinner />
          </div>
        ) : error ? (
          <div className="py-16 text-center text-red-600 text-sm">{error}</div>
        ) : displayed.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">
            No time entries for this week. Click <strong>Log Time</strong> to add one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Project</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Description</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Hours</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDate(entry.date)}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {entry.projectId ? (projectMap[entry.projectId] ?? '—') : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-900 max-w-xs truncate">{entry.description}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-900">{entry.hours.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={entry.isBillable ? 'green' : 'gray'}>
                        {entry.isBillable ? 'Billable' : 'Non-Billable'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditEntry(entry);
                            setShowModal(true);
                          }}
                          className="text-xs text-brand-blue hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteEntry(entry)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={3} className="px-4 py-3 text-sm font-medium text-gray-700">Total</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">
                    {displayed.reduce((sum, e) => sum + e.hours, 0).toFixed(2)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Log Time / Edit modal */}
      {showModal && (
        <EntryModal
          mode={editEntry ? 'edit' : 'create'}
          initial={
            editEntry
              ? {
                  date:        editEntry.date,
                  projectId:   editEntry.projectId ?? '',
                  hours:       String(editEntry.hours),
                  description: editEntry.description,
                  isBillable:  editEntry.isBillable,
                }
              : EMPTY_FORM
          }
          projects={projects}
          saving={saving}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditEntry(null); }}
        />
      )}

      {/* Delete confirmation */}
      {deleteEntry && (
        <ConfirmDialog
          title="Delete Time Entry"
          message={`Delete "${deleteEntry.description}" (${deleteEntry.hours}h)? This cannot be undone.`}
          onConfirm={() => void handleDelete(deleteEntry)}
          onCancel={() => setDeleteEntry(null)}
        />
      )}
    </PageShell>
  );
}
