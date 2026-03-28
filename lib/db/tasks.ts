// Database query functions for the tasks module.
// All functions use serverClient() (service role, bypasses RLS).
// Call only from server-side code — API routes, Server Actions, async Server Components.
//
// Tasks have no dependency blockers — they are always deletable.

import { serverClient } from '@/lib/db/supabase';
import type { Task, TaskStatus, TaskPriority, TaskRecurrence, TaskType, TaskModule, ChecklistItem } from '@/lib/types/tasks';
import type { TaskInput, UpdateTaskInput } from '@/lib/validations/tasks';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';
import type { ListOptions, PaginatedResult } from '@/lib/types/pagination';

// ---------------------------------------------------------------------------
// Row type (mirrors DB columns)
// ---------------------------------------------------------------------------

interface TaskRow {
  id:              string;
  title:           string;
  description:     string | null;
  status:          TaskStatus;
  priority:        TaskPriority;
  sort_order:      number;
  project_id:      string | null;
  client_id:       string | null;
  assignee_id:     string | null;
  due_date:        string | null;
  recurrence:      TaskRecurrence;
  checklist:       ChecklistItem[];
  blocked_by:      string[];
  type:            string | null;
  module:          string | null;
  epic:            string | null;
  estimated_hours: number | null;
  created_at:      string;
  updated_at:      string;
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function fromRow(row: TaskRow): Task {
  return {
    id:             row.id,
    title:          row.title,
    description:    row.description ?? undefined,
    status:         row.status,
    priority:       row.priority,
    sortOrder:      row.sort_order ?? 0,
    projectId:      row.project_id ?? undefined,
    clientId:       row.client_id ?? undefined,
    assignee:       row.assignee_id ?? undefined,
    dueDate:        row.due_date ? `${row.due_date}T00:00:00Z` : undefined,
    recurrence:     row.recurrence ?? 'none',
    checklist:      row.checklist ?? [],
    blockedBy:      row.blocked_by ?? [],
    taskType:       (row.type ?? undefined) as TaskType | undefined,
    module:         (row.module ?? undefined) as TaskModule | undefined,
    epic:           row.epic ?? undefined,
    estimatedHours: row.estimated_hours ?? undefined,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
  };
}

function toInsert(data: TaskInput): Omit<TaskRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    title:           data.title,
    description:     data.description ?? null,
    status:          data.status,
    priority:        data.priority,
    sort_order:      data.sortOrder ?? 0,
    project_id:      data.projectId || null,
    client_id:       data.clientId || null,
    assignee_id:     data.assignee || null,
    due_date:        data.dueDate ? data.dueDate.split('T')[0] : null,
    recurrence:      data.recurrence ?? 'none',
    checklist:       data.checklist ?? [],
    blocked_by:      data.blockedBy ?? [],
    type:            data.taskType || null,
    module:          data.module || null,
    epic:            data.epic || null,
    estimated_hours: data.estimatedHours ?? null,
  };
}

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/** Returns a paginated, sorted list of tasks. */
export async function listTasks(options?: ListOptions): Promise<PaginatedResult<Task>> {
  try {
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE, sort = 'created_at', order = 'desc' } = options ?? {};
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await serverClient()
      .from('tasks')
      .select('*', { count: 'exact' })
      .order(sort, { ascending: order !== 'desc' })
      .range(from, to);

    if (error) return { data: null, total: null, error: error.message };
    return { data: (data as TaskRow[]).map(fromRow), total: count, error: null };
  } catch (err) {
    console.error('[listTasks]', err);
    return { data: null, total: null, error: 'Failed to load tasks' };
  }
}

/** Returns a single task or null if not found. */
export async function getTaskById(
  id: string,
): Promise<{ data: Task | null; error: string | null }> {
  try {
    const { data, error } = await serverClient()
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { data: null, error: null };
      return { data: null, error: error.message };
    }
    return { data: fromRow(data as TaskRow), error: null };
  } catch (err) {
    console.error('[getTaskById]', err);
    return { data: null, error: 'Failed to load task' };
  }
}

/** Creates a task and returns it. */
export async function createTask(
  input: TaskInput,
): Promise<{ data: Task | null; error: string | null }> {
  try {
    const { data, error } = await serverClient()
      .from('tasks')
      .insert(toInsert(input))
      .select('*')
      .single();

    if (error) return { data: null, error: error.message };
    return { data: fromRow(data as TaskRow), error: null };
  } catch (err) {
    console.error('[createTask]', err);
    return { data: null, error: 'Failed to create task' };
  }
}

/** Updates a task and returns the updated record. */
export async function updateTask(
  id: string,
  input: UpdateTaskInput,
): Promise<{ data: Task | null; error: string | null }> {
  try {
    const patch: Partial<Omit<TaskRow, 'id' | 'created_at' | 'updated_at'>> = {};
    if (input.title          !== undefined) patch.title           = input.title;
    if (input.description    !== undefined) patch.description     = input.description ?? null;
    if (input.status         !== undefined) patch.status          = input.status;
    if (input.priority       !== undefined) patch.priority        = input.priority;
    if (input.sortOrder      !== undefined) patch.sort_order      = input.sortOrder;
    if (input.projectId      !== undefined) patch.project_id      = input.projectId || null;
    if (input.clientId       !== undefined) patch.client_id       = input.clientId || null;
    if (input.assignee       !== undefined) patch.assignee_id     = input.assignee || null;
    if (input.dueDate        !== undefined) patch.due_date        = input.dueDate ? input.dueDate.split('T')[0] : null;
    if (input.recurrence     !== undefined) patch.recurrence      = input.recurrence;
    if (input.checklist      !== undefined) patch.checklist       = input.checklist;
    if (input.blockedBy      !== undefined) patch.blocked_by      = input.blockedBy;
    if (input.taskType       !== undefined) patch.type            = input.taskType || null;
    if (input.module         !== undefined) patch.module          = input.module || null;
    if (input.epic           !== undefined) patch.epic            = input.epic || null;
    if (input.estimatedHours !== undefined) patch.estimated_hours = input.estimatedHours ?? null;

    const { data, error } = await serverClient()
      .from('tasks')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { data: null, error: null };
      return { data: null, error: error.message };
    }
    return { data: fromRow(data as TaskRow), error: null };
  } catch (err) {
    console.error('[updateTask]', err);
    return { data: null, error: 'Failed to update task' };
  }
}

/** Deletes a task. Tasks have no dependency restrictions. */
export async function deleteTask(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await serverClient()
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    console.error('[deleteTask]', err);
    return { error: 'Failed to delete task' };
  }
}

// ---------------------------------------------------------------------------
// Reorder
// ---------------------------------------------------------------------------

/**
 * Bulk-updates sort_order for a set of tasks within a given column.
 * Each task in orderedIds receives sort_order = its index in the array.
 * The .eq('status', status) guard prevents reordering tasks outside the column.
 *
 * NOTE: Supabase JS v2 does not support multi-row UPDATE in a single call,
 * so updates are parallelised via Promise.all. For typical column sizes
 * (< 50 tasks) this is negligible. A Postgres stored procedure can replace
 * this if atomicity becomes a requirement.
 */
export async function reorderTasks(
  status: TaskStatus,
  orderedIds: string[],
): Promise<{ error: string | null }> {
  try {
    const updates = orderedIds.map((id, index) =>
      serverClient()
        .from('tasks')
        .update({ sort_order: index })
        .eq('id', id)
        .eq('status', status),
    );
    const results = await Promise.all(updates);
    const failed  = results.find((r) => r.error);
    if (failed?.error) return { error: failed.error.message };
    return { error: null };
  } catch (err) {
    console.error('[reorderTasks]', err);
    return { error: 'Failed to reorder tasks' };
  }
}

// ---------------------------------------------------------------------------
// Recurrence
// ---------------------------------------------------------------------------

/** Returns the ISO date string for the next occurrence based on the recurrence rule. */
function nextDueDate(fromDate: string, recurrence: TaskRecurrence): string {
  const date = new Date(fromDate);
  switch (recurrence) {
    case 'daily':    date.setDate(date.getDate() + 1);  break;
    case 'weekly':   date.setDate(date.getDate() + 7);  break;
    case 'biweekly': date.setDate(date.getDate() + 14); break;
    case 'monthly':  date.setMonth(date.getMonth() + 1); break;
    default: break;
  }
  return date.toISOString().split('T')[0];
}

/**
 * Creates the next occurrence of a recurring task.
 * Called after the original task is marked done.
 * The new task starts in 'todo' status with an empty checklist.
 *
 * TODO: dispatch automation engine event here once the Automation Engine is built.
 */
export async function createNextRecurrence(
  task: Task,
): Promise<{ data: Task | null; error: string | null }> {
  try {
    const baseDate  = task.dueDate ?? new Date().toISOString();
    const dueDateStr = nextDueDate(baseDate, task.recurrence);

    const { data, error } = await serverClient()
      .from('tasks')
      .insert({
        title:           task.title,
        description:     task.description ?? null,
        status:          'todo' as TaskStatus,
        priority:        task.priority,
        project_id:      task.projectId ?? null,
        client_id:       task.clientId ?? null,
        assignee_id:     task.assignee ?? null,
        due_date:        dueDateStr,
        recurrence:      task.recurrence,
        checklist:       [],           // fresh checklist for each occurrence
        blocked_by:      task.blockedBy,
        type:            task.taskType ?? null,
        module:          task.module ?? null,
        epic:            task.epic ?? null,
        estimated_hours: task.estimatedHours ?? null,
      })
      .select('*')
      .single();

    if (error) return { data: null, error: error.message };
    return { data: fromRow(data as TaskRow), error: null };
  } catch (err) {
    console.error('[createNextRecurrence]', err);
    return { data: null, error: 'Failed to create next recurrence' };
  }
}
