// Dependency checker — enforces the CLAUDE.md rule:
// "Never allow deletion of a record that has active dependencies."
//
// Each function returns an array of human-readable strings describing
// what must be resolved before the record can be deleted.
// An empty array means deletion is permitted.

import type { Proposal } from '@/lib/types/proposals';
import type { Project } from '@/lib/types/projects';
import type { Invoice } from '@/lib/types/finances';

// --- Client dependencies ---
// Blocked if: active proposals, active/on-hold projects, or outstanding invoices.

export function getClientDeleteBlockers(
  clientId: string,
  proposals: Proposal[],
  projects: Project[],
  invoices: Invoice[],
): string[] {
  const blockers: string[] = [];

  const activeProposals = proposals.filter(
    (p) => p.clientId === clientId && (p.status === 'sent' || p.status === 'viewed' || p.status === 'accepted'),
  );
  if (activeProposals.length > 0) {
    blockers.push(
      `${activeProposals.length} active proposal${activeProposals.length > 1 ? 's' : ''} (resolve or archive them first)`,
    );
  }

  const activeProjects = projects.filter(
    (p) => p.clientId === clientId && (p.status === 'active' || p.status === 'on_hold'),
  );
  if (activeProjects.length > 0) {
    blockers.push(
      `${activeProjects.length} active project${activeProjects.length > 1 ? 's' : ''} (mark them completed or cancelled first)`,
    );
  }

  const outstandingInvoices = invoices.filter(
    (i) => i.clientId === clientId && (i.status === 'sent' || i.status === 'viewed' || i.status === 'overdue'),
  );
  if (outstandingInvoices.length > 0) {
    blockers.push(
      `${outstandingInvoices.length} outstanding invoice${outstandingInvoices.length > 1 ? 's' : ''} (mark them paid or cancelled first)`,
    );
  }

  return blockers;
}

// --- Proposal dependencies ---
// Blocked if: has a linked project.

export function getProposalDeleteBlockers(
  proposalId: string,
  projects: Project[],
): string[] {
  const linked = projects.filter((p) => p.proposalId === proposalId);
  if (linked.length > 0) {
    return [
      `Linked to project "${linked[0].name}" — remove the proposal link from the project first`,
    ];
  }
  return [];
}

// --- Project dependencies ---
// Blocked if: has outstanding invoices.

export function getProjectDeleteBlockers(
  projectId: string,
  invoices: Invoice[],
): string[] {
  const outstanding = invoices.filter(
    (i) => i.projectId === projectId && (i.status === 'sent' || i.status === 'viewed' || i.status === 'overdue'),
  );
  if (outstanding.length > 0) {
    return [
      `${outstanding.length} outstanding invoice${outstanding.length > 1 ? 's' : ''} linked to this project (resolve them first)`,
    ];
  }
  return [];
}

// --- Invoice dependencies ---
// Can only delete draft or cancelled invoices.

export function getInvoiceDeleteBlockers(status: Invoice['status']): string[] {
  if (status !== 'draft' && status !== 'cancelled') {
    return [`Invoice is "${status}" — only draft or cancelled invoices can be deleted`];
  }
  return [];
}
