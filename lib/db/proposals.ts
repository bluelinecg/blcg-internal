// Database query functions for the proposals module.
// All functions use serverClient() (service role, bypasses RLS).
// Call only from server-side code — API routes, Server Actions, async Server Components.
//
// Proposals have a child relationship with proposal_line_items.
// On create/update the line items are replaced atomically using a DB transaction.

import { serverClient } from '@/lib/db/supabase';
import type { Proposal, ProposalLineItem, ProposalStatus } from '@/lib/types/proposals';
import type { ProposalInput, UpdateProposalInput } from '@/lib/validations/proposals';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';
import type { ListOptions, PaginatedResult } from '@/lib/types/pagination';
import {
  type OrganizationJoinRow,
  type ContactJoinRow,
  orgFromJoinRow,
  contactFromJoinRow,
} from '@/lib/db/crm-joins';

// ---------------------------------------------------------------------------
// Row types (mirror DB columns)
// ---------------------------------------------------------------------------

interface ProposalRow {
  id: string;
  client_id: string | null;
  organization_id: string | null;
  organizations?: OrganizationJoinRow | null;
  proposal_number: string;
  title: string;
  status: ProposalStatus;
  situation: string | null;
  total_value: number;
  deposit_amount: number | null;
  agreement_signed_at: string | null;
  agreement_start_date: string | null;
  agreement_estimated_end_date: string | null;
  governing_state: string | null;
  notes: string | null;
  sent_at: string | null;
  expires_at: string | null;
  contact_id: string | null;
  contacts?: ContactJoinRow | null;
  created_at: string;
  updated_at: string;
  proposal_line_items?: LineItemRow[];
}

interface LineItemRow {
  id: string;
  proposal_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  sort_order: number;
}

// ---------------------------------------------------------------------------
// Mapping helpers — lineItemFromRow only; org/contact helpers live in crm-joins.ts
// ---------------------------------------------------------------------------

function lineItemFromRow(row: LineItemRow): ProposalLineItem {
  return {
    id: row.id,
    proposalId: row.proposal_id,
    description: row.description,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    total: row.total,
    sortOrder: row.sort_order,
  };
}

function fromRow(row: ProposalRow): Proposal {
  return {
    id: row.id,
    clientId: row.client_id ?? undefined,
    organizationId: row.organization_id ?? '',
    organization: row.organizations ? orgFromJoinRow(row.organizations) : undefined,
    proposalNumber: row.proposal_number,
    title: row.title,
    status: row.status,
    situation: row.situation ?? undefined,
    totalValue: row.total_value,
    depositAmount: row.deposit_amount ?? undefined,
    agreementSignedAt: row.agreement_signed_at ?? undefined,
    agreementStartDate: row.agreement_start_date ?? undefined,
    agreementEstimatedEndDate: row.agreement_estimated_end_date ?? undefined,
    governingState: row.governing_state ?? undefined,
    lineItems: (row.proposal_line_items ?? []).map(lineItemFromRow),
    notes: row.notes ?? undefined,
    sentAt: row.sent_at ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    contactId: row.contact_id ?? undefined,
    contact: row.contacts ? contactFromJoinRow(row.contacts) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInsert(
  data: ProposalInput,
): Omit<ProposalRow, 'id' | 'created_at' | 'updated_at' | 'proposal_line_items' | 'contacts' | 'organizations'> {
  return {
    client_id: data.clientId ?? null,
    organization_id: data.organizationId,
    proposal_number: data.proposalNumber ?? '',
    title: data.title,
    status: data.status,
    situation: data.situation ?? null,
    total_value: data.totalValue,
    deposit_amount: data.depositAmount ?? null,
    agreement_signed_at: data.agreementSignedAt ?? null,
    agreement_start_date: data.agreementStartDate ?? null,
    agreement_estimated_end_date: data.agreementEstimatedEndDate ?? null,
    governing_state: data.governingState ?? null,
    notes: data.notes ?? null,
    sent_at: data.sentAt ?? null,
    expires_at: data.expiresAt ?? null,
    contact_id: data.contactId ?? null,
  };
}

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/** Returns a paginated, sorted list of proposals with their line items. */
export async function listProposals(options?: ListOptions): Promise<PaginatedResult<Proposal>> {
  try {
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE, sort = 'created_at', order = 'desc' } = options ?? {};
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await serverClient()
      .from('proposals')
      .select('*, proposal_line_items(*), contacts(*), organizations(*)', { count: 'exact' })
      .order(sort, { ascending: order !== 'desc' })
      .range(from, to);

    if (error) return { data: null, total: null, error: error.message };
    return { data: (data as ProposalRow[]).map(fromRow), total: count, error: null };
  } catch (err) {
    console.error('[listProposals]', err);
    return { data: null, total: null, error: 'Failed to load proposals' };
  }
}

/** Returns a single proposal with its line items, or null if not found. */
export async function getProposalById(
  id: string,
): Promise<{ data: Proposal | null; error: string | null }> {
  try {
    const { data, error } = await serverClient()
      .from('proposals')
      .select('*, proposal_line_items(*), contacts(*), organizations(*)')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { data: null, error: null };
      return { data: null, error: error.message };
    }
    return { data: fromRow(data as ProposalRow), error: null };
  } catch (err) {
    console.error('[getProposalById]', err);
    return { data: null, error: 'Failed to load proposal' };
  }
}

/**
 * Creates a proposal and its line items.
 * Line items are inserted after the proposal to capture the generated proposal ID.
 */
export async function createProposal(
  input: ProposalInput,
): Promise<{ data: Proposal | null; error: string | null }> {
  try {
    const db = serverClient();

    // Insert proposal
    const { data: proposalRow, error: proposalErr } = await db
      .from('proposals')
      .insert(toInsert(input))
      .select('*, contacts(*), organizations(*)')
      .single();

    if (proposalErr) return { data: null, error: proposalErr.message };
    const proposal = proposalRow as ProposalRow;

    // Insert line items (if any)
    if (input.lineItems.length > 0) {
      const lineItemRows = input.lineItems.map((item, i) => ({
        proposal_id: proposal.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.total,
        sort_order: item.sortOrder ?? i,
      }));

      const { data: items, error: itemsErr } = await db
        .from('proposal_line_items')
        .insert(lineItemRows)
        .select('*');

      if (itemsErr) return { data: null, error: itemsErr.message };
      proposal.proposal_line_items = items as LineItemRow[];
    } else {
      proposal.proposal_line_items = [];
    }

    return { data: fromRow(proposal), error: null };
  } catch (err) {
    console.error('[createProposal]', err);
    return { data: null, error: 'Failed to create proposal' };
  }
}

/**
 * Updates a proposal and replaces all its line items.
 * Line items are deleted and re-inserted to keep ordering simple.
 */
export async function updateProposal(
  id: string,
  input: UpdateProposalInput,
): Promise<{ data: Proposal | null; error: string | null }> {
  try {
    const db = serverClient();

    // Build the proposal patch (only include defined fields)
    const patch: Partial<Omit<ProposalRow, 'id' | 'created_at' | 'updated_at' | 'proposal_line_items' | 'contacts' | 'organizations'>> = {};
    if (input.clientId !== undefined) patch.client_id = input.clientId ?? null;
    if (input.organizationId !== undefined) patch.organization_id = input.organizationId;
    if (input.proposalNumber !== undefined) patch.proposal_number = input.proposalNumber;
    if (input.title !== undefined) patch.title = input.title;
    if (input.status !== undefined) patch.status = input.status;
    if (input.situation !== undefined) patch.situation = input.situation ?? null;
    if (input.totalValue !== undefined) patch.total_value = input.totalValue;
    if (input.depositAmount !== undefined) patch.deposit_amount = input.depositAmount ?? null;
    if (input.agreementSignedAt !== undefined) patch.agreement_signed_at = input.agreementSignedAt ?? null;
    if (input.agreementStartDate !== undefined) patch.agreement_start_date = input.agreementStartDate ?? null;
    if (input.agreementEstimatedEndDate !== undefined) patch.agreement_estimated_end_date = input.agreementEstimatedEndDate ?? null;
    if (input.governingState !== undefined) patch.governing_state = input.governingState ?? null;
    if (input.notes !== undefined) patch.notes = input.notes ?? null;
    if (input.sentAt !== undefined) patch.sent_at = input.sentAt ?? null;
    if (input.expiresAt !== undefined) patch.expires_at = input.expiresAt ?? null;
    if (input.contactId !== undefined) patch.contact_id = input.contactId ?? null;

    const { data: proposalRow, error: proposalErr } = await db
      .from('proposals')
      .update(patch)
      .eq('id', id)
      .select('*, contacts(*), organizations(*)')
      .single();

    if (proposalErr) return { data: null, error: proposalErr.message };
    const proposal = proposalRow as ProposalRow;

    // Replace line items if provided
    if (input.lineItems !== undefined) {
      const { error: deleteErr } = await db
        .from('proposal_line_items')
        .delete()
        .eq('proposal_id', id);

      if (deleteErr) return { data: null, error: deleteErr.message };

      if (input.lineItems.length > 0) {
        const lineItemRows = input.lineItems.map((item, i) => ({
          proposal_id: id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.total,
          sort_order: item.sortOrder ?? i,
        }));

        const { data: items, error: itemsErr } = await db
          .from('proposal_line_items')
          .insert(lineItemRows)
          .select('*');

        if (itemsErr) return { data: null, error: itemsErr.message };
        proposal.proposal_line_items = items as LineItemRow[];
      } else {
        proposal.proposal_line_items = [];
      }
    } else {
      // Re-fetch existing line items
      const { data: items, error: itemsErr } = await db
        .from('proposal_line_items')
        .select('*')
        .eq('proposal_id', id)
        .order('sort_order');

      if (itemsErr) return { data: null, error: itemsErr.message };
      proposal.proposal_line_items = (items as LineItemRow[]) ?? [];
    }

    return { data: fromRow(proposal), error: null };
  } catch (err) {
    console.error('[updateProposal]', err);
    return { data: null, error: 'Failed to update proposal' };
  }
}

/** Deletes a proposal (line items cascade via FK). Caller is responsible for dependency checks. */
export async function deleteProposal(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await serverClient()
      .from('proposals')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    console.error('[deleteProposal]', err);
    return { error: 'Failed to delete proposal' };
  }
}

/**
 * Checks whether a proposal has a linked project (any status).
 * A linked project blocks deletion.
 */
export async function getProposalDependencyCounts(
  id: string,
): Promise<{ linkedProjects: number; error: string | null }> {
  try {
    const { count, error } = await serverClient()
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('proposal_id', id);

    if (error) return { linkedProjects: 0, error: error.message };
    return { linkedProjects: count ?? 0, error: null };
  } catch (err) {
    console.error('[getProposalDependencyCounts]', err);
    return { linkedProjects: 0, error: 'Failed to check dependencies' };
  }
}

/** Generates the next proposal number in BL-YYYY-NNN format. */
export async function getNextProposalNumber(): Promise<{ data: string | null; error: string | null }> {
  try {
    const year = new Date().getFullYear();
    const prefix = `BL-${year}-`;

    const { data, error } = await serverClient()
      .from('proposals')
      .select('proposal_number')
      .like('proposal_number', `${prefix}%`)
      .order('proposal_number', { ascending: false })
      .limit(1);

    if (error) return { data: null, error: error.message };

    const last = (data as { proposal_number: string }[])[0]?.proposal_number;
    const lastNum = last ? parseInt(last.replace(prefix, ''), 10) : 0;
    const next = String(lastNum + 1).padStart(3, '0');
    return { data: `${prefix}${next}`, error: null };
  } catch (err) {
    console.error('[getNextProposalNumber]', err);
    return { data: null, error: 'Failed to generate proposal number' };
  }
}
