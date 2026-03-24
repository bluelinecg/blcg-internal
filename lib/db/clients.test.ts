// Unit tests for lib/db/clients.ts
// Supabase serverClient is mocked so no real DB connection is needed.

import { listClients, getClientById, createClient, updateClient, deleteClient } from './clients';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

// Build a fluent mock builder that records chainable calls and resolves to
// a configurable result when awaited.
function makeChain(result: { data: unknown; count?: number | null; error: unknown }) {
  const chain = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    // Allows `await chain` directly (list queries don't call .single())
    then: jest.fn().mockImplementation((resolve: (v: unknown) => unknown) => Promise.resolve(resolve(result))),
  };
  return chain;
}

jest.mock('@/lib/db/supabase', () => ({
  serverClient: jest.fn(),
}));

import { serverClient } from '@/lib/db/supabase';
const mockServerClient = serverClient as jest.Mock;

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const ROW = {
  id: 'uuid-1',
  name: 'Acme Corp',
  contact_name: 'Jane Smith',
  contact_title: null,
  email: 'jane@acme.com',
  phone: null,
  industry: null,
  address: null,
  website: null,
  referred_by: null,
  status: 'active',
  notes: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const CLIENT = {
  id: 'uuid-1',
  name: 'Acme Corp',
  contactName: 'Jane Smith',
  email: 'jane@acme.com',
  status: 'active',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// listClients
// ---------------------------------------------------------------------------

describe('listClients', () => {
  it('returns mapped clients on success', async () => {
    const chain = makeChain({ data: [ROW], error: null });
    mockServerClient.mockReturnValue(chain);

    const { data, error } = await listClients();

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject(CLIENT);
  });

  it('returns error string when Supabase errors', async () => {
    const chain = makeChain({ data: null, error: { message: 'connection refused' } });
    mockServerClient.mockReturnValue(chain);

    const { data, error } = await listClients();

    expect(data).toBeNull();
    expect(error).toBe('connection refused');
  });
});

// ---------------------------------------------------------------------------
// getClientById
// ---------------------------------------------------------------------------

describe('getClientById', () => {
  it('returns mapped client when found', async () => {
    const chain = makeChain({ data: ROW, error: null });
    mockServerClient.mockReturnValue(chain);

    const { data, error } = await getClientById('uuid-1');

    expect(error).toBeNull();
    expect(data).toMatchObject(CLIENT);
  });

  it('returns null data (not an error) when row is not found', async () => {
    const chain = makeChain({ data: null, error: { code: 'PGRST116', message: 'not found' } });
    mockServerClient.mockReturnValue(chain);

    const { data, error } = await getClientById('missing-id');

    expect(data).toBeNull();
    expect(error).toBeNull();
  });

  it('returns error string for unexpected DB errors', async () => {
    const chain = makeChain({ data: null, error: { code: '500', message: 'db error' } });
    mockServerClient.mockReturnValue(chain);

    const { data, error } = await getClientById('uuid-1');

    expect(data).toBeNull();
    expect(error).toBe('db error');
  });
});

// ---------------------------------------------------------------------------
// createClient
// ---------------------------------------------------------------------------

describe('createClient', () => {
  const INPUT = {
    name: 'Acme Corp',
    contactName: 'Jane Smith',
    email: 'jane@acme.com',
    status: 'active' as const,
  };

  it('returns the created client on success', async () => {
    const chain = makeChain({ data: ROW, error: null });
    mockServerClient.mockReturnValue(chain);

    const { data, error } = await createClient(INPUT);

    expect(error).toBeNull();
    expect(data).toMatchObject(CLIENT);
  });

  it('returns error string when insert fails', async () => {
    const chain = makeChain({ data: null, error: { message: 'unique violation' } });
    mockServerClient.mockReturnValue(chain);

    const { data, error } = await createClient(INPUT);

    expect(data).toBeNull();
    expect(error).toBe('unique violation');
  });
});

// ---------------------------------------------------------------------------
// updateClient
// ---------------------------------------------------------------------------

describe('updateClient', () => {
  it('returns the updated client on success', async () => {
    const chain = makeChain({ data: ROW, error: null });
    mockServerClient.mockReturnValue(chain);

    const { data, error } = await updateClient('uuid-1', { name: 'Acme Corp Updated' });

    expect(error).toBeNull();
    expect(data).toMatchObject(CLIENT);
  });

  it('returns error string when update fails', async () => {
    const chain = makeChain({ data: null, error: { message: 'row not found' } });
    mockServerClient.mockReturnValue(chain);

    const { data, error } = await updateClient('uuid-1', { name: 'X' });

    expect(data).toBeNull();
    expect(error).toBe('row not found');
  });
});

// ---------------------------------------------------------------------------
// deleteClient
// ---------------------------------------------------------------------------

describe('deleteClient', () => {
  it('returns null error on success', async () => {
    const chain = makeChain({ data: null, error: null });
    mockServerClient.mockReturnValue(chain);

    const { error } = await deleteClient('uuid-1');

    expect(error).toBeNull();
  });

  it('returns error string when delete fails', async () => {
    const chain = makeChain({ data: null, error: { message: 'foreign key violation' } });
    mockServerClient.mockReturnValue(chain);

    const { error } = await deleteClient('uuid-1');

    expect(error).toBe('foreign key violation');
  });
});
