// Database query functions for the contacts module.
// All functions use serverClient() (service role, bypasses RLS).
// Call only from server-side code — API routes, Server Actions, async Server Components.
//
// Contacts have no dependency blockers — they are always deletable.

import { serverClient } from '@/lib/db/supabase';
import type { Contact } from '@/lib/types/crm';
import type { ContactInput, UpdateContactInput } from '@/lib/validations/contacts';
import type { ListOptions, PaginatedResult } from '@/lib/types/pagination';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';

// ---------------------------------------------------------------------------
// Row type (mirrors DB columns)
// ---------------------------------------------------------------------------

interface ContactRow {
  id: string;
  organization_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  status: Contact['status'];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function fromRow(row: ContactRow): Contact {
  return {
    id:             row.id,
    organizationId: row.organization_id ?? undefined,
    firstName:      row.first_name,
    lastName:       row.last_name,
    email:          row.email ?? undefined,
    phone:          row.phone ?? undefined,
    title:          row.title ?? undefined,
    status:         row.status,
    notes:          row.notes ?? undefined,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
  };
}

function toInsert(data: ContactInput): Omit<ContactRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    organization_id: data.organizationId || null,
    first_name:      data.firstName,
    last_name:       data.lastName,
    email:           data.email || null,
    phone:           data.phone || null,
    title:           data.title || null,
    status:          data.status,
    notes:           data.notes || null,
  };
}

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/** Returns a paginated list of contacts. Optionally filtered by organizationId. */
export async function listContacts(
  options?: ListOptions & { organizationId?: string },
): Promise<PaginatedResult<Contact>> {
  try {
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE, sort = 'last_name', order = 'asc', organizationId } = options ?? {};
    const from = (page - 1) * pageSize;
    const to   = from + pageSize - 1;

    let query = serverClient()
      .from('contacts')
      .select('*', { count: 'exact' })
      .order(sort, { ascending: order !== 'desc' })
      .range(from, to);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, count, error } = await query;

    if (error) return { data: null, total: null, error: error.message };
    return { data: (data as ContactRow[]).map(fromRow), total: count, error: null };
  } catch (err) {
    console.error('[listContacts]', err);
    return { data: null, total: null, error: 'Failed to load contacts' };
  }
}

/** Returns a single contact or null if not found. */
export async function getContactById(
  id: string,
): Promise<{ data: Contact | null; error: string | null }> {
  try {
    const { data, error } = await serverClient()
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { data: null, error: null };
      return { data: null, error: error.message };
    }
    return { data: fromRow(data as ContactRow), error: null };
  } catch (err) {
    console.error('[getContactById]', err);
    return { data: null, error: 'Failed to load contact' };
  }
}

/** Creates a contact and returns it. */
export async function createContact(
  input: ContactInput,
): Promise<{ data: Contact | null; error: string | null }> {
  try {
    const { data, error } = await serverClient()
      .from('contacts')
      .insert(toInsert(input))
      .select('*')
      .single();

    if (error) return { data: null, error: error.message };
    return { data: fromRow(data as ContactRow), error: null };
  } catch (err) {
    console.error('[createContact]', err);
    return { data: null, error: 'Failed to create contact' };
  }
}

/** Updates a contact and returns the updated record. */
export async function updateContact(
  id: string,
  input: UpdateContactInput,
): Promise<{ data: Contact | null; error: string | null }> {
  try {
    const patch: Partial<Omit<ContactRow, 'id' | 'created_at' | 'updated_at'>> = {};
    if (input.organizationId !== undefined) patch.organization_id = input.organizationId || null;
    if (input.firstName      !== undefined) patch.first_name      = input.firstName;
    if (input.lastName       !== undefined) patch.last_name       = input.lastName;
    if (input.email          !== undefined) patch.email           = input.email || null;
    if (input.phone          !== undefined) patch.phone           = input.phone || null;
    if (input.title          !== undefined) patch.title           = input.title || null;
    if (input.status         !== undefined) patch.status          = input.status;
    if (input.notes          !== undefined) patch.notes           = input.notes || null;

    const { data, error } = await serverClient()
      .from('contacts')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { data: null, error: null };
      return { data: null, error: error.message };
    }
    return { data: fromRow(data as ContactRow), error: null };
  } catch (err) {
    console.error('[updateContact]', err);
    return { data: null, error: 'Failed to update contact' };
  }
}

/** Deletes a contact. Contacts have no dependency restrictions. */
export async function deleteContact(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await serverClient()
      .from('contacts')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    console.error('[deleteContact]', err);
    return { error: 'Failed to delete contact' };
  }
}
