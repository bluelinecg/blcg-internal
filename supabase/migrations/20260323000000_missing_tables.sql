-- =============================================================================
-- BLCG Internal — Missing Table Definitions
-- Migration: 20260323000000_missing_tables
-- =============================================================================
-- Creates 9 tables that exist in the live Supabase instance but were absent
-- from the initial migration, causing fresh-DB setup to fail entirely.
--
-- Timestamp 20260323 is intentional: these tables must exist BEFORE the RLS
-- policies migration (20260324000000) which references them.
--
-- Tables:
--   1.  organizations            — CRM: companies/accounts
--   2.  contacts                 — CRM: individuals (FK → organizations)
--   3.  audit_log                — append-only mutation history
--   4.  pipelines                — sales pipeline definitions
--   5.  pipeline_stages          — ordered stages within a pipeline
--   6.  pipeline_items           — deal cards moving through stages
--   7.  pipeline_stage_history   — immutable log of stage transitions
--   8.  webhook_endpoints        — registered destination URLs
--   9.  webhook_deliveries       — per-attempt delivery log
--
-- RLS:
--   contacts, organizations, audit_log, pipelines, pipeline_stages,
--   pipeline_items — RLS enabled here; policies live in 20260324000000.
--   pipeline_stage_history, webhook_endpoints, webhook_deliveries — RLS
--   enabled AND policies defined here (not present in any prior migration).
--
-- All statements use IF NOT EXISTS — safe to run against a live DB that
-- already has these tables.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. organizations
--    No foreign-key dependencies. Must be created before contacts.
-- ---------------------------------------------------------------------------
create table if not exists organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  website     text,
  phone       text,
  industry    text,
  address     text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists organizations_name_idx on organizations (name);

create or replace trigger organizations_updated_at
  before update on organizations
  for each row execute function set_updated_at();

alter table organizations enable row level security;

-- ---------------------------------------------------------------------------
-- 2. contacts
--    Individuals who belong to zero or one organization.
-- ---------------------------------------------------------------------------
create table if not exists contacts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  first_name      text not null,
  last_name       text not null,
  email           text,
  phone           text,
  title           text,
  status          text not null default 'lead'
                    check (status in ('lead', 'prospect', 'active', 'inactive')),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists contacts_organization_id_idx on contacts (organization_id);
create index if not exists contacts_last_name_idx       on contacts (last_name);
create index if not exists contacts_status_idx          on contacts (status);

create or replace trigger contacts_updated_at
  before update on contacts
  for each row execute function set_updated_at();

alter table contacts enable row level security;

-- ---------------------------------------------------------------------------
-- 3. audit_log
--    Append-only mutation history. No updated_at — entries are immutable.
-- ---------------------------------------------------------------------------
create table if not exists audit_log (
  id           uuid primary key default gen_random_uuid(),
  entity_type  text not null
                 check (entity_type in (
                   'client', 'contact', 'organization',
                   'proposal', 'project', 'task',
                   'invoice', 'expense', 'pipeline_item'
                 )),
  entity_id    text not null,
  entity_label text not null,
  action       text not null
                 check (action in ('created', 'updated', 'deleted', 'status_changed')),
  actor_id     text not null,
  actor_name   text not null,
  metadata     jsonb,
  created_at   timestamptz not null default now()
);

-- Primary read pattern: all entries for a specific entity, newest first
create index if not exists audit_log_entity_idx
  on audit_log (entity_type, entity_id, created_at desc);

-- Secondary: global log ordered by time
create index if not exists audit_log_created_at_idx
  on audit_log (created_at desc);

alter table audit_log enable row level security;

-- ---------------------------------------------------------------------------
-- 4. pipelines
--    Top-level pipeline definitions (e.g. "Sales Pipeline").
-- ---------------------------------------------------------------------------
create table if not exists pipelines (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists pipelines_is_active_idx on pipelines (is_active);

create or replace trigger pipelines_updated_at
  before update on pipelines
  for each row execute function set_updated_at();

alter table pipelines enable row level security;

-- ---------------------------------------------------------------------------
-- 5. pipeline_stages
--    Ordered columns within a pipeline. Cascade-deleted with the pipeline.
-- ---------------------------------------------------------------------------
create table if not exists pipeline_stages (
  id          uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references pipelines(id) on delete cascade,
  name        text not null,
  color       text not null default '#6B7280',
  sort_order  integer not null default 0,
  is_won      boolean not null default false,
  is_lost     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists pipeline_stages_pipeline_id_idx
  on pipeline_stages (pipeline_id, sort_order);

create or replace trigger pipeline_stages_updated_at
  before update on pipeline_stages
  for each row execute function set_updated_at();

alter table pipeline_stages enable row level security;

-- ---------------------------------------------------------------------------
-- 6. pipeline_items
--    Deal cards that move through pipeline stages.
-- ---------------------------------------------------------------------------
create table if not exists pipeline_items (
  id               uuid primary key default gen_random_uuid(),
  pipeline_id      uuid not null references pipelines(id) on delete cascade,
  stage_id         uuid not null references pipeline_stages(id),
  title            text not null,
  value            numeric(12, 2),
  contact_id       uuid references contacts(id),
  client_id        uuid references clients(id),
  notes            text,
  entered_stage_at timestamptz not null default now(),
  closed_at        timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists pipeline_items_pipeline_id_idx on pipeline_items (pipeline_id);
create index if not exists pipeline_items_stage_id_idx    on pipeline_items (stage_id);
create index if not exists pipeline_items_contact_id_idx  on pipeline_items (contact_id);
create index if not exists pipeline_items_client_id_idx   on pipeline_items (client_id);

create or replace trigger pipeline_items_updated_at
  before update on pipeline_items
  for each row execute function set_updated_at();

alter table pipeline_items enable row level security;

-- ---------------------------------------------------------------------------
-- 7. pipeline_stage_history
--    Immutable log of every stage transition. Cascade-deleted with the item.
--    from_stage_id is nullable — null means the item was just created.
-- ---------------------------------------------------------------------------
create table if not exists pipeline_stage_history (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references pipeline_items(id) on delete cascade,
  from_stage_id uuid references pipeline_stages(id),
  to_stage_id   uuid not null references pipeline_stages(id),
  moved_at      timestamptz not null default now()
);

create index if not exists pipeline_stage_history_item_id_idx
  on pipeline_stage_history (item_id, moved_at desc);

alter table pipeline_stage_history enable row level security;

-- ---------------------------------------------------------------------------
-- 8. webhook_endpoints
--    Registered destination URLs for outbound event delivery.
--    The secret column stores a randomly generated HMAC signing key.
-- ---------------------------------------------------------------------------
create table if not exists webhook_endpoints (
  id          uuid primary key default gen_random_uuid(),
  url         text not null,
  description text,
  secret      text not null,
  events      text[] not null default '{}',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists webhook_endpoints_is_active_idx on webhook_endpoints (is_active);

create or replace trigger webhook_endpoints_updated_at
  before update on webhook_endpoints
  for each row execute function set_updated_at();

alter table webhook_endpoints enable row level security;

-- ---------------------------------------------------------------------------
-- 9. webhook_deliveries
--    Per-attempt delivery log. Cascade-deleted with the endpoint.
--    Append-only from the application — no updated_at.
-- ---------------------------------------------------------------------------
create table if not exists webhook_deliveries (
  id             uuid primary key default gen_random_uuid(),
  endpoint_id    uuid not null references webhook_endpoints(id) on delete cascade,
  event_type     text not null,
  payload        jsonb not null default '{}',
  status         text not null
                   check (status in ('pending', 'success', 'failed')),
  http_status    integer,
  response_body  text,
  attempt_number integer not null default 1,
  attempted_at   timestamptz not null default now()
);

-- Primary read pattern: all deliveries for an endpoint, newest first
create index if not exists webhook_deliveries_endpoint_id_idx
  on webhook_deliveries (endpoint_id, attempted_at desc);

alter table webhook_deliveries enable row level security;

-- =============================================================================
-- RLS Policies
-- =============================================================================
-- contacts, organizations, audit_log, pipelines, pipeline_stages,
-- pipeline_items — policies are in 20260324000000_rls_policies.sql.
-- The three tables below were added after that migration was written;
-- their policies are defined here.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- pipeline_stage_history
-- Operational audit trail — admin+member read; all writes via service role.
-- ---------------------------------------------------------------------------
create policy "pipeline_stage_history_select" on pipeline_stage_history
  for select to authenticated using (true);
-- No INSERT/UPDATE/DELETE policies — all writes go through service role.

-- ---------------------------------------------------------------------------
-- webhook_endpoints
-- Security-sensitive config. Admin-only for all write operations.
-- ---------------------------------------------------------------------------
create policy "webhook_endpoints_select" on webhook_endpoints
  for select to authenticated using (true);

create policy "webhook_endpoints_insert" on webhook_endpoints
  for insert to authenticated
  with check (public.get_my_role() = 'admin');

create policy "webhook_endpoints_update" on webhook_endpoints
  for update to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

create policy "webhook_endpoints_delete" on webhook_endpoints
  for delete to authenticated
  using (public.get_my_role() = 'admin');

-- ---------------------------------------------------------------------------
-- webhook_deliveries
-- Admin-only read. All inserts go through service role in the delivery utility.
-- ---------------------------------------------------------------------------
create policy "webhook_deliveries_select" on webhook_deliveries
  for select to authenticated
  using (public.get_my_role() = 'admin');
-- No INSERT/UPDATE/DELETE policies — all writes go through service role.
