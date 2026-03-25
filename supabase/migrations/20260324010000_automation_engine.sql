-- =============================================================================
-- BLCG Internal — Automation Engine
-- Migration: 20260324010000_automation_engine
-- =============================================================================
-- automation_rules  — user-configurable trigger → action rules
-- automation_run_log — execution history per rule per entity
-- =============================================================================

-- ---------------------------------------------------------------------------
-- automation_rules
-- ---------------------------------------------------------------------------
create table automation_rules (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  description     text,
  is_active       boolean not null default true,
  trigger_type    text not null,
  trigger_config  jsonb not null default '{}',
  conditions      jsonb not null default '[]',
  actions         jsonb not null default '[]',
  created_by      text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger automation_rules_updated_at
  before update on automation_rules
  for each row execute function set_updated_at();

-- Fast lookup of active rules by trigger type (used by engine dispatch)
create index automation_rules_trigger_type_active_idx
  on automation_rules (trigger_type)
  where is_active = true;

alter table automation_rules enable row level security;

-- ---------------------------------------------------------------------------
-- automation_run_log
-- ---------------------------------------------------------------------------
create table automation_run_log (
  id                uuid primary key default gen_random_uuid(),
  rule_id           uuid not null references automation_rules(id) on delete cascade,
  trigger_type      text not null,
  entity_id         text not null,
  trigger_data      jsonb not null default '{}',
  status            text not null check (status in ('success', 'failed', 'skipped')),
  error_message     text,
  actions_executed  jsonb not null default '[]',
  executed_at       timestamptz not null default now()
);

-- Dedup query: find last run for a (rule, entity) pair efficiently
create index automation_run_log_rule_entity_idx
  on automation_run_log (rule_id, entity_id, executed_at desc);

-- Optional secondary index for querying all runs for a rule (run history UI)
create index automation_run_log_rule_id_idx
  on automation_run_log (rule_id, executed_at desc);

alter table automation_run_log enable row level security;

-- =============================================================================
-- RLS Policies
-- =============================================================================
-- API routes use serverClient() (service role) which bypasses RLS.
-- These policies guard direct authenticated browser client access.
-- Roles: admin, member, viewer — from Clerk JWT via public.get_my_role().
-- =============================================================================

-- ---------------------------------------------------------------------------
-- automation_rules
-- member+ can create and edit rules; admin-only delete
-- ---------------------------------------------------------------------------
create policy "automation_rules_select" on automation_rules
  for select to authenticated using (true);

create policy "automation_rules_insert" on automation_rules
  for insert to authenticated
  with check (public.get_my_role() in ('admin', 'member'));

create policy "automation_rules_update" on automation_rules
  for update to authenticated
  using (public.get_my_role() in ('admin', 'member'))
  with check (public.get_my_role() in ('admin', 'member'));

create policy "automation_rules_delete" on automation_rules
  for delete to authenticated
  using (public.get_my_role() = 'admin');

-- ---------------------------------------------------------------------------
-- automation_run_log
-- admin-only read; no direct insert/update/delete from browser client
-- (all writes go through service role in API routes)
-- ---------------------------------------------------------------------------
create policy "automation_run_log_select" on automation_run_log
  for select to authenticated
  using (public.get_my_role() = 'admin');
