import {
  getClientDeleteBlockers,
  getProposalDeleteBlockers,
  getProjectDeleteBlockers,
  getInvoiceDeleteBlockers,
  getOrganizationDeleteBlockers,
} from './dependencies';
import {
  createMockProposal,
  createMockProject,
  createMockInvoice,
  createMockContact,
} from '@/tests/helpers/factories';
import type { InvoiceStatus } from '@/lib/types/finances';

// ---------------------------------------------------------------------------
// getClientDeleteBlockers
// ---------------------------------------------------------------------------

describe('getClientDeleteBlockers', () => {
  const clientId = 'client-1';
  const otherId = 'client-99';

  it('returns empty array when there are no related records', () => {
    expect(getClientDeleteBlockers(clientId, [], [], [])).toEqual([]);
  });

  it('returns empty array when all related records belong to a different client', () => {
    const proposal = createMockProposal({ clientId: otherId, status: 'sent' });
    const project = createMockProject({ clientId: otherId, status: 'active' });
    const invoice = createMockInvoice({ clientId: otherId, status: 'sent' });
    expect(getClientDeleteBlockers(clientId, [proposal], [project], [invoice])).toEqual([]);
  });

  // --- Proposals ---

  it('blocks deletion when client has a sent proposal', () => {
    const proposal = createMockProposal({ clientId, status: 'sent' });
    const blockers = getClientDeleteBlockers(clientId, [proposal], [], []);
    expect(blockers).toHaveLength(1);
    expect(blockers[0]).toMatch(/1 active proposal/i);
    expect(blockers[0]).toMatch(/resolve or archive/i);
  });

  it('blocks deletion when client has a viewed proposal', () => {
    const proposal = createMockProposal({ clientId, status: 'viewed' });
    expect(getClientDeleteBlockers(clientId, [proposal], [], [])).toHaveLength(1);
  });

  it('blocks deletion when client has an accepted proposal', () => {
    const proposal = createMockProposal({ clientId, status: 'accepted' });
    expect(getClientDeleteBlockers(clientId, [proposal], [], [])).toHaveLength(1);
  });

  it('uses plural label when there are multiple active proposals', () => {
    const p1 = createMockProposal({ id: 'p-1', clientId, status: 'sent' });
    const p2 = createMockProposal({ id: 'p-2', clientId, status: 'viewed' });
    const [msg] = getClientDeleteBlockers(clientId, [p1, p2], [], []);
    expect(msg).toMatch(/2 active proposals/i);
  });

  it('does not block for draft proposal', () => {
    const proposal = createMockProposal({ clientId, status: 'draft' });
    expect(getClientDeleteBlockers(clientId, [proposal], [], [])).toEqual([]);
  });

  it('does not block for declined proposal', () => {
    const proposal = createMockProposal({ clientId, status: 'declined' });
    expect(getClientDeleteBlockers(clientId, [proposal], [], [])).toEqual([]);
  });

  it('does not block for expired proposal', () => {
    const proposal = createMockProposal({ clientId, status: 'expired' });
    expect(getClientDeleteBlockers(clientId, [proposal], [], [])).toEqual([]);
  });

  // --- Projects ---

  it('blocks deletion when client has an active project', () => {
    const project = createMockProject({ clientId, status: 'active' });
    const blockers = getClientDeleteBlockers(clientId, [], [project], []);
    expect(blockers).toHaveLength(1);
    expect(blockers[0]).toMatch(/1 active project/i);
    expect(blockers[0]).toMatch(/completed or cancelled/i);
  });

  it('blocks deletion when client has an on_hold project', () => {
    const project = createMockProject({ clientId, status: 'on_hold' });
    expect(getClientDeleteBlockers(clientId, [], [project], [])).toHaveLength(1);
  });

  it('uses plural label when there are multiple active projects', () => {
    const p1 = createMockProject({ id: 'proj-1', clientId, status: 'active' });
    const p2 = createMockProject({ id: 'proj-2', clientId, status: 'on_hold' });
    const [msg] = getClientDeleteBlockers(clientId, [], [p1, p2], []);
    expect(msg).toMatch(/2 active projects/i);
  });

  it('does not block for completed project', () => {
    const project = createMockProject({ clientId, status: 'completed' });
    expect(getClientDeleteBlockers(clientId, [], [project], [])).toEqual([]);
  });

  it('does not block for cancelled project', () => {
    const project = createMockProject({ clientId, status: 'cancelled' });
    expect(getClientDeleteBlockers(clientId, [], [project], [])).toEqual([]);
  });

  // --- Invoices ---

  it('blocks deletion when client has a sent invoice', () => {
    const invoice = createMockInvoice({ clientId, status: 'sent' });
    const blockers = getClientDeleteBlockers(clientId, [], [], [invoice]);
    expect(blockers).toHaveLength(1);
    expect(blockers[0]).toMatch(/1 outstanding invoice/i);
    expect(blockers[0]).toMatch(/paid or cancelled/i);
  });

  it('blocks deletion when client has a viewed invoice', () => {
    const invoice = createMockInvoice({ clientId, status: 'viewed' });
    expect(getClientDeleteBlockers(clientId, [], [], [invoice])).toHaveLength(1);
  });

  it('blocks deletion when client has an overdue invoice', () => {
    const invoice = createMockInvoice({ clientId, status: 'overdue' });
    expect(getClientDeleteBlockers(clientId, [], [], [invoice])).toHaveLength(1);
  });

  it('uses plural label when there are multiple outstanding invoices', () => {
    const i1 = createMockInvoice({ id: 'inv-1', clientId, status: 'sent' });
    const i2 = createMockInvoice({ id: 'inv-2', clientId, status: 'overdue' });
    const [msg] = getClientDeleteBlockers(clientId, [], [], [i1, i2]);
    expect(msg).toMatch(/2 outstanding invoices/i);
  });

  it('does not block for draft invoice', () => {
    const invoice = createMockInvoice({ clientId, status: 'draft' });
    expect(getClientDeleteBlockers(clientId, [], [], [invoice])).toEqual([]);
  });

  it('does not block for paid invoice', () => {
    const invoice = createMockInvoice({ clientId, status: 'paid' });
    expect(getClientDeleteBlockers(clientId, [], [], [invoice])).toEqual([]);
  });

  it('does not block for cancelled invoice', () => {
    const invoice = createMockInvoice({ clientId, status: 'cancelled' });
    expect(getClientDeleteBlockers(clientId, [], [], [invoice])).toEqual([]);
  });

  // --- Multiple simultaneous blockers ---

  it('returns multiple blockers when proposals, projects, and invoices all block', () => {
    const proposal = createMockProposal({ clientId, status: 'sent' });
    const project = createMockProject({ clientId, status: 'active' });
    const invoice = createMockInvoice({ clientId, status: 'overdue' });
    const blockers = getClientDeleteBlockers(clientId, [proposal], [project], [invoice]);
    expect(blockers).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// getProposalDeleteBlockers
// ---------------------------------------------------------------------------

describe('getProposalDeleteBlockers', () => {
  const proposalId = 'proposal-1';

  it('returns empty array when no projects are linked', () => {
    expect(getProposalDeleteBlockers(proposalId, [])).toEqual([]);
  });

  it('returns empty array when linked project uses a different proposalId', () => {
    const project = createMockProject({ proposalId: 'proposal-99' });
    expect(getProposalDeleteBlockers(proposalId, [project])).toEqual([]);
  });

  it('blocks deletion when a project is linked to the proposal', () => {
    const project = createMockProject({ proposalId, name: 'My Project' });
    const blockers = getProposalDeleteBlockers(proposalId, [project]);
    expect(blockers).toHaveLength(1);
    expect(blockers[0]).toMatch(/My Project/);
    expect(blockers[0]).toMatch(/remove the proposal link/i);
  });

  it('includes the linked project name in the blocker message', () => {
    const project = createMockProject({ proposalId, name: 'Branding Overhaul' });
    const [msg] = getProposalDeleteBlockers(proposalId, [project]);
    expect(msg).toContain('Branding Overhaul');
  });
});

// ---------------------------------------------------------------------------
// getProjectDeleteBlockers
// ---------------------------------------------------------------------------

describe('getProjectDeleteBlockers', () => {
  const projectId = 'project-1';
  const otherId = 'project-99';

  it('returns empty array when there are no invoices', () => {
    expect(getProjectDeleteBlockers(projectId, [])).toEqual([]);
  });

  it('returns empty array when invoices belong to a different project', () => {
    const invoice = createMockInvoice({ projectId: otherId, status: 'sent' });
    expect(getProjectDeleteBlockers(projectId, [invoice])).toEqual([]);
  });

  it('blocks deletion when project has a sent invoice', () => {
    const invoice = createMockInvoice({ projectId, status: 'sent' });
    const blockers = getProjectDeleteBlockers(projectId, [invoice]);
    expect(blockers).toHaveLength(1);
    expect(blockers[0]).toMatch(/1 outstanding invoice/i);
    expect(blockers[0]).toMatch(/resolve them first/i);
  });

  it('blocks deletion when project has a viewed invoice', () => {
    const invoice = createMockInvoice({ projectId, status: 'viewed' });
    expect(getProjectDeleteBlockers(projectId, [invoice])).toHaveLength(1);
  });

  it('blocks deletion when project has an overdue invoice', () => {
    const invoice = createMockInvoice({ projectId, status: 'overdue' });
    expect(getProjectDeleteBlockers(projectId, [invoice])).toHaveLength(1);
  });

  it('uses plural label for multiple outstanding invoices', () => {
    const i1 = createMockInvoice({ id: 'inv-1', projectId, status: 'sent' });
    const i2 = createMockInvoice({ id: 'inv-2', projectId, status: 'overdue' });
    const [msg] = getProjectDeleteBlockers(projectId, [i1, i2]);
    expect(msg).toMatch(/2 outstanding invoices/i);
  });

  it('does not block for a draft invoice', () => {
    const invoice = createMockInvoice({ projectId, status: 'draft' });
    expect(getProjectDeleteBlockers(projectId, [invoice])).toEqual([]);
  });

  it('does not block for a paid invoice', () => {
    const invoice = createMockInvoice({ projectId, status: 'paid' });
    expect(getProjectDeleteBlockers(projectId, [invoice])).toEqual([]);
  });

  it('does not block for a cancelled invoice', () => {
    const invoice = createMockInvoice({ projectId, status: 'cancelled' });
    expect(getProjectDeleteBlockers(projectId, [invoice])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getInvoiceDeleteBlockers
// ---------------------------------------------------------------------------

describe('getInvoiceDeleteBlockers', () => {
  const deletableStatuses: InvoiceStatus[] = ['draft', 'cancelled'];
  const blockedStatuses: InvoiceStatus[] = ['sent', 'viewed', 'paid', 'overdue'];

  it.each(deletableStatuses)('allows deletion when status is "%s"', (status) => {
    expect(getInvoiceDeleteBlockers(status)).toEqual([]);
  });

  it.each(blockedStatuses)('blocks deletion when status is "%s"', (status) => {
    const blockers = getInvoiceDeleteBlockers(status);
    expect(blockers).toHaveLength(1);
    expect(blockers[0]).toMatch(new RegExp(status, 'i'));
    expect(blockers[0]).toMatch(/only draft or cancelled/i);
  });
});

// ---------------------------------------------------------------------------
// getOrganizationDeleteBlockers
// ---------------------------------------------------------------------------

describe('getOrganizationDeleteBlockers', () => {
  it('returns empty array when organization has no contacts', () => {
    expect(getOrganizationDeleteBlockers([])).toEqual([]);
  });

  it('blocks deletion when organization has one contact', () => {
    const contact = createMockContact({ organizationId: 'org-1' });
    const blockers = getOrganizationDeleteBlockers([contact]);
    expect(blockers).toHaveLength(1);
    expect(blockers[0]).toMatch(/1 contact/i);
    expect(blockers[0]).toMatch(/reassign or delete/i);
  });

  it('uses plural label when organization has multiple contacts', () => {
    const c1 = createMockContact({ id: 'contact-1', organizationId: 'org-1' });
    const c2 = createMockContact({ id: 'contact-2', organizationId: 'org-1' });
    const [msg] = getOrganizationDeleteBlockers([c1, c2]);
    expect(msg).toMatch(/2 contacts/i);
  });
});
