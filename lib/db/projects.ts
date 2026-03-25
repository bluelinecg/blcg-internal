// Database query functions for the projects module.
// All functions use serverClient() (service role, bypasses RLS).
// Call only from server-side code — API routes, Server Actions, async Server Components.
//
// Schema mapping notes:
//   DB milestones.title          → Milestone.name
//   DB milestones.sort_order     → Milestone.order
//   DB projects.end_date         → Project.targetDate
//   DB projects.description      → Project.notes
//   DB projects.completed_date   → Project.completedDate

import { serverClient } from '@/lib/db/supabase';
import type { Project, Milestone, ProjectStatus, MilestoneStatus } from '@/lib/types/projects';
import type { ProjectInput, UpdateProjectInput } from '@/lib/validations/projects';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination';
import type { ListOptions, PaginatedResult } from '@/lib/types/pagination';
import { type OrganizationJoinRow, orgFromJoinRow } from '@/lib/db/crm-joins';

// ---------------------------------------------------------------------------
// Row types (mirror DB columns)
// ---------------------------------------------------------------------------

interface ProjectRow {
  id: string;
  client_id: string | null;
  organization_id: string | null;
  organizations?: OrganizationJoinRow | null;
  proposal_id: string | null;
  name: string;
  description: string | null;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  completed_date: string | null;
  budget: number | null;
  created_at: string;
  updated_at: string;
  milestones?: MilestoneRow[];
}

interface MilestoneRow {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  due_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function milestoneFromRow(row: MilestoneRow): Milestone {
  return {
    id: row.id,
    name: row.title,
    description: row.description ?? undefined,
    status: row.status,
    dueDate: row.due_date ?? undefined,
    order: row.sort_order,
  };
}

function fromRow(row: ProjectRow): Project {
  return {
    id: row.id,
    clientId: row.client_id ?? undefined,
    organizationId: row.organization_id ?? '',
    organization: row.organizations ? orgFromJoinRow(row.organizations) : undefined,
    proposalId: row.proposal_id ?? undefined,
    name: row.name,
    status: row.status,
    startDate: row.start_date ?? row.created_at,
    targetDate: row.end_date ?? undefined,
    completedDate: row.completed_date ?? undefined,
    budget: row.budget ?? 0,
    milestones: (row.milestones ?? []).map(milestoneFromRow),
    notes: row.description ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInsert(
  data: ProjectInput,
): Omit<ProjectRow, 'id' | 'created_at' | 'updated_at' | 'milestones' | 'organizations'> {
  return {
    client_id: data.clientId ?? null,
    organization_id: data.organizationId,
    proposal_id: data.proposalId ?? null,
    name: data.name,
    description: data.notes ?? null,
    status: data.status,
    start_date: data.startDate ? data.startDate.split('T')[0] : null,
    end_date: data.targetDate ? data.targetDate.split('T')[0] : null,
    completed_date: data.completedDate ? data.completedDate.split('T')[0] : null,
    budget: data.budget ?? null,
  };
}

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/** Returns a paginated, sorted list of projects with their milestones. */
export async function listProjects(options?: ListOptions): Promise<PaginatedResult<Project>> {
  try {
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE, sort = 'created_at', order = 'desc' } = options ?? {};
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await serverClient()
      .from('projects')
      .select('*, milestones(*), organizations(*)', { count: 'exact' })
      .order(sort, { ascending: order !== 'desc' })
      .range(from, to);

    if (error) return { data: null, total: null, error: error.message };
    return { data: (data as ProjectRow[]).map(fromRow), total: count, error: null };
  } catch (err) {
    console.error('[listProjects]', err);
    return { data: null, total: null, error: 'Failed to load projects' };
  }
}

/** Returns a single project with its milestones, or null if not found. */
export async function getProjectById(
  id: string,
): Promise<{ data: Project | null; error: string | null }> {
  try {
    const { data, error } = await serverClient()
      .from('projects')
      .select('*, milestones(*), organizations(*)')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { data: null, error: null };
      return { data: null, error: error.message };
    }
    return { data: fromRow(data as ProjectRow), error: null };
  } catch (err) {
    console.error('[getProjectById]', err);
    return { data: null, error: 'Failed to load project' };
  }
}

/**
 * Creates a project and its initial milestones.
 * Milestones are inserted after the project to capture the generated project ID.
 */
export async function createProject(
  input: ProjectInput,
): Promise<{ data: Project | null; error: string | null }> {
  try {
    const db = serverClient();

    const { data: projectRow, error: projectErr } = await db
      .from('projects')
      .insert(toInsert(input))
      .select('*')
      .single();

    if (projectErr) return { data: null, error: projectErr.message };
    const project = projectRow as ProjectRow;

    if (input.milestones.length > 0) {
      const milestoneRows = input.milestones.map((m, i) => ({
        project_id: project.id,
        title: m.name,
        description: m.description ?? null,
        status: m.status,
        due_date: m.dueDate ? m.dueDate.split('T')[0] : null,
        sort_order: m.order ?? i,
      }));

      const { data: items, error: milestonesErr } = await db
        .from('milestones')
        .insert(milestoneRows)
        .select('*');

      if (milestonesErr) return { data: null, error: milestonesErr.message };
      project.milestones = items as MilestoneRow[];
    } else {
      project.milestones = [];
    }

    return { data: fromRow(project), error: null };
  } catch (err) {
    console.error('[createProject]', err);
    return { data: null, error: 'Failed to create project' };
  }
}

/**
 * Updates a project and replaces all its milestones if provided.
 */
export async function updateProject(
  id: string,
  input: UpdateProjectInput,
): Promise<{ data: Project | null; error: string | null }> {
  try {
    const db = serverClient();

    const patch: Partial<Omit<ProjectRow, 'id' | 'created_at' | 'updated_at' | 'milestones' | 'organizations'>> = {};
    if (input.clientId !== undefined) patch.client_id = input.clientId ?? null;
    if (input.organizationId !== undefined) patch.organization_id = input.organizationId;
    if (input.proposalId !== undefined) patch.proposal_id = input.proposalId ?? null;
    if (input.name !== undefined) patch.name = input.name;
    if (input.notes !== undefined) patch.description = input.notes ?? null;
    if (input.status !== undefined) patch.status = input.status;
    if (input.startDate !== undefined) patch.start_date = input.startDate ? input.startDate.split('T')[0] : null;
    if (input.targetDate !== undefined) patch.end_date = input.targetDate ? input.targetDate.split('T')[0] : null;
    if (input.completedDate !== undefined) patch.completed_date = input.completedDate ? input.completedDate.split('T')[0] : null;
    if (input.budget !== undefined) patch.budget = input.budget ?? null;

    const { data: projectRow, error: projectErr } = await db
      .from('projects')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (projectErr) return { data: null, error: projectErr.message };
    const project = projectRow as ProjectRow;

    if (input.milestones !== undefined) {
      const { error: deleteErr } = await db
        .from('milestones')
        .delete()
        .eq('project_id', id);

      if (deleteErr) return { data: null, error: deleteErr.message };

      if (input.milestones.length > 0) {
        const milestoneRows = input.milestones.map((m, i) => ({
          project_id: id,
          title: m.name,
          description: m.description ?? null,
          status: m.status,
          due_date: m.dueDate ? m.dueDate.split('T')[0] : null,
          sort_order: m.order ?? i,
        }));

        const { data: items, error: milestonesErr } = await db
          .from('milestones')
          .insert(milestoneRows)
          .select('*');

        if (milestonesErr) return { data: null, error: milestonesErr.message };
        project.milestones = items as MilestoneRow[];
      } else {
        project.milestones = [];
      }
    } else {
      const { data: items, error: milestonesErr } = await db
        .from('milestones')
        .select('*')
        .eq('project_id', id)
        .order('sort_order');

      if (milestonesErr) return { data: null, error: milestonesErr.message };
      project.milestones = (items as MilestoneRow[]) ?? [];
    }

    return { data: fromRow(project), error: null };
  } catch (err) {
    console.error('[updateProject]', err);
    return { data: null, error: 'Failed to update project' };
  }
}

/** Deletes a project (milestones cascade via FK). Caller is responsible for dependency checks. */
export async function deleteProject(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await serverClient()
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    console.error('[deleteProject]', err);
    return { error: 'Failed to delete project' };
  }
}

/**
 * Counts outstanding invoices linked to a project.
 * Outstanding invoices (sent/viewed/overdue) block deletion.
 */
export async function getProjectDependencyCounts(
  id: string,
): Promise<{ outstandingInvoices: number; error: string | null }> {
  try {
    const { count, error } = await serverClient()
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', id)
      .in('status', ['sent', 'viewed', 'overdue']);

    if (error) return { outstandingInvoices: 0, error: error.message };
    return { outstandingInvoices: count ?? 0, error: null };
  } catch (err) {
    console.error('[getProjectDependencyCounts]', err);
    return { outstandingInvoices: 0, error: 'Failed to check dependencies' };
  }
}
