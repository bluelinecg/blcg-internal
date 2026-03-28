// Database query functions for the time tracking module.
// All functions use serverClient() (service role, bypasses RLS).
// Call only from server-side code — API routes, Server Actions, async Server Components.

import { serverClient } from '@/lib/db/supabase';
import type { TimeEntry, TimeEntrySummary } from '@/lib/types/time-tracking';
import type { TimeEntryInput, UpdateTimeEntryInput } from '@/lib/validations/time-tracking';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';
import type { ListOptions, PaginatedResult } from '@/lib/types/pagination';

// ---------------------------------------------------------------------------
// Row type (mirrors DB columns)
// ---------------------------------------------------------------------------

interface TimeEntryRow {
  id:          string;
  user_id:     string;
  project_id:  string | null;
  task_id:     string | null;
  hours:       number;
  date:        string;
  description: string;
  is_billable: boolean;
  created_at:  string;
  updated_at:  string;
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function fromRow(row: TimeEntryRow): TimeEntry {
  return {
    id:          row.id,
    userId:      row.user_id,
    projectId:   row.project_id ?? undefined,
    taskId:      row.task_id ?? undefined,
    hours:       Number(row.hours),
    date:        row.date,
    description: row.description,
    isBillable:  row.is_billable,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

function toInsert(
  data: TimeEntryInput,
  userId: string,
): Omit<TimeEntryRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id:     userId,
    project_id:  data.projectId ?? null,
    task_id:     data.taskId ?? null,
    hours:       data.hours,
    date:        data.date,
    description: data.description,
    is_billable: data.isBillable ?? true,
  };
}

// ---------------------------------------------------------------------------
// List options with time-entry-specific filters
// ---------------------------------------------------------------------------

export interface TimeEntryListOptions extends ListOptions {
  projectId?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
}

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/** Returns a paginated, sorted list of time entries with optional filters. */
export async function listTimeEntries(
  options?: TimeEntryListOptions,
): Promise<PaginatedResult<TimeEntry>> {
  try {
    const {
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
      sort = 'date',
      order = 'desc',
      projectId,
      startDate,
      endDate,
      userId,
    } = options ?? {};
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = serverClient()
      .from('time_entries')
      .select('*', { count: 'exact' })
      .order(sort, { ascending: order !== 'desc' })
      .range(from, to);

    if (projectId) query = query.eq('project_id', projectId);
    if (startDate) query = query.gte('date', startDate);
    if (endDate)   query = query.lte('date', endDate);
    if (userId)    query = query.eq('user_id', userId);

    const { data, count, error } = await query;

    if (error) return { data: null, total: null, error: error.message };
    return { data: (data as TimeEntryRow[]).map(fromRow), total: count, error: null };
  } catch (err) {
    console.error('[listTimeEntries]', err);
    return { data: null, total: null, error: 'Failed to load time entries' };
  }
}

/** Returns a single time entry, or null if not found. */
export async function getTimeEntryById(
  id: string,
): Promise<{ data: TimeEntry | null; error: string | null }> {
  try {
    const { data, error } = await serverClient()
      .from('time_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { data: null, error: null };
      return { data: null, error: error.message };
    }
    return { data: fromRow(data as TimeEntryRow), error: null };
  } catch (err) {
    console.error('[getTimeEntryById]', err);
    return { data: null, error: 'Failed to load time entry' };
  }
}

/** Creates a time entry and returns it. */
export async function createTimeEntry(
  input: TimeEntryInput,
  userId: string,
): Promise<{ data: TimeEntry | null; error: string | null }> {
  try {
    const { data, error } = await serverClient()
      .from('time_entries')
      .insert(toInsert(input, userId))
      .select('*')
      .single();

    if (error) return { data: null, error: error.message };
    return { data: fromRow(data as TimeEntryRow), error: null };
  } catch (err) {
    console.error('[createTimeEntry]', err);
    return { data: null, error: 'Failed to create time entry' };
  }
}

/** Updates a time entry and returns the updated record. */
export async function updateTimeEntry(
  id: string,
  input: UpdateTimeEntryInput,
): Promise<{ data: TimeEntry | null; error: string | null }> {
  try {
    const patch: Partial<Omit<TimeEntryRow, 'id' | 'created_at' | 'updated_at'>> = {};
    if (input.hours       !== undefined) patch.hours       = input.hours;
    if (input.date        !== undefined) patch.date        = input.date;
    if (input.description !== undefined) patch.description = input.description;
    if (input.projectId   !== undefined) patch.project_id  = input.projectId ?? null;
    if (input.taskId      !== undefined) patch.task_id     = input.taskId ?? null;
    if (input.isBillable  !== undefined) patch.is_billable = input.isBillable;

    const { data, error } = await serverClient()
      .from('time_entries')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { data: null, error: null };
      return { data: null, error: error.message };
    }
    return { data: fromRow(data as TimeEntryRow), error: null };
  } catch (err) {
    console.error('[updateTimeEntry]', err);
    return { data: null, error: 'Failed to update time entry' };
  }
}

/** Deletes a time entry. */
export async function deleteTimeEntry(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await serverClient()
      .from('time_entries')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    console.error('[deleteTimeEntry]', err);
    return { error: 'Failed to delete time entry' };
  }
}

/** Returns aggregated summary stats for time entries with optional filters. */
export async function getTimeEntrySummary(filters?: {
  userId?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ data: TimeEntrySummary | null; error: string | null }> {
  try {
    let query = serverClient()
      .from('time_entries')
      .select('hours, is_billable, project_id');

    if (filters?.userId)    query = query.eq('user_id', filters.userId);
    if (filters?.projectId) query = query.eq('project_id', filters.projectId);
    if (filters?.startDate) query = query.gte('date', filters.startDate);
    if (filters?.endDate)   query = query.lte('date', filters.endDate);

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };

    const rows = data as Array<{ hours: number; is_billable: boolean; project_id: string | null }>;

    let totalHours    = 0;
    let billableHours = 0;
    const projectMap  = new Map<string, { hours: number; billableHours: number }>();

    for (const row of rows) {
      const h = Number(row.hours);
      totalHours += h;
      if (row.is_billable) billableHours += h;

      if (row.project_id) {
        const existing = projectMap.get(row.project_id) ?? { hours: 0, billableHours: 0 };
        existing.hours += h;
        if (row.is_billable) existing.billableHours += h;
        projectMap.set(row.project_id, existing);
      }
    }

    const byProject = Array.from(projectMap.entries()).map(([projectId, stats]) => ({
      projectId,
      hours: stats.hours,
      billableHours: stats.billableHours,
    }));

    return {
      data: {
        totalHours,
        billableHours,
        nonBillableHours: totalHours - billableHours,
        byProject,
      },
      error: null,
    };
  } catch (err) {
    console.error('[getTimeEntrySummary]', err);
    return { data: null, error: 'Failed to load time entry summary' };
  }
}
