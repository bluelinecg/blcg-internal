// Unit tests for lib/db/organizations.ts
// Supabase serverClient is mocked — no real DB connection needed.

import {
  listOrganizations,
  getOrganizationById,
  getOrganizationContactCount,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} from './organizations';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

function makeChain(result: { data: unknown; count?: number | null; error: unknown }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    order:  jest.fn().mockReturnThis(),
    range:  jest.fn().mockReturnThis(),
    eq:     jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    then:   jest.fn().mockImplementation((resolve: (v: unknown) => unknown) => Promise.resolve(resolve(result))),
  };
  return chain;
}

jest.mock('@/lib/db/supabase', () => ({ serverClient: jest.fn() }));
import { serverClient } from '@/lib/db/supabase';
const mockServerClient = serverClient as jest.Mock;

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const ORG_ROW = {
  id:         'org-1',
  name:       'Acme Inc.',
  website:    'https://acme.example.com',
  phone:      '+1 (555) 000-0000',
  industry:   'Technology',
  address:    '123 Main St',
  notes:      'Key client',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// listOrganizations uses nested select: data rows have contacts: [{ count: N }]
const ORG_ROW_WITH_COUNT = {
  ...ORG_ROW,
  contacts: [{ count: 3 }],
};

// ---------------------------------------------------------------------------
// listOrganizations
// ---------------------------------------------------------------------------

describe('listOrganizations', () => {
  it('returns mapped organizations with contact count on success', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: [ORG_ROW_WITH_COUNT], count: 1, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await listOrganizations();

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe('org-1');
    expect(data![0].name).toBe('Acme Inc.');
    expect(data![0].contactCount).toBe(3);
  });

  it('returns 0 contactCount when contacts array is empty', async () => {
    const db = { from: jest.fn() };
    const rowNoContacts = { ...ORG_ROW, contacts: [] };
    const chain = makeChain({ data: [rowNoContacts], count: 1, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data } = await listOrganizations();
    expect(data![0].contactCount).toBe(0);
  });

  it('returns error string on DB failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, count: null, error: { message: 'DB error' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await listOrganizations();

    expect(data).toBeNull();
    expect(error).toBe('DB error');
  });
});

// ---------------------------------------------------------------------------
// getOrganizationById
// ---------------------------------------------------------------------------

describe('getOrganizationById', () => {
  it('returns the organization when found', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: ORG_ROW_WITH_COUNT, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await getOrganizationById('org-1');

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.id).toBe('org-1');
    expect(data!.contactCount).toBe(3);
  });

  it('returns null data (not error) when not found (PGRST116)', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { code: 'PGRST116', message: 'Not found' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await getOrganizationById('nonexistent');

    expect(data).toBeNull();
    expect(error).toBeNull();
  });

  it('returns error string on other DB failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { code: '500', message: 'Server error' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await getOrganizationById('org-1');

    expect(data).toBeNull();
    expect(error).toBe('Server error');
  });
});

// ---------------------------------------------------------------------------
// getOrganizationContactCount
// ---------------------------------------------------------------------------

describe('getOrganizationContactCount', () => {
  it('returns the contact count on success', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, count: 5, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { count, error } = await getOrganizationContactCount('org-1');

    expect(error).toBeNull();
    expect(count).toBe(5);
  });

  it('returns 0 when no contacts exist', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, count: 0, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { count, error } = await getOrganizationContactCount('org-1');

    expect(error).toBeNull();
    expect(count).toBe(0);
  });

  it('returns error string on DB failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, count: null, error: { message: 'Count failed' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { count, error } = await getOrganizationContactCount('org-1');

    expect(count).toBeNull();
    expect(error).toBe('Count failed');
  });
});

// ---------------------------------------------------------------------------
// createOrganization
// ---------------------------------------------------------------------------

describe('createOrganization', () => {
  it('creates an organization and returns the mapped record', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: ORG_ROW, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await createOrganization({
      name:     'Acme Inc.',
      website:  'https://acme.example.com',
      phone:    '+1 (555) 000-0000',
      industry: 'Technology',
      address:  '123 Main St',
      notes:    'Key client',
    });

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.name).toBe('Acme Inc.');
    expect(data!.industry).toBe('Technology');
  });

  it('returns error if insert fails', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'Insert failed' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await createOrganization({ name: 'Acme Inc.' });

    expect(data).toBeNull();
    expect(error).toBe('Insert failed');
  });
});

// ---------------------------------------------------------------------------
// updateOrganization
// ---------------------------------------------------------------------------

describe('updateOrganization', () => {
  it('returns the updated organization on success', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: { ...ORG_ROW, industry: 'Finance' }, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await updateOrganization('org-1', { industry: 'Finance' });

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.industry).toBe('Finance');
  });

  it('returns null data (not error) when not found (PGRST116)', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { code: 'PGRST116', message: 'Not found' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await updateOrganization('nonexistent', { name: 'New Name' });

    expect(data).toBeNull();
    expect(error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deleteOrganization
// ---------------------------------------------------------------------------

describe('deleteOrganization', () => {
  it('returns null error on success', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { error } = await deleteOrganization('org-1');
    expect(error).toBeNull();
  });

  it('returns error string on failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'Delete failed' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { error } = await deleteOrganization('org-1');
    expect(error).toBe('Delete failed');
  });
});
