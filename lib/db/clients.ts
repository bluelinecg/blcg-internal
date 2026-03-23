// Database query functions for the clients module.
// All functions use serverClient() (service role, bypasses RLS).
// Call these only from server-side code — API routes, Server Actions, or
// async Server Components. Never import this file into client components.
//
// Column mapping: DB uses snake_case, TypeScript types use camelCase.
// fromRow() centralises that translation.

import { serverClient } from '@/lib/db/supabase';
import type { Client, ClientStatus } from '@/lib/types/clients';
import type { ClientInput, UpdateClientInput } from '@/lib/validations/clients';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';
import type { ListOptions, PaginatedResult } from '@/lib/types/pagination';

// ---------------------------------------------------------------------------
// Row type (mirrors DB columns)
// ---------------------------------------------------------------------------

interface ClientRow {
  id: string;
  name: string;
  contact_name: string;
  contact_title: string | null;
  email: string;
  phone: string | null;
  industry: string | null;
  address: string | null;
  website: string | null;
  referred_by: string | null;
  status: ClientStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function fromRow(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    contactName: row.contact_name,
    contactTitle: row.contact_title ?? undefined,
    email: row.email,
    phone: row.phone ?? undefined,
    industry: row.industry ?? undefined,
    address: row.address ?? undefined,
    website: row.website ?? undefined,
    referredBy: row.referred_by ?? undefined,
    status: row.status,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInsert(data: ClientInput): Omit<ClientRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    name: data.name,
    contact_name: data.contactName,
    contact_title: data.contactTitle ?? null,
    email: data.email,
    phone: data.phone ?? null,
    industry: data.industry ?? null,
    address: data.address ?? null,
    website: data.website ?? null,
    referred_by: data.referredBy ?? null,
    status: data.status,
    notes: data.notes ?? null,
  };
}

function toUpdate(data: UpdateClientInput): Partial<Omit<ClientRow, 'id' | 'created_at' | 'updated_at'>> {
  const row: Partial<Omit<ClientRow, 'id' | 'created_at' | 'updated_at'>> = {};
  if (data.name !== undefined) row.name = data.name;
  if (data.contactName !== undefined) row.contact_name = data.contactName;
  if (data.contactTitle !== undefined) row.contact_title = data.contactTitle ?? null;
  if (data.email !== undefined) row.email = data.email;
  if (data.phone !== undefined) row.phone = data.phone ?? null;
  if (data.industry !== undefined) row.industry = data.industry ?? null;
  if (data.address !== undefined) row.address = data.address ?? null;
  if (data.website !== undefined) row.website = data.website ?? null;
  if (data.referredBy !== undefined) row.referred_by = data.referredBy ?? null;
  if (data.status !== undefined) row.status = data.status;
  if (data.notes !== undefined) row.notes = data.notes ?? null;
  return row;
}

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/** Returns a paginated, sorted list of clients. */
export async function listClients(options?: ListOptions): Promise<PaginatedResult<Client>> {
  try {
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE, sort = 'name', order = 'asc' } = options ?? {};
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await serverClient()
      .from('clients')
      .select('*', { count: 'exact' })
      .order(sort, { ascending: order !== 'desc' })
      .range(from, to);

    if (error) return { data: null, total: null, error: error.message };
    return { data: (data as ClientRow[]).map(fromRow), total: count, error: null };
  } catch (err) {
    console.error('[listClients]', err);
    return { data: null, total: null, error: 'Failed to load clients' };
  }
}

/** Returns a single client by ID, or null if not found. */
export async function getClientById(id: string): Promise<{ data: Client | null; error: string | null }> {
  try {
    const { data, error } = await serverClient()
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { data: null, error: null }; // row not found
      return { data: null, error: error.message };
    }
    return { data: fromRow(data as ClientRow), error: null };
  } catch (err) {
    console.error('[getClientById]', err);
    return { data: null, error: 'Failed to load client' };
  }
}

/** Inserts a new client and returns the created record. */
export async function createClient(input: ClientInput): Promise<{ data: Client | null; error: string | null }> {
  try {
    const { data, error } = await serverClient()
      .from('clients')
      .insert(toInsert(input))
      .select('*')
      .single();

    if (error) return { data: null, error: error.message };
    return { data: fromRow(data as ClientRow), error: null };
  } catch (err) {
    console.error('[createClient]', err);
    return { data: null, error: 'Failed to create client' };
  }
}

/** Updates an existing client and returns the updated record. */
export async function updateClient(
  id: string,
  input: UpdateClientInput,
): Promise<{ data: Client | null; error: string | null }> {
  try {
    const patch = toUpdate(input);
    if (Object.keys(patch).length === 0) {
      return getClientById(id);
    }

    const { data, error } = await serverClient()
      .from('clients')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return { data: null, error: error.message };
    return { data: fromRow(data as ClientRow), error: null };
  } catch (err) {
    console.error('[updateClient]', err);
    return { data: null, error: 'Failed to update client' };
  }
}

/** Deletes a client. Caller is responsible for dependency checks before calling. */
export async function deleteClient(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await serverClient()
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    console.error('[deleteClient]', err);
    return { error: 'Failed to delete client' };
  }
}

/** Counts active dependencies for a client. Used by the DELETE API route. */
export async function getClientDependencyCounts(id: string): Promise<{
  activeProposals: number;
  activeProjects: number;
  activeInvoices: number;
  error: string | null;
}> {
  try {
    const db = serverClient();

    const [proposalsRes, projectsRes, invoicesRes] = await Promise.all([
      db
        .from('proposals')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', id)
        .in('status', ['sent', 'viewed', 'accepted']),
      db
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', id)
        .in('status', ['active', 'on_hold']),
      db
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', id)
        .in('status', ['sent', 'viewed', 'overdue']),
    ]);

    if (proposalsRes.error) return { activeProposals: 0, activeProjects: 0, activeInvoices: 0, error: proposalsRes.error.message };
    if (projectsRes.error) return { activeProposals: 0, activeProjects: 0, activeInvoices: 0, error: projectsRes.error.message };
    if (invoicesRes.error) return { activeProposals: 0, activeProjects: 0, activeInvoices: 0, error: invoicesRes.error.message };

    return {
      activeProposals: proposalsRes.count ?? 0,
      activeProjects: projectsRes.count ?? 0,
      activeInvoices: invoicesRes.count ?? 0,
      error: null,
    };
  } catch (err) {
    console.error('[getClientDependencyCounts]', err);
    return { activeProposals: 0, activeProjects: 0, activeInvoices: 0, error: 'Failed to check dependencies' };
  }
}
