// Unit tests for lib/db/catalog.ts
// Supabase serverClient is mocked — no real DB connection needed.

import {
  listCatalogItems,
  getCatalogItemById,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
} from './catalog';

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

const CATALOG_ROW = {
  id:          'item-1',
  name:        'Website Audit',
  description: 'Full technical and SEO audit of a website',
  unit_price:  500,
  category:    'Consulting',
  is_active:   true,
  created_at:  '2026-01-01T00:00:00Z',
  updated_at:  '2026-01-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// listCatalogItems
// ---------------------------------------------------------------------------

describe('listCatalogItems', () => {
  it('returns mapped items on success', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: [CATALOG_ROW], count: 1, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await listCatalogItems();

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe('item-1');
    expect(data![0].name).toBe('Website Audit');
    expect(data![0].unitPrice).toBe(500);
    expect(data![0].isActive).toBe(true);
  });

  it('returns error string on DB failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, count: null, error: { message: 'DB error' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await listCatalogItems();

    expect(data).toBeNull();
    expect(error).toBe('DB error');
  });

  it('filters by is_active when activeOnly is true', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: [CATALOG_ROW], count: 1, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await listCatalogItems({ activeOnly: true });

    expect(error).toBeNull();
    expect(chain.eq).toHaveBeenCalledWith('is_active', true);
  });
});

// ---------------------------------------------------------------------------
// getCatalogItemById
// ---------------------------------------------------------------------------

describe('getCatalogItemById', () => {
  it('returns the item when found', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: CATALOG_ROW, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await getCatalogItemById('item-1');

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.id).toBe('item-1');
    expect(data!.description).toBe('Full technical and SEO audit of a website');
  });

  it('returns null data (not error) when not found (PGRST116)', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { code: 'PGRST116', message: 'Not found' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await getCatalogItemById('nonexistent');

    expect(data).toBeNull();
    expect(error).toBeNull();
  });

  it('returns error string on other DB failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { code: '500', message: 'Server error' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await getCatalogItemById('item-1');

    expect(data).toBeNull();
    expect(error).toBe('Server error');
  });
});

// ---------------------------------------------------------------------------
// createCatalogItem
// ---------------------------------------------------------------------------

describe('createCatalogItem', () => {
  it('creates an item and returns the mapped record', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: CATALOG_ROW, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await createCatalogItem({
      name:        'Website Audit',
      description: 'Full technical and SEO audit of a website',
      unitPrice:   500,
      category:    'Consulting',
      isActive:    true,
    });

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.name).toBe('Website Audit');
    expect(data!.unitPrice).toBe(500);
  });

  it('returns error if insert fails', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'Insert failed' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await createCatalogItem({
      name:      'Test Item',
      unitPrice: 0,
      isActive:  true,
    });

    expect(data).toBeNull();
    expect(error).toBe('Insert failed');
  });
});

// ---------------------------------------------------------------------------
// updateCatalogItem
// ---------------------------------------------------------------------------

describe('updateCatalogItem', () => {
  it('returns the updated item on success', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: { ...CATALOG_ROW, is_active: false }, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await updateCatalogItem('item-1', { isActive: false });

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.isActive).toBe(false);
  });

  it('returns null data (not error) when not found (PGRST116)', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { code: 'PGRST116', message: 'Not found' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { data, error } = await updateCatalogItem('nonexistent', { isActive: false });

    expect(data).toBeNull();
    expect(error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deleteCatalogItem
// ---------------------------------------------------------------------------

describe('deleteCatalogItem', () => {
  it('returns null error on success', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: null });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { error } = await deleteCatalogItem('item-1');
    expect(error).toBeNull();
  });

  it('returns error string on failure', async () => {
    const db = { from: jest.fn() };
    const chain = makeChain({ data: null, error: { message: 'Delete failed' } });
    db.from.mockReturnValue(chain);
    mockServerClient.mockReturnValue(db);

    const { error } = await deleteCatalogItem('item-1');
    expect(error).toBe('Delete failed');
  });
});
