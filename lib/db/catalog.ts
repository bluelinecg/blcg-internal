// Database query functions for the catalog module.
// All functions use serverClient() (service role, bypasses RLS).
// Call only from server-side code — API routes, Server Actions, async Server Components.

import { serverClient } from '@/lib/db/supabase';
import type { CatalogItem } from '@/lib/types/catalog';
import type { CatalogItemInput, UpdateCatalogItemInput } from '@/lib/validations/catalog';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';
import type { ListOptions, PaginatedResult } from '@/lib/types/pagination';

// ---------------------------------------------------------------------------
// Row type (mirrors DB columns)
// ---------------------------------------------------------------------------

interface CatalogItemRow {
  id:          string;
  name:        string;
  description: string | null;
  unit_price:  number;
  category:    string | null;
  is_active:   boolean;
  created_at:  string;
  updated_at:  string;
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function fromRow(row: CatalogItemRow): CatalogItem {
  return {
    id:          row.id,
    name:        row.name,
    description: row.description ?? undefined,
    unitPrice:   row.unit_price,
    category:    row.category ?? undefined,
    isActive:    row.is_active,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/** Returns a paginated, sorted list of catalog items. */
export async function listCatalogItems(
  options?: ListOptions & { activeOnly?: boolean },
): Promise<PaginatedResult<CatalogItem>> {
  try {
    const {
      page     = 1,
      pageSize = DEFAULT_PAGE_SIZE,
      sort     = 'name',
      order    = 'asc',
    } = options ?? {};
    const from = (page - 1) * pageSize;
    const to   = from + pageSize - 1;

    let query = serverClient()
      .from('catalog_items')
      .select('*', { count: 'exact' })
      .order(sort, { ascending: order !== 'desc' })
      .range(from, to);

    if (options?.activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, count, error } = await query;

    if (error) return { data: null, total: null, error: error.message };
    return { data: (data as CatalogItemRow[]).map(fromRow), total: count, error: null };
  } catch (err) {
    console.error('[listCatalogItems]', err);
    return { data: null, total: null, error: 'Failed to load catalog items' };
  }
}

/** Returns a single catalog item by ID, or null if not found. */
export async function getCatalogItemById(
  id: string,
): Promise<{ data: CatalogItem | null; error: string | null }> {
  try {
    const { data, error } = await serverClient()
      .from('catalog_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { data: null, error: null };
      return { data: null, error: error.message };
    }
    return { data: fromRow(data as CatalogItemRow), error: null };
  } catch (err) {
    console.error('[getCatalogItemById]', err);
    return { data: null, error: 'Failed to load catalog item' };
  }
}

/** Creates a catalog item. */
export async function createCatalogItem(
  input: CatalogItemInput,
): Promise<{ data: CatalogItem | null; error: string | null }> {
  try {
    const { data, error } = await serverClient()
      .from('catalog_items')
      .insert({
        name:        input.name,
        description: input.description ?? null,
        unit_price:  input.unitPrice,
        category:    input.category ?? null,
        is_active:   input.isActive ?? true,
      })
      .select('*')
      .single();

    if (error) return { data: null, error: error.message };
    return { data: fromRow(data as CatalogItemRow), error: null };
  } catch (err) {
    console.error('[createCatalogItem]', err);
    return { data: null, error: 'Failed to create catalog item' };
  }
}

/** Updates a catalog item. Only provided fields are changed. */
export async function updateCatalogItem(
  id: string,
  input: UpdateCatalogItemInput,
): Promise<{ data: CatalogItem | null; error: string | null }> {
  try {
    const patch: Partial<Omit<CatalogItemRow, 'id' | 'created_at' | 'updated_at'>> = {};
    if (input.name        !== undefined) patch.name        = input.name;
    if (input.description !== undefined) patch.description = input.description ?? null;
    if (input.unitPrice   !== undefined) patch.unit_price  = input.unitPrice;
    if (input.category    !== undefined) patch.category    = input.category ?? null;
    if (input.isActive    !== undefined) patch.is_active   = input.isActive;

    const { data, error } = await serverClient()
      .from('catalog_items')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { data: null, error: null };
      return { data: null, error: error.message };
    }
    return { data: fromRow(data as CatalogItemRow), error: null };
  } catch (err) {
    console.error('[updateCatalogItem]', err);
    return { data: null, error: 'Failed to update catalog item' };
  }
}

/** Deletes a catalog item. No dependency guard required (no FK references). */
export async function deleteCatalogItem(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await serverClient()
      .from('catalog_items')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    console.error('[deleteCatalogItem]', err);
    return { error: 'Failed to delete catalog item' };
  }
}
