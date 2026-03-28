// Unit tests for lib/db/time-entries.ts
// Supabase client is mocked — no real DB calls.

import {
  listTimeEntries,
  getTimeEntryById,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getTimeEntrySummary,
} from './time-entries';

// ---------------------------------------------------------------------------
// Mock Supabase
// ---------------------------------------------------------------------------

const mockSingle   = jest.fn();
const mockSelect   = jest.fn();
const mockInsert   = jest.fn();
const mockUpdate   = jest.fn();
const mockDelete   = jest.fn();
const mockEq       = jest.fn();
const mockGte      = jest.fn();
const mockLte      = jest.fn();
const mockOrder    = jest.fn();
const mockRange    = jest.fn();

// Build a chainable mock that returns `this` for builder methods
function chainable(result: unknown) {
  const chain: Record<string, jest.Mock> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'gte', 'lte', 'order', 'range', 'single'];
  methods.forEach((m) => {
    chain[m] = jest.fn(() => chain);
  });
  // terminal call returns the result
  chain['single'] = mockSingle;
  chain['range']  = jest.fn(() => ({ ...result })); // range resolves with data
  return chain;
}

jest.mock('@/lib/db/supabase', () => ({
  serverClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    })),
  })),
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const MOCK_ROW = {
  id:          'entry-1',
  user_id:     'user-1',
  project_id:  'project-1',
  task_id:     null,
  hours:       '2.50',
  date:        '2026-03-27',
  description: 'Worked on API routes',
  is_billable: true,
  created_at:  '2026-03-27T10:00:00Z',
  updated_at:  '2026-03-27T10:00:00Z',
};

const EXPECTED_ENTRY = {
  id:          'entry-1',
  userId:      'user-1',
  projectId:   'project-1',
  taskId:      undefined,
  hours:       2.5,
  date:        '2026-03-27',
  description: 'Worked on API routes',
  isBillable:  true,
  createdAt:   '2026-03-27T10:00:00Z',
  updatedAt:   '2026-03-27T10:00:00Z',
};

// ---------------------------------------------------------------------------
// Helpers to set up chainable mock returns
// ---------------------------------------------------------------------------

function setupSelectChain(result: { data: unknown; count?: number | null; error: unknown }) {
  const chain = {
    eq:     jest.fn().mockReturnThis(),
    gte:    jest.fn().mockReturnThis(),
    lte:    jest.fn().mockReturnThis(),
    order:  jest.fn().mockReturnThis(),
    range:  jest.fn().mockResolvedValue(result),
    single: jest.fn().mockResolvedValue(result),
  };
  mockSelect.mockReturnValue(chain);
  return chain;
}

function setupInsertChain(result: { data: unknown; error: unknown }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
  };
  mockInsert.mockReturnValue(chain);
  return chain;
}

function setupUpdateChain(result: { data: unknown; error: unknown }) {
  const chain = {
    eq:     jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
  };
  mockUpdate.mockReturnValue(chain);
  return chain;
}

function setupDeleteChain(result: { error: unknown }) {
  const chain = {
    eq: jest.fn().mockResolvedValue(result),
  };
  mockDelete.mockReturnValue(chain);
  return chain;
}

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// listTimeEntries
// ---------------------------------------------------------------------------

describe('listTimeEntries', () => {
  it('returns mapped entries on success', async () => {
    setupSelectChain({ data: [MOCK_ROW], count: 1, error: null });

    const result = await listTimeEntries();

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0]).toMatchObject({ id: 'entry-1', hours: 2.5 });
    expect(result.total).toBe(1);
  });

  it('returns error when db fails', async () => {
    setupSelectChain({ data: null, count: null, error: { message: 'DB error' } });

    const result = await listTimeEntries();

    expect(result.data).toBeNull();
    expect(result.error).toBe('DB error');
  });
});

// ---------------------------------------------------------------------------
// getTimeEntryById
// ---------------------------------------------------------------------------

describe('getTimeEntryById', () => {
  it('returns mapped entry on success', async () => {
    setupSelectChain({ data: MOCK_ROW, error: null });

    const result = await getTimeEntryById('entry-1');

    expect(result.error).toBeNull();
    expect(result.data).toMatchObject(EXPECTED_ENTRY);
  });

  it('returns null (no error) when PGRST116', async () => {
    setupSelectChain({ data: null, error: { code: 'PGRST116', message: 'not found' } });

    const result = await getTimeEntryById('missing-id');

    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createTimeEntry
// ---------------------------------------------------------------------------

describe('createTimeEntry', () => {
  it('returns created entry on success', async () => {
    setupInsertChain({ data: MOCK_ROW, error: null });

    const result = await createTimeEntry(
      { date: '2026-03-27', hours: 2.5, description: 'Worked on API routes', isBillable: true },
      'user-1',
    );

    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({ id: 'entry-1', hours: 2.5 });
  });

  it('returns error on db failure', async () => {
    setupInsertChain({ data: null, error: { message: 'Insert failed' } });

    const result = await createTimeEntry(
      { date: '2026-03-27', hours: 2.5, description: 'Test', isBillable: true },
      'user-1',
    );

    expect(result.data).toBeNull();
    expect(result.error).toBe('Insert failed');
  });
});

// ---------------------------------------------------------------------------
// updateTimeEntry
// ---------------------------------------------------------------------------

describe('updateTimeEntry', () => {
  it('returns updated entry on success', async () => {
    const updatedRow = { ...MOCK_ROW, hours: '3.00' };
    setupUpdateChain({ data: updatedRow, error: null });

    const result = await updateTimeEntry('entry-1', { hours: 3 });

    expect(result.error).toBeNull();
    expect(result.data?.hours).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// deleteTimeEntry
// ---------------------------------------------------------------------------

describe('deleteTimeEntry', () => {
  it('returns no error on success', async () => {
    setupDeleteChain({ error: null });

    const result = await deleteTimeEntry('entry-1');

    expect(result.error).toBeNull();
  });

  it('returns error on db failure', async () => {
    setupDeleteChain({ error: { message: 'Delete failed' } });

    const result = await deleteTimeEntry('entry-1');

    expect(result.error).toBe('Delete failed');
  });
});

// ---------------------------------------------------------------------------
// getTimeEntrySummary
// ---------------------------------------------------------------------------

describe('getTimeEntrySummary', () => {
  it('returns aggregated summary on success', async () => {
    const rows = [
      { hours: '2.50', is_billable: true,  project_id: 'p1' },
      { hours: '1.00', is_billable: false, project_id: 'p1' },
      { hours: '3.00', is_billable: true,  project_id: 'p2' },
    ];
    const resolved = { data: rows, error: null };
    // getTimeEntrySummary awaits the query builder directly (no .single()/.range()),
    // so the chain must be thenable.
    const chain = {
      eq:     jest.fn().mockReturnThis(),
      gte:    jest.fn().mockReturnThis(),
      lte:    jest.fn().mockReturnThis(),
      // Make chain awaitable so `await query` resolves with the data
      then:   (fn: (v: typeof resolved) => unknown) => Promise.resolve(resolved).then(fn),
      catch:  (fn: (e: unknown) => unknown) => Promise.resolve(resolved).catch(fn),
      finally:(fn: () => void) => Promise.resolve(resolved).finally(fn),
    };
    mockSelect.mockReturnValue(chain);

    const result = await getTimeEntrySummary();

    expect(result.error).toBeNull();
    expect(result.data?.totalHours).toBeCloseTo(6.5);
    expect(result.data?.billableHours).toBeCloseTo(5.5);
    expect(result.data?.nonBillableHours).toBeCloseTo(1.0);
    expect(result.data?.byProject).toHaveLength(2);
  });
});
