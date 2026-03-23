-- =============================================================================
-- BLCG Internal — Initial Schema
-- Migration: 20260322000000_initial_schema
-- =============================================================================
-- All tables have RLS enabled with no permissive policies.
-- The service role key (used exclusively in API routes) bypasses RLS.
-- Anon and authenticated roles are denied by default.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helper: updated_at trigger function
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
create table clients (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  contact_name    text not null,
  contact_title   text,
  email           text not null,
  phone           text,
  industry        text,
  address         text,
  website         text,
  referred_by     text,
  status          text not null default 'active'
                    check (status in ('active', 'inactive', 'prospect')),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger clients_updated_at
  before update on clients
  for each row execute function set_updated_at();

alter table clients enable row level security;

-- ---------------------------------------------------------------------------
-- proposals
-- ---------------------------------------------------------------------------
create table proposals (
  id                            uuid primary key default gen_random_uuid(),
  client_id                     uuid not null references clients(id),
  proposal_number               text not null unique,     -- BL-YYYY-NNN
  title                         text not null,
  status                        text not null default 'draft'
                                  check (status in ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired')),
  situation                     text,                     -- single free-text field describing client situation
  total_value                   numeric(12, 2) not null default 0,
  deposit_amount                numeric(12, 2),
  -- agreement fields (accepted proposal = signed agreement)
  agreement_signed_at           timestamptz,
  agreement_start_date          date,
  agreement_estimated_end_date  date,
  governing_state               text,
  notes                         text,
  sent_at                       timestamptz,
  expires_at                    timestamptz,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

create index proposals_client_id_idx on proposals(client_id);
create index proposals_status_idx on proposals(status);

create trigger proposals_updated_at
  before update on proposals
  for each row execute function set_updated_at();

alter table proposals enable row level security;

-- ---------------------------------------------------------------------------
-- proposal_line_items
-- ---------------------------------------------------------------------------
create table proposal_line_items (
  id           uuid primary key default gen_random_uuid(),
  proposal_id  uuid not null references proposals(id) on delete cascade,
  description  text not null,
  quantity     numeric(10, 2) not null default 1,
  unit_price   numeric(12, 2) not null default 0,
  total        numeric(12, 2) not null default 0,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create index proposal_line_items_proposal_id_idx on proposal_line_items(proposal_id);

alter table proposal_line_items enable row level security;

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table projects (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients(id),
  proposal_id  uuid references proposals(id),
  name         text not null,
  description  text,
  status       text not null default 'planning'
                 check (status in ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  start_date   date,
  end_date     date,
  budget       numeric(12, 2),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index projects_client_id_idx on projects(client_id);
create index projects_status_idx on projects(status);

create trigger projects_updated_at
  before update on projects
  for each row execute function set_updated_at();

alter table projects enable row level security;

-- ---------------------------------------------------------------------------
-- milestones
-- ---------------------------------------------------------------------------
create table milestones (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  title       text not null,
  description text,
  status      text not null default 'pending'
                check (status in ('pending', 'in_progress', 'completed', 'blocked')),
  due_date    date,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index milestones_project_id_idx on milestones(project_id);

create trigger milestones_updated_at
  before update on milestones
  for each row execute function set_updated_at();

alter table milestones enable row level security;

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create table tasks (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references projects(id),
  client_id    uuid references clients(id),
  title        text not null,
  description  text,
  status       text not null default 'todo'
                 check (status in ('todo', 'in_progress', 'in_review', 'done')),
  priority     text not null default 'medium'
                 check (priority in ('low', 'medium', 'high', 'urgent')),
  assignee_id  text,   -- Clerk user ID; foreign key enforced at app layer
  due_date     date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index tasks_project_id_idx on tasks(project_id);
create index tasks_status_idx on tasks(status);

create trigger tasks_updated_at
  before update on tasks
  for each row execute function set_updated_at();

alter table tasks enable row level security;

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------
create table invoices (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id),
  project_id      uuid references projects(id),
  proposal_id     uuid references proposals(id),  -- Agreement # reference (BL-YYYY-NNN)
  invoice_number  text not null unique,            -- BL-YYYY-NNN (separate sequence from proposals)
  status          text not null default 'draft'
                    check (status in ('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled')),
  subtotal        numeric(12, 2) not null default 0,
  tax             numeric(12, 2) not null default 0,
  total           numeric(12, 2) not null default 0,
  deposit_amount  numeric(12, 2),
  balance_due     numeric(12, 2),
  payment_terms   text not null default 'Net 15',
  payment_method  text check (payment_method in ('ach', 'check', 'credit_card')),
  due_date        timestamptz not null,
  paid_date       timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index invoices_client_id_idx on invoices(client_id);
create index invoices_status_idx on invoices(status);
create index invoices_proposal_id_idx on invoices(proposal_id);

create trigger invoices_updated_at
  before update on invoices
  for each row execute function set_updated_at();

alter table invoices enable row level security;

-- ---------------------------------------------------------------------------
-- invoice_line_items
-- ---------------------------------------------------------------------------
create table invoice_line_items (
  id               uuid primary key default gen_random_uuid(),
  invoice_id       uuid not null references invoices(id) on delete cascade,
  description      text not null,
  sub_description  text,                          -- optional detail line below main description
  quantity         numeric(10, 2),                -- nullable: flat-fee lines have no qty
  unit_price       numeric(12, 2),                -- nullable: flat-fee lines have no unit price
  total            numeric(12, 2) not null default 0,
  is_included      boolean not null default false, -- true = included in package, shown as $0
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now()
);

create index invoice_line_items_invoice_id_idx on invoice_line_items(invoice_id);

alter table invoice_line_items enable row level security;

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------
create table expenses (
  id           uuid primary key default gen_random_uuid(),
  description  text not null,
  category     text not null
                 check (category in ('software', 'contractors', 'marketing', 'equipment', 'travel', 'office', 'other')),
  amount       numeric(12, 2) not null,
  project_id   uuid references projects(id),
  vendor       text,
  date         timestamptz not null,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index expenses_project_id_idx on expenses(project_id);

create trigger expenses_updated_at
  before update on expenses
  for each row execute function set_updated_at();

alter table expenses enable row level security;

-- =============================================================================
-- RLS summary
-- All tables: RLS enabled, no permissive policies.
-- Anon/authenticated roles → denied by default.
-- Service role → bypasses RLS (used exclusively in /app/api routes).
-- =============================================================================
