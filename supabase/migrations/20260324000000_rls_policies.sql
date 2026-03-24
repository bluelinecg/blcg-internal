-- =============================================================================
-- BLCG Internal — RLS Policies
-- Migration: 20260324000000_rls_policies
-- =============================================================================
-- Roles (from Clerk publicMetadata.role, forwarded via JWT template):
--   admin  — full read/write/delete access
--   member — read/write; delete restricted to non-critical tables
--   viewer — read only
--
-- Prerequisites:
--   A Clerk JWT template named "supabase" must be configured with:
--     - Signing algorithm: HS256
--     - Signing secret: Supabase JWT secret (Settings > API > JWT Settings)
--     - Claim body: { "role": "{{user.public_metadata.role}}" }
--   The authenticated browser client must pass the Clerk session JWT via the
--   Authorization header (see lib/db/supabase.ts authenticatedBrowserClient).
--
-- All /app/api routes use serverClient() (service role) which bypasses RLS.
-- These policies protect direct Supabase access via the browser/anon client.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: extract role from Clerk JWT claims
-- Falls back to 'viewer' if no role claim is set — safe default.
-- ---------------------------------------------------------------------------
create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() ->> 'role')::text,
    'viewer'
  );
$$;

-- =============================================================================
-- Tables created outside the initial migration — enable RLS before policies.
-- =============================================================================
alter table if exists contacts        enable row level security;
alter table if exists organizations   enable row level security;
alter table if exists audit_log       enable row level security;
alter table if exists pipelines       enable row level security;
alter table if exists pipeline_stages enable row level security;
alter table if exists pipeline_items  enable row level security;

-- =============================================================================
-- GROUP A: Admin-only delete
-- Business-critical records. App-layer dependency checks run first;
-- RLS adds a second guard preventing accidental member-level deletion.
-- Tables: clients, proposals, proposal_line_items, projects, milestones,
--         invoices, invoice_line_items, pipelines, pipeline_stages
-- =============================================================================

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
create policy "clients_select" on clients
  for select to authenticated using (true);

create policy "clients_insert" on clients
  for insert to authenticated
  with check (public.get_my_role() in ('admin', 'member'));

create policy "clients_update" on clients
  for update to authenticated
  using (public.get_my_role() in ('admin', 'member'))
  with check (public.get_my_role() in ('admin', 'member'));

create policy "clients_delete" on clients
  for delete to authenticated
  using (public.get_my_role() = 'admin');

-- ---------------------------------------------------------------------------
-- proposals
-- ---------------------------------------------------------------------------
create policy "proposals_select" on proposals
  for select to authenticated using (true);

create policy "proposals_insert" on proposals
  for insert to authenticated
  with check (public.get_my_role() in ('admin', 'member'));

create policy "proposals_update" on proposals
  for update to authenticated
  using (public.get_my_role() in ('admin', 'member'))
  with check (public.get_my_role() in ('admin', 'member'));

create policy "proposals_delete" on proposals
  for delete to authenticated
  using (public.get_my_role() = 'admin');

-- ---------------------------------------------------------------------------
-- proposal_line_items
-- ---------------------------------------------------------------------------
create policy "proposal_line_items_select" on proposal_line_items
  for select to authenticated using (true);

create policy "proposal_line_items_insert" on proposal_line_items
  for insert to authenticated
  with check (public.get_my_role() in ('admin', 'member'));

create policy "proposal_line_items_update" on proposal_line_items
  for update to authenticated
  using (public.get_my_role() in ('admin', 'member'))
  with check (public.get_my_role() in ('admin', 'member'));

create policy "proposal_line_items_delete" on proposal_line_items
  for delete to authenticated
  using (public.get_my_role() = 'admin');

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create policy "projects_select" on projects
  for select to authenticated using (true);

create policy "projects_insert" on projects
  for insert to authenticated
  with check (public.get_my_role() in ('admin', 'member'));

create policy "projects_update" on projects
  for update to authenticated
  using (public.get_my_role() in ('admin', 'member'))
  with check (public.get_my_role() in ('admin', 'member'));

create policy "projects_delete" on projects
  for delete to authenticated
  using (public.get_my_role() = 'admin');

-- ---------------------------------------------------------------------------
-- milestones
-- ---------------------------------------------------------------------------
create policy "milestones_select" on milestones
  for select to authenticated using (true);

create policy "milestones_insert" on milestones
  for insert to authenticated
  with check (public.get_my_role() in ('admin', 'member'));

create policy "milestones_update" on milestones
  for update to authenticated
  using (public.get_my_role() in ('admin', 'member'))
  with check (public.get_my_role() in ('admin', 'member'));

create policy "milestones_delete" on milestones
  for delete to authenticated
  using (public.get_my_role() = 'admin');

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------
create policy "invoices_select" on invoices
  for select to authenticated using (true);

create policy "invoices_insert" on invoices
  for insert to authenticated
  with check (public.get_my_role() in ('admin', 'member'));

create policy "invoices_update" on invoices
  for update to authenticated
  using (public.get_my_role() in ('admin', 'member'))
  with check (public.get_my_role() in ('admin', 'member'));

create policy "invoices_delete" on invoices
  for delete to authenticated
  using (public.get_my_role() = 'admin');

-- ---------------------------------------------------------------------------
-- invoice_line_items
-- ---------------------------------------------------------------------------
create policy "invoice_line_items_select" on invoice_line_items
  for select to authenticated using (true);

create policy "invoice_line_items_insert" on invoice_line_items
  for insert to authenticated
  with check (public.get_my_role() in ('admin', 'member'));

create policy "invoice_line_items_update" on invoice_line_items
  for update to authenticated
  using (public.get_my_role() in ('admin', 'member'))
  with check (public.get_my_role() in ('admin', 'member'));

create policy "invoice_line_items_delete" on invoice_line_items
  for delete to authenticated
  using (public.get_my_role() = 'admin');

-- ---------------------------------------------------------------------------
-- pipelines (structural — admin-only delete)
-- ---------------------------------------------------------------------------
create policy "pipelines_select" on pipelines
  for select to authenticated using (true);

create policy "pipelines_insert" on pipelines
  for insert to authenticated
  with check (public.get_my_role() in ('admin', 'member'));

create policy "pipelines_update" on pipelines
  for update to authenticated
  using (public.get_my_role() in ('admin', 'member'))
  with check (public.get_my_role() in ('admin', 'member'));

create policy "pipelines_delete" on pipelines
  for delete to authenticated
  using (public.get_my_role() = 'admin');

-- ---------------------------------------------------------------------------
-- pipeline_stages (structural — admin-only delete)
-- ---------------------------------------------------------------------------
create policy "pipeline_stages_select" on pipeline_stages
  for select to authenticated using (true);

create policy "pipeline_stages_insert" on pipeline_stages
  for insert to authenticated
  with check (public.get_my_role() in ('admin', 'member'));

create policy "pipeline_stages_update" on pipeline_stages
  for update to authenticated
  using (public.get_my_role() in ('admin', 'member'))
  with check (public.get_my_role() in ('admin', 'member'));

create policy "pipeline_stages_delete" on pipeline_stages
  for delete to authenticated
  using (public.get_my_role() = 'admin');

-- =============================================================================
-- GROUP B: Member-and-above delete
-- Operational records with no dependency restrictions per CLAUDE.md.
-- Tables: tasks, expenses, contacts, organizations, pipeline_items
-- =============================================================================

-- ---------------------------------------------------------------------------
-- tasks (no delete restrictions — CLAUDE.md dependency matrix)
-- ---------------------------------------------------------------------------
create policy "tasks_select" on tasks
  for select to authenticated using (true);

create policy "tasks_insert" on tasks
  for insert to authenticated
  with check (public.get_my_role() in ('admin', 'member'));

create policy "tasks_update" on tasks
  for update to authenticated
  using (public.get_my_role() in ('admin', 'member'))
  with check (public.get_my_role() in ('admin', 'member'));

create policy "tasks_delete" on tasks
  for delete to authenticated
  using (public.get_my_role() in ('admin', 'member'));

-- ---------------------------------------------------------------------------
-- expenses (no delete restrictions — CLAUDE.md dependency matrix)
-- ---------------------------------------------------------------------------
create policy "expenses_select" on expenses
  for select to authenticated using (true);

create policy "expenses_insert" on expenses
  for insert to authenticated
  with check (public.get_my_role() in ('admin', 'member'));

create policy "expenses_update" on expenses
  for update to authenticated
  using (public.get_my_role() in ('admin', 'member'))
  with check (public.get_my_role() in ('admin', 'member'));

create policy "expenses_delete" on expenses
  for delete to authenticated
  using (public.get_my_role() in ('admin', 'member'));

-- ---------------------------------------------------------------------------
-- contacts
-- ---------------------------------------------------------------------------
create policy "contacts_select" on contacts
  for select to authenticated using (true);

create policy "contacts_insert" on contacts
  for insert to authenticated
  with check (public.get_my_role() in ('admin', 'member'));

create policy "contacts_update" on contacts
  for update to authenticated
  using (public.get_my_role() in ('admin', 'member'))
  with check (public.get_my_role() in ('admin', 'member'));

create policy "contacts_delete" on contacts
  for delete to authenticated
  using (public.get_my_role() in ('admin', 'member'));

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create policy "organizations_select" on organizations
  for select to authenticated using (true);

create policy "organizations_insert" on organizations
  for insert to authenticated
  with check (public.get_my_role() in ('admin', 'member'));

create policy "organizations_update" on organizations
  for update to authenticated
  using (public.get_my_role() in ('admin', 'member'))
  with check (public.get_my_role() in ('admin', 'member'));

create policy "organizations_delete" on organizations
  for delete to authenticated
  using (public.get_my_role() in ('admin', 'member'));

-- ---------------------------------------------------------------------------
-- pipeline_items
-- ---------------------------------------------------------------------------
create policy "pipeline_items_select" on pipeline_items
  for select to authenticated using (true);

create policy "pipeline_items_insert" on pipeline_items
  for insert to authenticated
  with check (public.get_my_role() in ('admin', 'member'));

create policy "pipeline_items_update" on pipeline_items
  for update to authenticated
  using (public.get_my_role() in ('admin', 'member'))
  with check (public.get_my_role() in ('admin', 'member'));

create policy "pipeline_items_delete" on pipeline_items
  for delete to authenticated
  using (public.get_my_role() in ('admin', 'member'));

-- =============================================================================
-- SPECIAL CASE: audit_log
-- Append-only immutable record. Only admins can read; all authenticated users
-- can insert (system writes on every action). No role may update or delete —
-- enforced by the absence of UPDATE and DELETE policies.
-- =============================================================================
create policy "audit_log_select" on audit_log
  for select to authenticated
  using (public.get_my_role() = 'admin');

create policy "audit_log_insert" on audit_log
  for insert to authenticated
  with check (true);
-- No UPDATE or DELETE policies — all mutation blocked for every role.
