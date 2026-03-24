// Unit tests for lib/db/contacts.ts
// Supabase serverClient is mocked — no real DB connection needed.

import {
  listContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
} from './contacts';

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

const CONTACT_ROW = {
  id:              'contact-1',
  organization_id: 'org-1',
  first_name:      'Jane',
  last_name:       'Smith',
  email:           'jane.smith@example.com',
  phone:           '+1 (555) 000-0000',
  title:           'CEO',
  status:          'active',
  notes:           'Key contact',
  created_at:      '2026-01-01T00:00:00Z',
  updated_at:      '2026-01-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// listContacts
// ---------------------------------------------------------------------------

describe('listContacts', () => {
  it('returns mapped contacts on success', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: [CONTACT_ROW], count: 1, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await listContacts();

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe('contact-1');
    expect(data![0].firstName).toBe('Jane');
    expect(data![0].lastName).toBe('Smith');
    expect(data![0].organizationId).toBe('org-1');
    expect(data![0].status).toBe('active');
  });

  it('returns error string on DB failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, count: null, error: { message: 'DB error' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await listContacts();

    expect(data).toBeNull();
    expect(error).toBe('DB error');
  });

  it('filters by organizationId when provided', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: [CONTACT_ROW], count: 1, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await listContacts({ organizationId: 'org-1' });

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1');
  });
});

// ---------------------------------------------------------------------------
// getContactById
// ---------------------------------------------------------------------------

describe('getContactById', () => {
  it('returns the contact when found', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: CONTACT_ROW, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await getContactById('contact-1');

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.id).toBe('contact-1');
    expect(data!.email).toBe('jane.smith@example.com');
  });

  it('returns null data (not error) when not found (PGRST116)', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { code: 'PGRST116', message: 'Not found' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await getContactById('nonexistent');

    expect(data).toBeNull();
    expect(error).toBeNull();
  });

  it('returns error string on other DB failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { code: '500', message: 'Server error' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await getContactById('contact-1');

    expect(data).toBeNull();
    expect(error).toBe('Server error');
  });
});

// ---------------------------------------------------------------------------
// createContact
// ---------------------------------------------------------------------------

describe('createContact', () => {
  it('creates a contact and returns the mapped record', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: CONTACT_ROW, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await createContact({
      firstName:      'Jane',
      lastName:       'Smith',
      email:          'jane.smith@example.com',
      phone:          '+1 (555) 000-0000',
      title:          'CEO',
      organizationId: 'org-1',
      status:         'active',
      notes:          'Key contact',
    });

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.firstName).toBe('Jane');
    expect(data!.lastName).toBe('Smith');
  });

  it('returns error if insert fails', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'Insert failed' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await createContact({
      firstName: 'Jane',
      lastName:  'Smith',
      status:    'lead',
    });

    expect(data).toBeNull();
    expect(error).toBe('Insert failed');
  });
});

// ---------------------------------------------------------------------------
// updateContact
// ---------------------------------------------------------------------------

describe('updateContact', () => {
  it('returns the updated contact on success', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: { ...CONTACT_ROW, status: 'inactive' }, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await updateContact('contact-1', { status: 'inactive' });

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.status).toBe('inactive');
  });

  it('returns null data (not error) when not found (PGRST116)', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { code: 'PGRST116', message: 'Not found' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await updateContact('nonexistent', { status: 'inactive' });

    expect(data).toBeNull();
    expect(error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deleteContact
// ---------------------------------------------------------------------------

describe('deleteContact', () => {
  it('returns null error on success', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { error } = await deleteContact('contact-1');
    expect(error).toBeNull();
  });

  it('returns error string on failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'Delete failed' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { error } = await deleteContact('contact-1');
    expect(error).toBe('Delete failed');
  });
});
