-- =============================================================================
-- Time Tracking: time_entries table
-- Migration: 20260327000000_time_tracking_schema
-- =============================================================================

create table time_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  project_id  uuid references projects(id) on delete set null,
  task_id     uuid references tasks(id) on delete set null,
  hours       numeric(6,2) not null check (hours > 0 and hours <= 24),
  date        date not null,
  description text not null,
  is_billable boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index time_entries_user_id_idx on time_entries(user_id);
create index time_entries_project_id_idx on time_entries(project_id);
create index time_entries_date_idx on time_entries(date);

create trigger time_entries_updated_at
  before update on time_entries
  for each row execute function set_updated_at();

alter table time_entries enable row level security;
