// Unit tests for lib/db/proposals.ts
// Supabase serverClient is mocked — no real DB connection needed.

import {
  listProposals,
  getProposalById,
  createProposal,
  deleteProposal,
  getProposalDependencyCounts,
  getNextProposalNumber,
} from './proposals';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

function makeChain(result: { data: unknown; count?: number | null; error: unknown }) {
  const chain = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
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

const LINE_ITEM_ROW = {
  id: 'li-1',
  proposal_id: 'prop-1',
  description: 'Web Design',
  quantity: 1,
  unit_price: 5000,
  total: 5000,
  sort_order: 0,
};

const PROPOSAL_ROW = {
  id: 'prop-1',
  client_id: 'client-1',
  proposal_number: 'BL-2026-001',
  title: 'Website Redesign',
  status: 'draft',
  situation: null,
  total_value: 5000,
  deposit_amount: null,
  agreement_signed_at: null,
  agreement_start_date: null,
  agreement_estimated_end_date: null,
  governing_state: null,
  notes: null,
  sent_at: null,
  expires_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  proposal_line_items: [LINE_ITEM_ROW],
};

const PROPOSAL = {
  id: 'prop-1',
  clientId: 'client-1',
  proposalNumber: 'BL-2026-001',
  title: 'Website Redesign',
  status: 'draft',
  totalValue: 5000,
  lineItems: [{ id: 'li-1', proposalId: 'prop-1', description: 'Web Design', quantity: 1, unitPrice: 5000, total: 5000, sortOrder: 0 }],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// listProposals
// ---------------------------------------------------------------------------

describe('listProposals', () => {
  it('returns mapped proposals on success', async () => {
    const chain = makeChain({ data: [PROPOSAL_ROW], error: null });
    mockServerClient.mockReturnValue(chain);

    const { data, error } = await listProposals();

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject(PROPOSAL);
  });

  it('returns error string when Supabase errors', async () => {
    const chain = makeChain({ data: null, error: { message: 'db error' } });
    mockServerClient.mockReturnValue(chain);

    const { data, error } = await listProposals();

    expect(data).toBeNull();
    expect(error).toBe('db error');
  });
});

// ---------------------------------------------------------------------------
// getProposalById
// ---------------------------------------------------------------------------

describe('getProposalById', () => {
  it('returns mapped proposal when found', async () => {
    const chain = makeChain({ data: PROPOSAL_ROW, error: null });
    mockServerClient.mockReturnValue(chain);

    const { data, error } = await getProposalById('prop-1');

    expect(error).toBeNull();
    expect(data).toMatchObject(PROPOSAL);
  });

  it('returns null data (not error) when row not found', async () => {
    const chain = makeChain({ data: null, error: { code: 'PGRST116', message: 'not found' } });
    mockServerClient.mockReturnValue(chain);

    const { data, error } = await getProposalById('missing');

    expect(data).toBeNull();
    expect(error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createProposal
// ---------------------------------------------------------------------------

describe('createProposal', () => {
  const INPUT = {
    clientId: 'client-1',
    proposalNumber: 'BL-2026-001',
    title: 'Website Redesign',
    status: 'draft' as const,
    totalValue: 5000,
    lineItems: [{ description: 'Web Design', quantity: 1, unitPrice: 5000, total: 5000 }],
  };

  // createProposal calls serverClient() once, then uses .from() twice on the
  // same client instance — once for proposals, once for proposal_line_items.
  // We use mockReturnValueOnce on .from() to route each call to the right chain.

  function makeQueryChain(result: { data: unknown; error: unknown }) {
    return {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue(result),
      then: jest.fn().mockImplementation((res: (v: unknown) => unknown) => Promise.resolve(res(result))),
    };
  }

  it('returns the created proposal on success', async () => {
    const proposalChain = makeQueryChain({ data: { ...PROPOSAL_ROW, proposal_line_items: undefined }, error: null });
    const lineItemChain = makeQueryChain({ data: [LINE_ITEM_ROW], error: null });
    const db = { from: jest.fn().mockReturnValueOnce(proposalChain).mockReturnValueOnce(lineItemChain) };
    mockServerClient.mockReturnValue(db);

    const { data, error } = await createProposal(INPUT);

    expect(error).toBeNull();
    expect(data?.title).toBe('Website Redesign');
    expect(data?.lineItems).toHaveLength(1);
  });

  it('returns error when proposal insert fails', async () => {
    const proposalChain = makeQueryChain({ data: null, error: { message: 'insert failed' } });
    const db = { from: jest.fn().mockReturnValue(proposalChain) };
    mockServerClient.mockReturnValue(db);

    const { data, error } = await createProposal(INPUT);

    expect(data).toBeNull();
    expect(error).toBe('insert failed');
  });
});

// ---------------------------------------------------------------------------
// deleteProposal
// ---------------------------------------------------------------------------

describe('deleteProposal', () => {
  it('returns null error on success', async () => {
    const chain = makeChain({ data: null, error: null });
    mockServerClient.mockReturnValue(chain);

    const { error } = await deleteProposal('prop-1');

    expect(error).toBeNull();
  });

  it('returns error string when delete fails', async () => {
    const chain = makeChain({ data: null, error: { message: 'fk violation' } });
    mockServerClient.mockReturnValue(chain);

    const { error } = await deleteProposal('prop-1');

    expect(error).toBe('fk violation');
  });
});

// ---------------------------------------------------------------------------
// getProposalDependencyCounts
// ---------------------------------------------------------------------------

describe('getProposalDependencyCounts', () => {
  it('returns linked project count', async () => {
    const chain = makeChain({ data: null, count: 2, error: null });
    mockServerClient.mockReturnValue(chain);

    const { linkedProjects, error } = await getProposalDependencyCounts('prop-1');

    expect(error).toBeNull();
    expect(linkedProjects).toBe(2);
  });

  it('returns zero when no projects linked', async () => {
    const chain = makeChain({ data: null, count: 0, error: null });
    mockServerClient.mockReturnValue(chain);

    const { linkedProjects } = await getProposalDependencyCounts('prop-1');

    expect(linkedProjects).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getNextProposalNumber
// ---------------------------------------------------------------------------

describe('getNextProposalNumber', () => {
  it('generates BL-YYYY-001 when no proposals exist for this year', async () => {
    const chain = makeChain({ data: [], error: null });
    mockServerClient.mockReturnValue(chain);

    const { data, error } = await getNextProposalNumber();
    const year = new Date().getFullYear();

    expect(error).toBeNull();
    expect(data).toBe(`BL-${year}-001`);
  });

  it('increments the last number', async () => {
    const year = new Date().getFullYear();
    const chain = makeChain({ data: [{ proposal_number: `BL-${year}-005` }], error: null });
    mockServerClient.mockReturnValue(chain);

    const { data } = await getNextProposalNumber();

    expect(data).toBe(`BL-${year}-006`);
  });
});
