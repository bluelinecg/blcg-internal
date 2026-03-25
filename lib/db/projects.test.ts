// Unit tests for lib/db/projects.ts
// Supabase serverClient is mocked — no real DB connection needed.

import {
  listProjects,
  getProjectById,
  createProject,
  deleteProject,
  getProjectDependencyCounts,
} from './projects';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

function makeChain(result: { data: unknown; count?: number | null; error: unknown }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    then: jest.fn().mockImplementation((resolve: (v: unknown) => unknown) => Promise.resolve(resolve(result))),
  };
  return chain;
}

jest.mock('@/lib/db/supabase', () => ({ serverClient: jest.fn() }));
import { serverClient } from '@/lib/db/supabase';
const mockServerClient = serverClient as jest.Mock;

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const MILESTONE_ROW = {
  id: 'ms-1',
  project_id: 'proj-1',
  title: 'Discovery',
  description: 'Initial research phase',
  status: 'completed',
  due_date: '2026-02-01',
  sort_order: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const PROJECT_ROW = {
  id: 'proj-1',
  client_id: 'client-1',
  organization_id: null,
  proposal_id: 'prop-1',
  name: 'ACME Website',
  description: 'Full redesign',
  status: 'active',
  start_date: '2026-01-01',
  end_date: '2026-06-01',
  completed_date: '2026-05-15',
  budget: 15000,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  milestones: [MILESTONE_ROW],
};

// ---------------------------------------------------------------------------
// listProjects
// ---------------------------------------------------------------------------

describe('listProjects', () => {
  it('returns mapped projects on success', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: [PROJECT_ROW], error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await listProjects();

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe('proj-1');
    expect(data![0].name).toBe('ACME Website');
    expect(data![0].targetDate).toBe('2026-06-01');
    expect(data![0].completedDate).toBe('2026-05-15');
    expect(data![0].notes).toBe('Full redesign');
    expect(data![0].milestones[0].name).toBe('Discovery');
    expect(data![0].milestones[0].order).toBe(1);
  });

  it('maps planning status and null completed_date correctly', async () => {
    const planningRow = { ...PROJECT_ROW, status: 'planning', completed_date: null };
    const db = { from: jest.fn() };
    const chain = makeChain({ data: [planningRow], error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await listProjects();

    expect(error).toBeNull();
    expect(data![0].status).toBe('planning');
    expect(data![0].completedDate).toBeUndefined();
  });

  it('returns error string on DB failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'DB error' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await listProjects();

    expect(data).toBeNull();
    expect(error).toBe('DB error');
  });
});

// ---------------------------------------------------------------------------
// getProjectById
// ---------------------------------------------------------------------------

describe('getProjectById', () => {
  it('returns the project when found', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: PROJECT_ROW, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await getProjectById('proj-1');

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.id).toBe('proj-1');
    expect(data!.clientId).toBe('client-1');
    expect(data!.proposalId).toBe('prop-1');
  });

  it('returns null data (not error) when row not found (PGRST116)', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { code: 'PGRST116', message: 'Not found' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await getProjectById('nonexistent');

    expect(data).toBeNull();
    expect(error).toBeNull();
  });

  it('returns error string on other DB failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { code: '500', message: 'Server error' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await getProjectById('proj-1');

    expect(data).toBeNull();
    expect(error).toBe('Server error');
  });
});

// ---------------------------------------------------------------------------
// createProject
// ---------------------------------------------------------------------------

describe('createProject', () => {
  it('creates a project with milestones', async () => {
    const db = { from: jest.fn() };
    const projectChain = makeChain({ data: { ...PROJECT_ROW, milestones: undefined }, error: null });
    const milestoneChain = makeChain({ data: [MILESTONE_ROW], error: null });
    db.from
      .mockReturnValueOnce(projectChain)
      .mockReturnValueOnce(milestoneChain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await createProject({
      clientId: 'client-1',
      organizationId: 'org-1',
      proposalId: 'prop-1',
      name: 'ACME Website',
      status: 'active',
      startDate: '2026-01-01T00:00:00Z',
      targetDate: '2026-06-01T00:00:00Z',
      budget: 15000,
      notes: 'Full redesign',
      milestones: [{ name: 'Discovery', status: 'completed', order: 1 }],
    });

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.milestones).toHaveLength(1);
    expect(data!.milestones[0].name).toBe('Discovery');
  });

  it('creates a project with no milestones', async () => {
    const db = { from: jest.fn() };
    const projectChain = makeChain({ data: { ...PROJECT_ROW, milestones: undefined }, error: null });
    db.from.mockReturnValueOnce(projectChain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await createProject({
      clientId: 'client-1',
      organizationId: 'org-1',
      name: 'ACME Website',
      status: 'active',
      startDate: '2026-01-01T00:00:00Z',
      budget: 15000,
      milestones: [],
    });

    expect(error).toBeNull();
    expect(data!.milestones).toHaveLength(0);
  });

  it('returns error if project insert fails', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'Insert failed' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await createProject({
      clientId: 'client-1',
      organizationId: 'org-1',
      name: 'ACME Website',
      status: 'active',
      startDate: '2026-01-01T00:00:00Z',
      budget: 15000,
      milestones: [],
    });

    expect(data).toBeNull();
    expect(error).toBe('Insert failed');
  });
});

// ---------------------------------------------------------------------------
// deleteProject
// ---------------------------------------------------------------------------

describe('deleteProject', () => {
  it('returns null error on success', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { error } = await deleteProject('proj-1');
    expect(error).toBeNull();
  });

  it('returns error string on failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'Delete failed' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { error } = await deleteProject('proj-1');
    expect(error).toBe('Delete failed');
  });
});

// ---------------------------------------------------------------------------
// getProjectDependencyCounts
// ---------------------------------------------------------------------------

describe('getProjectDependencyCounts', () => {
  it('returns count of outstanding invoices', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, count: 3, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { outstandingInvoices, error } = await getProjectDependencyCounts('proj-1');

    expect(error).toBeNull();
    expect(outstandingInvoices).toBe(3);
  });

  it('returns 0 when no outstanding invoices', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, count: 0, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { outstandingInvoices, error } = await getProjectDependencyCounts('proj-1');

    expect(error).toBeNull();
    expect(outstandingInvoices).toBe(0);
  });

  it('returns error string on DB failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, count: null, error: { message: 'Query failed' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { outstandingInvoices, error } = await getProjectDependencyCounts('proj-1');

    expect(error).toBe('Query failed');
    expect(outstandingInvoices).toBe(0);
  });
});
