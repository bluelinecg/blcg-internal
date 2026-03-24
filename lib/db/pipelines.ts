// Database query functions for the Pipelines module.
// All functions use serverClient() (service role, bypasses RLS).
// Call these only from server-side code — API routes, Server Actions, or
// async Server Components. Never import this file into client components.
//
// Column mapping: DB uses snake_case, TypeScript types use camelCase.
// fromRow() / fromStageRow() / fromItemRow() centralise that translation.

import { serverClient } from '@/lib/db/supabase';
import type { Pipeline, PipelineStage, PipelineItem } from '@/lib/types/pipelines';
import type {
  PipelineInput,
  UpdatePipelineInput,
  PipelineStageInput,
  UpdatePipelineStageInput,
  PipelineItemInput,
  UpdatePipelineItemInput,
} from '@/lib/validations/pipelines';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';
import type { ListOptions, PaginatedResult } from '@/lib/types/pagination';

// ---------------------------------------------------------------------------
// Row types (mirror DB columns)
// ---------------------------------------------------------------------------

interface PipelineRow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  pipeline_stages?: PipelineStageRow[];
}

interface PipelineStageRow {
  id: string;
  pipeline_id: string;
  name: string;
  color: string;
  sort_order: number;
  is_won: boolean;
  is_lost: boolean;
  created_at: string;
  updated_at: string;
}

interface ContactJoinRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

interface ClientJoinRow {
  id: string;
  name: string;
}

interface PipelineItemRow {
  id: string;
  pipeline_id: string;
  stage_id: string;
  title: string;
  value: number | null;
  contact_id: string | null;
  client_id: string | null;
  notes: string | null;
  entered_stage_at: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  contacts?: ContactJoinRow | null;
  clients?: ClientJoinRow | null;
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function fromRow(row: PipelineRow): Pipeline {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    isActive: row.is_active,
    stages: row.pipeline_stages?.map(fromStageRow),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromStageRow(row: PipelineStageRow): PipelineStage {
  return {
    id: row.id,
    pipelineId: row.pipeline_id,
    name: row.name,
    color: row.color,
    sortOrder: row.sort_order,
    isWon: row.is_won,
    isLost: row.is_lost,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromItemRow(row: PipelineItemRow): PipelineItem {
  return {
    id: row.id,
    pipelineId: row.pipeline_id,
    stageId: row.stage_id,
    title: row.title,
    value: row.value ?? undefined,
    contactId: row.contact_id ?? undefined,
    clientId: row.client_id ?? undefined,
    notes: row.notes ?? undefined,
    enteredStageAt: row.entered_stage_at,
    closedAt: row.closed_at ?? undefined,
    contact: row.contacts
      ? { id: row.contacts.id, firstName: row.contacts.first_name, lastName: row.contacts.last_name, email: row.contacts.email ?? undefined }
      : undefined,
    client: row.clients
      ? { id: row.clients.id, name: row.clients.name }
      : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function stageToInsert(
  data: PipelineStageInput,
): Omit<PipelineStageRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    pipeline_id: data.pipelineId,
    name: data.name,
    color: data.color ?? '#6B7280',
    sort_order: data.sortOrder ?? 0,
    is_won: data.isWon ?? false,
    is_lost: data.isLost ?? false,
  };
}

function itemToInsert(
  data: PipelineItemInput,
): Omit<PipelineItemRow, 'id' | 'created_at' | 'updated_at' | 'contacts' | 'clients'> {
  return {
    pipeline_id: data.pipelineId,
    stage_id: data.stageId,
    title: data.title,
    value: data.value ?? null,
    contact_id: data.contactId ?? null,
    client_id: data.clientId ?? null,
    notes: data.notes ?? null,
    entered_stage_at: new Date().toISOString(),
    closed_at: null,
  };
}

// ---------------------------------------------------------------------------
// Pipeline CRUD
// ---------------------------------------------------------------------------

/** Returns a paginated list of pipelines. */
export async function listPipelines(options?: ListOptions): Promise<PaginatedResult<Pipeline>> {
  try {
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE, sort = 'name', order = 'asc' } = options ?? {};
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await serverClient()
      .from('pipelines')
      .select('*, pipeline_stages(*)', { count: 'exact' })
      .order(sort, { ascending: order !== 'desc' })
      .range(from, to);

    if (error) return { data: null, total: null, error: error.message };
    return { data: (data as PipelineRow[]).map(fromRow), total: count, error: null };
  } catch (err) {
    console.error('[listPipelines]', err);
    return { data: null, total: null, error: 'Failed to load pipelines' };
  }
}

/** Returns a single pipeline by ID with its stages ordered by sort_order. */
export async function getPipelineById(id: string): Promise<{ data: Pipeline | null; error: string | null }> {
  try {
    const { data, error } = await serverClient()
      .from('pipelines')
      .select('*, pipeline_stages(*)')
      .eq('id', id)
      .order('sort_order', { referencedTable: 'pipeline_stages', ascending: true })
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { data: null, error: null };
      return { data: null, error: error.message };
    }
    return { data: fromRow(data as PipelineRow), error: null };
  } catch (err) {
    console.error('[getPipelineById]', err);
    return { data: null, error: 'Failed to load pipeline' };
  }
}

/** Creates a new pipeline. */
export async function createPipeline(input: PipelineInput): Promise<{ data: Pipeline | null; error: string | null }> {
  try {
    const { data, error } = await serverClient()
      .from('pipelines')
      .insert({
        name: input.name,
        description: input.description ?? null,
        is_active: input.isActive ?? true,
      })
      .select('*, pipeline_stages(*)')
      .single();

    if (error) return { data: null, error: error.message };
    return { data: fromRow(data as PipelineRow), error: null };
  } catch (err) {
    console.error('[createPipeline]', err);
    return { data: null, error: 'Failed to create pipeline' };
  }
}

/** Updates a pipeline and returns the updated record. */
export async function updatePipeline(
  id: string,
  input: UpdatePipelineInput,
): Promise<{ data: Pipeline | null; error: string | null }> {
  try {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description ?? null;
    if (input.isActive !== undefined) patch.is_active = input.isActive;

    if (Object.keys(patch).length === 0) return getPipelineById(id);

    const { data, error } = await serverClient()
      .from('pipelines')
      .update(patch)
      .eq('id', id)
      .select('*, pipeline_stages(*)')
      .single();

    if (error) return { data: null, error: error.message };
    return { data: fromRow(data as PipelineRow), error: null };
  } catch (err) {
    console.error('[updatePipeline]', err);
    return { data: null, error: 'Failed to update pipeline' };
  }
}

/** Deletes a pipeline. Caller is responsible for dependency checks. */
export async function deletePipeline(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await serverClient().from('pipelines').delete().eq('id', id);
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    console.error('[deletePipeline]', err);
    return { error: 'Failed to delete pipeline' };
  }
}

/** Counts items in a pipeline. Used by the DELETE API route. */
export async function getPipelineItemCount(
  pipelineId: string,
): Promise<{ count: number; error: string | null }> {
  try {
    const { count, error } = await serverClient()
      .from('pipeline_items')
      .select('id', { count: 'exact', head: true })
      .eq('pipeline_id', pipelineId);

    if (error) return { count: 0, error: error.message };
    return { count: count ?? 0, error: null };
  } catch (err) {
    console.error('[getPipelineItemCount]', err);
    return { count: 0, error: 'Failed to check pipeline items' };
  }
}

// ---------------------------------------------------------------------------
// Stage CRUD
// ---------------------------------------------------------------------------

/** Returns all stages for a pipeline ordered by sort_order. */
export async function listStages(pipelineId: string): Promise<{ data: PipelineStage[] | null; error: string | null }> {
  try {
    const { data, error } = await serverClient()
      .from('pipeline_stages')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .order('sort_order', { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: (data as PipelineStageRow[]).map(fromStageRow), error: null };
  } catch (err) {
    console.error('[listStages]', err);
    return { data: null, error: 'Failed to load stages' };
  }
}

/** Creates a new stage. */
export async function createStage(input: PipelineStageInput): Promise<{ data: PipelineStage | null; error: string | null }> {
  try {
    const { data, error } = await serverClient()
      .from('pipeline_stages')
      .insert(stageToInsert(input))
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: fromStageRow(data as PipelineStageRow), error: null };
  } catch (err) {
    console.error('[createStage]', err);
    return { data: null, error: 'Failed to create stage' };
  }
}

/** Updates a stage. */
export async function updateStage(
  id: string,
  input: UpdatePipelineStageInput,
): Promise<{ data: PipelineStage | null; error: string | null }> {
  try {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.color !== undefined) patch.color = input.color;
    if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
    if (input.isWon !== undefined) patch.is_won = input.isWon;
    if (input.isLost !== undefined) patch.is_lost = input.isLost;

    const { data, error } = await serverClient()
      .from('pipeline_stages')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: fromStageRow(data as PipelineStageRow), error: null };
  } catch (err) {
    console.error('[updateStage]', err);
    return { data: null, error: 'Failed to update stage' };
  }
}

/** Deletes a stage. Caller is responsible for checking items first. */
export async function deleteStage(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await serverClient().from('pipeline_stages').delete().eq('id', id);
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    console.error('[deleteStage]', err);
    return { error: 'Failed to delete stage' };
  }
}

/** Counts items currently in a stage. */
export async function getStageItemCount(
  stageId: string,
): Promise<{ count: number; error: string | null }> {
  try {
    const { count, error } = await serverClient()
      .from('pipeline_items')
      .select('id', { count: 'exact', head: true })
      .eq('stage_id', stageId);

    if (error) return { count: 0, error: error.message };
    return { count: count ?? 0, error: null };
  } catch (err) {
    console.error('[getStageItemCount]', err);
    return { count: 0, error: 'Failed to check stage items' };
  }
}

// ---------------------------------------------------------------------------
// Item CRUD
// ---------------------------------------------------------------------------

const ITEM_SELECT = '*, contacts(id, first_name, last_name, email), clients(id, name)';

/** Returns all items for a pipeline. */
export async function listItems(
  pipelineId: string,
  options?: ListOptions,
): Promise<PaginatedResult<PipelineItem>> {
  try {
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE, sort = 'created_at', order = 'asc' } = options ?? {};
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await serverClient()
      .from('pipeline_items')
      .select(ITEM_SELECT, { count: 'exact' })
      .eq('pipeline_id', pipelineId)
      .order(sort, { ascending: order !== 'desc' })
      .range(from, to);

    if (error) return { data: null, total: null, error: error.message };
    return { data: (data as PipelineItemRow[]).map(fromItemRow), total: count, error: null };
  } catch (err) {
    console.error('[listItems]', err);
    return { data: null, total: null, error: 'Failed to load pipeline items' };
  }
}

/** Returns a single pipeline item by ID. */
export async function getItemById(id: string): Promise<{ data: PipelineItem | null; error: string | null }> {
  try {
    const { data, error } = await serverClient()
      .from('pipeline_items')
      .select(ITEM_SELECT)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { data: null, error: null };
      return { data: null, error: error.message };
    }
    return { data: fromItemRow(data as PipelineItemRow), error: null };
  } catch (err) {
    console.error('[getItemById]', err);
    return { data: null, error: 'Failed to load pipeline item' };
  }
}

/** Creates a new pipeline item. */
export async function createItem(
  input: PipelineItemInput,
): Promise<{ data: PipelineItem | null; error: string | null }> {
  try {
    const { data, error } = await serverClient()
      .from('pipeline_items')
      .insert(itemToInsert(input))
      .select(ITEM_SELECT)
      .single();

    if (error) return { data: null, error: error.message };
    return { data: fromItemRow(data as PipelineItemRow), error: null };
  } catch (err) {
    console.error('[createItem]', err);
    return { data: null, error: 'Failed to create pipeline item' };
  }
}

/** Updates a pipeline item.
 *  If stageId changes, resets entered_stage_at and inserts a stage_history row. */
export async function updateItem(
  id: string,
  input: UpdatePipelineItemInput,
): Promise<{ data: PipelineItem | null; error: string | null }> {
  try {
    const db = serverClient();

    // Fetch current state to detect stage change
    const { data: current, error: fetchErr } = await db
      .from('pipeline_items')
      .select('stage_id')
      .eq('id', id)
      .single();

    if (fetchErr) return { data: null, error: fetchErr.message };

    const stageChanged = input.stageId !== undefined && input.stageId !== current.stage_id;

    const patch: Record<string, unknown> = {};
    if (input.stageId !== undefined) {
      patch.stage_id = input.stageId;
      if (stageChanged) patch.entered_stage_at = new Date().toISOString();
    }
    if (input.title !== undefined) patch.title = input.title;
    if (input.value !== undefined) patch.value = input.value ?? null;
    if (input.contactId !== undefined) patch.contact_id = input.contactId ?? null;
    if (input.clientId !== undefined) patch.client_id = input.clientId ?? null;
    if (input.notes !== undefined) patch.notes = input.notes ?? null;

    const { data, error } = await db
      .from('pipeline_items')
      .update(patch)
      .eq('id', id)
      .select(ITEM_SELECT)
      .single();

    if (error) return { data: null, error: error.message };

    // Record stage history if stage changed
    if (stageChanged && input.stageId) {
      void db.from('pipeline_stage_history').insert({
        item_id: id,
        from_stage_id: current.stage_id,
        to_stage_id: input.stageId,
        moved_at: new Date().toISOString(),
      });
    }

    return { data: fromItemRow(data as PipelineItemRow), error: null };
  } catch (err) {
    console.error('[updateItem]', err);
    return { data: null, error: 'Failed to update pipeline item' };
  }
}

/** Deletes a pipeline item. No dependency restrictions. */
export async function deleteItem(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await serverClient().from('pipeline_items').delete().eq('id', id);
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    console.error('[deleteItem]', err);
    return { error: 'Failed to delete pipeline item' };
  }
}
