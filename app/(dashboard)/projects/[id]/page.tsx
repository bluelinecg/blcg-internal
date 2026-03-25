// Project detail page with milestone tracker.
// Shows project overview, milestone progress, and linked client/proposal.
// Server component — params are awaited per Next.js 16 async params convention.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PageShell } from '@/components/layout';
import { PageHeader } from '@/components/layout';
import { Badge, Card, MilestoneTracker } from '@/components/ui';
import { getProjectById } from '@/lib/db/projects';
import { getProposalById } from '@/lib/db/proposals';
import type { ProjectStatus, MilestoneStatus } from '@/lib/types/projects';

const STATUS_BADGE: Record<ProjectStatus, { variant: 'green' | 'blue' | 'yellow' | 'red' | 'gray'; label: string }> = {
  planning:  { variant: 'blue',   label: 'Planning' },
  active:    { variant: 'green',  label: 'Active' },
  on_hold:   { variant: 'yellow', label: 'On Hold' },
  completed: { variant: 'gray',   label: 'Completed' },
  cancelled: { variant: 'red',    label: 'Cancelled' },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { data: project, error } = await getProjectById(id);

  if (error) throw new Error(error);
  if (!project) notFound();

  const proposalResult = project.proposalId
    ? await getProposalById(project.proposalId)
    : { data: undefined, error: null };
  const organization = project.organization;
  const proposal = proposalResult.data;
  const statusCfg = STATUS_BADGE[project.status];
  const completedCount = project.milestones.filter((m) => m.status === 'completed').length;
  const totalCount = project.milestones.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <PageShell>
      <PageHeader
        title={project.name}
        subtitle={organization?.name}
        actions={
          <div className="flex items-center gap-3">
            <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
          </div>
        }
      />

      {/* Overview cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border border-gray-200 bg-white px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Budget</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(project.budget)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Progress</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{pct}%</p>
          <p className="text-xs text-gray-400">{completedCount} of {totalCount} milestones</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Start Date</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatDate(project.startDate)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Target Date</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {project.targetDate ? formatDate(project.targetDate) : '—'}
          </p>
          {project.completedDate && (
            <p className="text-xs text-green-600">Completed {formatDate(project.completedDate)}</p>
          )}
        </div>
      </div>

      {/* Milestone tracker */}
      <Card className="p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-6">Milestone Progress</h3>
        <MilestoneTracker milestones={project.milestones} />
      </Card>

      {/* Milestone detail table */}
      <Card className="mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Milestones</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">#</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Milestone</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Due</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Completed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {[...project.milestones]
              .sort((a, b) => a.order - b.order)
              .map((ms) => (
                <tr key={ms.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-400">{ms.order}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{ms.name}</p>
                    {ms.description && <p className="text-xs text-gray-400 mt-0.5">{ms.description}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <MilestoneStatusBadge status={ms.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {ms.dueDate ? formatDate(ms.dueDate) : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {ms.completedDate ? formatDate(ms.completedDate) : '—'}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </Card>

      {/* Linked records */}
      <div className="grid grid-cols-2 gap-4">
        {organization && (
          <Card className="p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Organization</h3>
            <p className="font-medium text-gray-900">{organization.name}</p>
          </Card>
        )}
        {proposal && (
          <Card className="p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Linked Proposal</h3>
            <p className="font-medium text-gray-900">{proposal.title}</p>
            <p className="text-sm text-gray-500">{formatCurrency(proposal.totalValue)}</p>
            <Link href="/proposals" className="mt-2 inline-block text-xs text-brand-blue hover:underline">
              View proposals →
            </Link>
          </Card>
        )}
        {project.notes && (
          <Card className="p-5 col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Notes</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{project.notes}</p>
          </Card>
        )}
      </div>
    </PageShell>
  );
}

// --- Sub-components ---

function MilestoneStatusBadge({ status }: { status: MilestoneStatus }) {
  const config: Record<MilestoneStatus, { variant: 'green' | 'blue' | 'yellow' | 'red' | 'gray'; label: string }> = {
    completed:   { variant: 'green',  label: 'Completed' },
    in_progress: { variant: 'blue',   label: 'In Progress' },
    blocked:     { variant: 'red',    label: 'Blocked' },
    pending:     { variant: 'gray',   label: 'Pending' },
  };
  const cfg = config[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

// --- Helpers ---

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
