// Dashboard overview page — cross-module summary.
// Displays stat cards and recent activity drawn from mock data across all modules.
// Replace mock imports with /lib/db/* queries when Supabase is connected.

import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { PageHeader } from '@/components/layout';
import { StatCard, Card, Badge } from '@/components/ui';
import { MOCK_CLIENTS } from '@/lib/mock/clients';
import { MOCK_PROPOSALS } from '@/lib/mock/proposals';
import { MOCK_PROJECTS } from '@/lib/mock/projects';
import { MOCK_TASKS } from '@/lib/mock/tasks';
import { MOCK_INVOICES } from '@/lib/mock/finances';
import { MOCK_EMAIL_THREADS } from '@/lib/mock/emails';

// --- Derived stats ---

const activeClients   = MOCK_CLIENTS.filter((c) => c.status === 'active').length;
const openProposals   = MOCK_PROPOSALS.filter((p) => p.status === 'sent' || p.status === 'viewed').length;
const activeProjects  = MOCK_PROJECTS.filter((p) => p.status === 'active').length;
const openTasks       = MOCK_TASKS.filter((t) => t.status !== 'done').length;
const overdueInvoices = MOCK_INVOICES.filter((i) => i.status === 'overdue').length;
const outstanding     = MOCK_INVOICES.filter((i) => i.status === 'sent' || i.status === 'viewed' || i.status === 'overdue')
                          .reduce((s, i) => s + i.total, 0);
const unreadEmails    = MOCK_EMAIL_THREADS.filter((t) => !t.isRead).length;

const CLIENT_MAP = Object.fromEntries(MOCK_CLIENTS.map((c) => [c.id, c]));

export function DashboardPage() {
  return (
    <PageShell>
      <PageHeader
        title="Dashboard"
        subtitle="Welcome back, Ryan. Here's what's happening across BLCG."
      />

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Active Clients"
          value={activeClients}
          sub={`${MOCK_CLIENTS.filter((c) => c.status === 'prospect').length} prospects`}
          accent="blue"
          icon={<ClientIcon />}
        />
        <StatCard
          label="Active Projects"
          value={activeProjects}
          sub={`${MOCK_PROJECTS.filter((p) => p.status === 'completed').length} completed`}
          accent="green"
          icon={<ProjectIcon />}
        />
        <StatCard
          label="Outstanding Invoices"
          value={formatCurrency(outstanding)}
          sub={overdueInvoices > 0 ? `${overdueInvoices} overdue` : 'None overdue'}
          accent={overdueInvoices > 0 ? 'red' : 'yellow'}
          icon={<InvoiceIcon />}
        />
        <StatCard
          label="Open Tasks"
          value={openTasks}
          sub={`${MOCK_TASKS.filter((t) => t.status === 'in_progress').length} in progress`}
          accent="blue"
          icon={<TaskIcon />}
        />
      </div>

      {/* Two-column content area */}
      <div className="grid grid-cols-2 gap-6">

        {/* Recent proposals */}
        <Card>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Recent Proposals</h3>
            <Link href="/proposals" className="text-xs text-brand-blue hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {MOCK_PROPOSALS.slice(0, 5).map((p) => {
              const client = CLIENT_MAP[p.clientId];
              return (
                <div key={p.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>
                    <p className="text-xs text-gray-400">{client?.name ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <ProposalStatusBadge status={p.status} />
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(p.total)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Active projects */}
        <Card>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Active Projects</h3>
            <Link href="/projects" className="text-xs text-brand-blue hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {MOCK_PROJECTS.filter((p) => p.status === 'active').map((project) => {
              const client = CLIENT_MAP[project.clientId];
              const done  = project.milestones.filter((m) => m.status === 'completed').length;
              const total = project.milestones.length;
              const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

              return (
                <div key={project.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{project.name}</p>
                      <p className="text-xs text-gray-400">{client?.name ?? '—'}</p>
                    </div>
                    <Link href={`/projects/${project.id}`} className="text-xs text-brand-blue hover:underline flex-shrink-0">
                      View →
                    </Link>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-200">
                      <div className="h-1.5 rounded-full bg-brand-blue" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-12 text-right">{done}/{total} done</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Unread emails */}
        <Card>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">
              Unread Emails
              {unreadEmails > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-brand-blue px-1.5 py-0.5 text-xs text-white font-semibold">
                  {unreadEmails}
                </span>
              )}
            </h3>
            <Link href="/emails" className="text-xs text-brand-blue hover:underline">Open inbox →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {MOCK_EMAIL_THREADS.filter((t) => !t.isRead).length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-gray-400">All caught up!</p>
              </div>
            ) : (
              MOCK_EMAIL_THREADS.filter((t) => !t.isRead).map((thread) => (
                <div key={thread.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{thread.subject}</p>
                      <p className="text-xs text-gray-400 truncate">{thread.preview}</p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatRelativeDate(thread.lastMessageAt)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-brand-steel">→ {thread.account}</p>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Tasks needing attention */}
        <Card>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Tasks In Progress</h3>
            <Link href="/tasks" className="text-xs text-brand-blue hover:underline">Open board →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {MOCK_TASKS.filter((t) => t.status === 'in_progress' || t.status === 'in_review').map((task) => (
              <div key={task.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0 flex-1 pr-4">
                  <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                  {task.assignee && <p className="text-xs text-gray-400">{task.assignee}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={PRIORITY_BADGE[task.priority].variant}>
                    {PRIORITY_BADGE[task.priority].label}
                  </Badge>
                  {task.dueDate && (
                    <span className="text-xs text-gray-400">{formatShortDate(task.dueDate)}</span>
                  )}
                </div>
              </div>
            ))}
            {MOCK_TASKS.filter((t) => t.status === 'in_progress' || t.status === 'in_review').length === 0 && (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-gray-400">No tasks in progress.</p>
              </div>
            )}
          </div>
        </Card>

      </div>
    </PageShell>
  );
}

export default DashboardPage;

// --- Inline badge for proposals (avoids circular import) ---

type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';

const PROPOSAL_STATUS_BADGE: Record<ProposalStatus, { variant: 'green' | 'blue' | 'yellow' | 'red' | 'gray'; label: string }> = {
  draft:    { variant: 'gray',   label: 'Draft' },
  sent:     { variant: 'blue',   label: 'Sent' },
  viewed:   { variant: 'yellow', label: 'Viewed' },
  accepted: { variant: 'green',  label: 'Accepted' },
  rejected: { variant: 'red',    label: 'Rejected' },
  expired:  { variant: 'gray',   label: 'Expired' },
};

function ProposalStatusBadge({ status }: { status: ProposalStatus }) {
  const cfg = PROPOSAL_STATUS_BADGE[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

// --- Priority badge map ---

const PRIORITY_BADGE: Record<string, { variant: 'red' | 'yellow' | 'blue' | 'gray'; label: string }> = {
  urgent: { variant: 'red',    label: 'Urgent' },
  high:   { variant: 'yellow', label: 'High' },
  medium: { variant: 'blue',   label: 'Medium' },
  low:    { variant: 'gray',   label: 'Low' },
};

// --- SVG icons ---

function ClientIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
    </svg>
  );
}

function ProjectIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function InvoiceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function TaskIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

// --- Helpers ---

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
