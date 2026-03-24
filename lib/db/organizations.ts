// Database query functions for the organizations module.
// All functions use serverClient() (service role, bypasses RLS).
// Call only from server-side code — API routes, Server Actions, async Server Components.

import { serverClient } from '@/lib/db/supabase';
import type { Organization } from '@/lib/types/crm';
import type { OrganizationInput, UpdateOrganizationInput } from '@/lib/validations/organizations';
import type { ListOptions, PaginatedResult } from '@/lib/types/pagination';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';

// ---------------------------------------------------------------------------
// Row type (mirrors DB columns)
// ---------------------------------------------------------------------------

interface OrganizationRow {
  id: string;
  name: string;
  website: string | null;
  phone: string | null;
  industry: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Injected by count query — not a real column
  contact_count?: number;
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function fromRow(row: OrganizationRow): Organization {
  return {
    id:           row.id,
    name:         row.name,
    website:      row.website ?? undefined,
    phone:        row.phone ?? undefined,
    industry:     row.industry ?? undefined,
    address:      row.address ?? undefined,
    notes:        row.notes ?? undefined,
    contactCount: row.contact_count ?? undefined,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  };
}

function toInsert(data: OrganizationInput): Omit<OrganizationRow, 'id' | 'created_at' | 'updated_at' | 'contact_count'> {
  return {
    name:     data.name,
    website:  data.website || null,
    phone:    data.phone || null,
    industry: data.industry || null,
    address:  data.address || null,
    notes:    data.notes || null,
  };
}

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/** Returns a paginated list of organizations with their contact count. */
export async function listOrganizations(options?: ListOptions): Promise<PaginatedResult<Organization>> {
  try {
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE, sort = 'name', order = 'asc' } = options ?? {};
    const from = (page - 1) * pageSize;
    const to   = from + pageSize - 1;

    const { data, count, error } = await serverClient()
      .from('organizations')
      .select('*, contacts(count)', { count: 'exact' })
      .order(sort, { ascending: order !== 'desc' })
      .range(from, to);

    if (error) return { data: null, total: null, error: error.message };

    const rows = (data as (OrganizationRow & { contacts: [{ count: number }] })[]).map((row) => ({
      ...row,
      contact_count: row.contacts?.[0]?.count ?? 0,
    }));

    return { data: rows.map(fromRow), total: count, error: null };
  } catch (err) {
    console.error('[listOrganizations]', err);
    return { data: null, total: null, error: 'Failed to load organizations' };
  }
}

/** Returns a single organization or null if not found. */
export async function getOrganizationById(
  id: string,
): Promise<{ data: Organization | null; error: string | null }> {
  try {
    const { data, error } = await serverClient()
      .from('organizations')
      .select('*, contacts(count)')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { data: null, error: null };
      return { data: null, error: error.message };
    }

    const row = data as OrganizationRow & { contacts: [{ count: number }] };
    return { data: fromRow({ ...row, contact_count: row.contacts?.[0]?.count ?? 0 }), error: null };
  } catch (err) {
    console.error('[getOrganizationById]', err);
    return { data: null, error: 'Failed to load organization' };
  }
}

/** Returns the number of contacts linked to an organization (used for delete blocking). */
export async function getOrganizationContactCount(
  id: string,
): Promise<{ count: number | null; error: string | null }> {
  try {
    const { count, error } = await serverClient()
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', id);

    if (error) return { count: null, error: error.message };
    return { count: count ?? 0, error: null };
  } catch (err) {
    console.error('[getOrganizationContactCount]', err);
    return { count: null, error: 'Failed to check organization contacts' };
  }
}

/** Creates an organization and returns it. */
export async function createOrganization(
  input: OrganizationInput,
): Promise<{ data: Organization | null; error: string | null }> {
  try {
    const { data, error } = await serverClient()
      .from('organizations')
      .insert(toInsert(input))
      .select('*')
      .single();

    if (error) return { data: null, error: error.message };
    return { data: fromRow(data as OrganizationRow), error: null };
  } catch (err) {
    console.error('[createOrganization]', err);
    return { data: null, error: 'Failed to create organization' };
  }
}

/** Updates an organization and returns the updated record. */
export async function updateOrganization(
  id: string,
  input: UpdateOrganizationInput,
): Promise<{ data: Organization | null; error: string | null }> {
  try {
    const patch: Partial<Omit<OrganizationRow, 'id' | 'created_at' | 'updated_at' | 'contact_count'>> = {};
    if (input.name     !== undefined) patch.name     = input.name;
    if (input.website  !== undefined) patch.website  = input.website  || null;
    if (input.phone    !== undefined) patch.phone    = input.phone    || null;
    if (input.industry !== undefined) patch.industry = input.industry || null;
    if (input.address  !== undefined) patch.address  = input.address  || null;
    if (input.notes    !== undefined) patch.notes    = input.notes    || null;

    const { data, error } = await serverClient()
      .from('organizations')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { data: null, error: null };
      return { data: null, error: error.message };
    }
    return { data: fromRow(data as OrganizationRow), error: null };
  } catch (err) {
    console.error('[updateOrganization]', err);
    return { data: null, error: 'Failed to update organization' };
  }
}

/** Deletes an organization. Caller must verify no contacts exist first (checked at API layer). */
export async function deleteOrganization(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await serverClient()
      .from('organizations')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    console.error('[deleteOrganization]', err);
    return { error: 'Failed to delete organization' };
  }
}
