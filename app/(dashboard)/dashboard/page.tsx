// Dashboard overview page — cross-module summary.
// Server component: queries all Supabase modules in parallel at render time.
// No client-side fetching needed — data is fresh on every navigation.

import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { PageHeader } from '@/components/layout';
import { StatCard, Card, Badge } from '@/components/ui';
import { listClients } from '@/lib/db/clients';
import { listProposals } from '@/lib/db/proposals';
import { listProjects } from '@/lib/db/projects';
import { listTasks } from '@/lib/db/tasks';
import { listInvoices } from '@/lib/db/finances';

export async function DashboardPage() {
  // Fetch all modules in parallel
  const [
    { data: clients },
    { data: proposals },
    { data: projects },
    { data: tasks },
    { data: invoices },
  ] = await Promise.all([
    listClients(),
    listProposals(),
    listProjects(),
    listTasks(),
    listInvoices(),
  ]);

  // --- Derived stats ---
  const activeClients    = (clients ?? []).filter((c) => c.status === 'active').length;
  const prospectClients  = (clients ?? []).filter((c) => c.status === 'prospect').length;
  const activeProjects   = (projects ?? []).filter((p) => p.status === 'active').length;
  const completedProjects = (projects ?? []).filter((p) => p.status === 'completed').length;
  const openTasks        = (tasks ?? []).filter((t) => t.status !== 'done').length;
  const inProgressTasks  = (tasks ?? []).filter((t) => t.status === 'in_progress').length;
  const overdueInvoices  = (invoices ?? []).filter((i) => i.status === 'overdue').length;
  const outstanding      = (invoices ?? [])
    .filter((i) => i.status === 'sent' || i.status === 'viewed' || i.status === 'overdue')
    .reduce((s, i) => s + i.total, 0);

  const recentProposals = (proposals ?? [])
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);
  const activeProjectList = (projects ?? []).filter((p) => p.status === 'active');
  const inProgressTaskList = (tasks ?? [])
    .filter((t) => t.status === 'in_progress' || t.status === 'in_review')
    .slice(0, 5);

  return (
    <PageShell>
      <PageHeader
        title="Dashboard"
        subtitle="Welcome back, Ryan. Here's what's happening across BLCG."
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Active Clients"
          value={activeClients}
          sub={`${prospectClients} prospect${prospectClients !== 1 ? 's' : ''}`}
          accent="blue"
          icon={<ClientIcon />}
        />
        <StatCard
          label="Active Projects"
          value={activeProjects}
          sub={`${completedProjects} completed`}
          accent="green"
          icon={<ProjectIcon />}
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(outstanding)}
          sub={overdueInvoices > 0 ? `${overdueInvoices} overdue` : 'None overdue'}
          accent={overdueInvoices > 0 ? 'red' : 'yellow'}
          icon={<InvoiceIcon />}
        />
        <StatCard
          label="Open Tasks"
          value={openTasks}
          sub={`${inProgressTasks} in progress`}
          accent="blue"
          icon={<TaskIcon />}
        />
      </div>

      {/* Two-column content area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Recent proposals */}
        <Card>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Recent Proposals</h3>
            <Link href="/proposals" className="text-xs text-brand-blue hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentProposals.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-gray-400">No proposals yet.</p>
              </div>
            ) : (
              recentProposals.map((p) => {
                return (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0 flex-1 pr-4">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>
                      <p className="text-xs text-gray-400">{p.organization?.name ?? '—'}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <ProposalStatusBadge status={p.status} />
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(p.totalValue)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Active projects */}
        <Card>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Active Projects</h3>
            <Link href="/projects" className="text-xs text-brand-blue hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {activeProjectList.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-gray-400">No active projects.</p>
              </div>
            ) : (
              activeProjectList.map((project) => {
                const done  = project.milestones.filter((m) => m.status === 'completed').length;
                const total = project.milestones.length;
                const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <div key={project.id} className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{project.name}</p>
                        <p className="text-xs text-gray-400">{project.organization?.name ?? '—'}</p>
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
              })
            )}
          </div>
        </Card>

        {/* Inbox shortcut */}
        <Card>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Emails</h3>
            <Link href="/emails" className="text-xs text-brand-blue hover:underline">Open inbox →</Link>
          </div>
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue/10">
              <EmailIcon />
            </div>
            <p className="text-sm text-gray-500 text-center">
              Unified inbox across<br />all 3 BLCG accounts.
            </p>
            <Link
              href="/emails"
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-blue/90 transition-colors"
            >
              Go to inbox
            </Link>
          </div>
        </Card>

        {/* Tasks in progress */}
        <Card>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Tasks In Progress</h3>
            <Link href="/tasks" className="text-xs text-brand-blue hover:underline">Open board →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {inProgressTaskList.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-gray-400">No tasks in progress.</p>
              </div>
            ) : (
              inProgressTaskList.map((task) => (
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
              ))
            )}
          </div>
        </Card>

      </div>
    </PageShell>
  );
}

export default DashboardPage;

// --- Inline badge helpers ---

type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';

const PROPOSAL_STATUS_BADGE: Record<ProposalStatus, { variant: 'green' | 'blue' | 'yellow' | 'red' | 'gray'; label: string }> = {
  draft:    { variant: 'gray',   label: 'Draft' },
  sent:     { variant: 'blue',   label: 'Sent' },
  viewed:   { variant: 'yellow', label: 'Viewed' },
  accepted: { variant: 'green',  label: 'Accepted' },
  declined: { variant: 'red',    label: 'Declined' },
  expired:  { variant: 'gray',   label: 'Expired' },
};

function ProposalStatusBadge({ status }: { status: ProposalStatus }) {
  const cfg = PROPOSAL_STATUS_BADGE[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

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

function EmailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-brand-blue">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

// --- Helpers ---

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
