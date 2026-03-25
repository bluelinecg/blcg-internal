-- =============================================================================
-- Tasks: schema fixes, sort_order, backlog seed
-- Migration: 20260326000000_tasks_schema_and_sort_order
-- =============================================================================
-- 1. Add missing task columns (exist in live DB, absent from initial migration)
-- 2. Fix tasks.status CHECK constraint to include 'backlog'
-- 3. Add sort_order column for explicit per-column card ordering
-- 4. Set sort_order on all existing tasks (by roadmap phase)
-- 5. Insert 22 net-new backlog tasks from the platform audit
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add missing columns (safe to run on existing or fresh DBs)
-- ---------------------------------------------------------------------------

alter table tasks
  add column if not exists recurrence text not null default 'none'
    check (recurrence in ('none', 'daily', 'weekly', 'biweekly', 'monthly'));

alter table tasks
  add column if not exists checklist jsonb not null default '[]';

alter table tasks
  add column if not exists blocked_by uuid[] not null default '{}';

-- ---------------------------------------------------------------------------
-- 2. Fix tasks.status CHECK constraint — add 'backlog'
--    The initial schema omitted 'backlog' from the allowed values.
--    Drop and recreate; IF NOT EXISTS guards make this idempotent.
-- ---------------------------------------------------------------------------

alter table tasks drop constraint if exists tasks_status_check;

alter table tasks
  add constraint tasks_status_check
    check (status in ('backlog', 'todo', 'in_progress', 'in_review', 'done'));

-- ---------------------------------------------------------------------------
-- 3. Add sort_order column
-- ---------------------------------------------------------------------------

alter table tasks
  add column if not exists sort_order integer not null default 0;

-- Composite index for efficient per-column ordered queries
create index if not exists tasks_status_sort_order_idx
  on tasks (status, sort_order);

-- ---------------------------------------------------------------------------
-- 4. Set sort_order on existing tasks
--    Backlog: ordered by roadmap phase (Phase 1 = 1–6, Phase 2 = 7–13, etc.)
--    Todo:    ordered by business priority
--    Done:    left at 0 (ordering not meaningful for completed work)
-- ---------------------------------------------------------------------------

-- Backlog — existing tasks
update tasks set sort_order = 3  where id = '9be9ad67-4aed-4a3b-82f4-8d338712df2f'; -- Wire automations → proposals/invoices
update tasks set sort_order = 4  where id = '94191105-4714-4d60-8dc3-7922b8e010a6'; -- Wire preference-based notifications
update tasks set sort_order = 6  where id = 'f3d7901a-ee89-4154-b1c6-7395cef45d68'; -- Dashboard Wiring
update tasks set sort_order = 13 where id = '019c66cc-cfa0-45fa-af9e-9b2e8163739c'; -- Pagination / SortableHeader tests
update tasks set sort_order = 20 where id = '8a09861f-6c07-4125-a5c7-7365f6b80e93'; -- Unified Integration Framework
update tasks set sort_order = 21 where id = '58ec07f9-ac61-4555-9d0d-b57d009f6e97'; -- File Storage
update tasks set sort_order = 22 where id = '7c82ca69-1fe4-48dc-b7eb-cd4fd8920cbb'; -- Payments (Stripe / QuickBooks)
update tasks set sort_order = 24 where id = '3fc61d10-ae38-4521-9478-daa1ea5c1bbf'; -- Calendar Integration
update tasks set sort_order = 25 where id = 'b81234a6-c8f9-4480-b249-fda3902c6ebb'; -- SMS & Email
update tasks set sort_order = 26 where id = 'e153e536-403e-4604-8a13-e23154661043'; -- Dynamic Form Builder
update tasks set sort_order = 29 where id = '83489e54-b247-4241-8478-205fd32ab2c4'; -- Reporting & Dashboard
update tasks set sort_order = 30 where id = '2fea2639-9126-403a-b828-3091dbac60e7'; -- Marketing Module
update tasks set sort_order = 35 where id = '86154c95-ed82-4780-9e63-fec3512d4b33'; -- Agentic Workflow
update tasks set sort_order = 36 where id = '949a9ce8-0946-44c6-ac55-c693c885b97f'; -- Agent / MCP Architecture

-- Todo — existing tasks
update tasks set sort_order = 1 where id = 'aa1a1290-959b-4090-82d8-be3b33dcc721'; -- Finalize Service Offerings
update tasks set sort_order = 2 where id = 'ae1847b0-0c00-4d8a-ba70-cd92ab23f199'; -- Update Bluelinecg.com
update tasks set sort_order = 3 where id = 'bed5eddc-2933-4591-95fd-0feaa9b05cc3'; -- Automate New Client Intake
update tasks set sort_order = 4 where id = 'a5a51799-e71a-4b1c-8ed0-5e3f8d604aaf'; -- Automate Market Research & Discovery
update tasks set sort_order = 5 where id = '0679f2f9-5296-4a85-9125-0cdc033662f0'; -- Create Industry Specific Templates
update tasks set sort_order = 6 where id = '9b224ed4-afa4-4cc3-ae0a-c881eb9d3b13'; -- Create Training Module
update tasks set sort_order = 7 where id = 'cc9de89e-df6d-4050-b337-8a12db34da01'; -- Update Claude Skills/Roles

-- ---------------------------------------------------------------------------
-- 5. Insert 22 net-new backlog tasks (platform audit — 2026-03-26)
--    Gaps in sort_order are intentional — room to insert between phases.
-- ---------------------------------------------------------------------------

insert into tasks (title, description, status, priority, sort_order, recurrence, checklist, blocked_by)
values

-- ----- Phase 1: Foundation Hardening (slots 1–6) -----

(
  'Write Missing DB Migrations',
  'Create a migration file for 8 tables that exist in live Supabase but have no CREATE TABLE statement in the repo: contacts, organizations, audit_log, pipelines, pipeline_stages, pipeline_items, webhook_endpoints, webhook_deliveries. Required for repo reproducibility — a fresh DB setup currently fails completely without these.',
  'backlog', 'high', 1, 'none', '[]', '{}'
),
(
  'Fix Schema Mismatches — Projects',
  'Add ''planning'' to the ProjectStatus type and Zod schema. The DB projects.status CHECK already includes ''planning'' but lib/types/projects.ts and lib/validations/projects.ts do not, causing a TypeScript/runtime mismatch. Also add projects.completed_date (date) column to the schema and type.',
  'backlog', 'high', 2, 'none', '[]', '{}'
),
(
  'Webhooks Detail Route — Add GET + PATCH',
  'app/api/webhooks/endpoints/[id]/route.ts currently only has a DELETE handler. Add GET (return the endpoint config) and PATCH (update url, events, is_active) so admins can view and edit webhook endpoints after creation. Follow the pattern used in other [id] detail routes.',
  'backlog', 'high', 5, 'none', '[]', '{}'
),

-- ----- Phase 2: Module Completion (slots 7–13) -----

(
  'Contact Detail Page',
  'Create /contacts/[id]/page.tsx with a full profile view: contact name, email, phone, linked organization, associated proposals, tasks, and communication history. Follow the pattern established by the client detail page (/clients/[id]).',
  'backlog', 'medium', 7, 'none', '[]', '{}'
),
(
  'Organization Detail Page',
  'Create /organizations/[id]/page.tsx showing the org profile, associated contacts, linked clients, active projects, and open proposals. Follow the pattern established by the client detail page (/clients/[id]).',
  'backlog', 'medium', 8, 'none', '[]', '{}'
),
(
  'Finance Overview Tab — KPI Cards',
  'The Finance Overview tab (first tab on /finances) is currently empty. Replace it with aggregated KPI cards: total revenue (sum of paid invoices), outstanding balance (sum of sent/viewed invoices), total expenses, and net profit/loss. Include a date range filter. All data is available from existing /api/invoices and /api/expenses endpoints.',
  'backlog', 'medium', 9, 'none', '[]', '{}'
),
(
  'Automations — Execution History UI',
  'The automation run log API (GET /api/automations/runs) already exists but is not surfaced in the UI. Add an Execution History tab or collapsible panel to the /automations page showing: rule name, last triggered at, success/fail status, and a trigger payload summary for each run.',
  'backlog', 'medium', 10, 'none', '[]', '{}'
),
(
  'Increase API Test Coverage to 80%',
  'Current API test coverage is approximately 22% — only ~10 of 46 routes have test files. Write tests for: clients, projects, invoices, contacts, organizations, expenses, pipelines, webhooks, email, and users routes. Follow the pattern established in app/api/tasks/[id]/route.test.ts and the existing automation tests.',
  'backlog', 'medium', 11, 'none', '[]', '{}'
),
(
  'Skeleton Loading States',
  'All list pages currently show a full-page <Spinner> while data loads, which blocks the entire layout. Replace with Tailwind animate-pulse skeleton screens on: clients, projects, tasks, invoices, expenses, contacts, organizations, pipelines, automations, and notifications pages. Match the column/card layout of each page.',
  'backlog', 'low', 12, 'none', '[]', '{}'
),

-- ----- Phase 3: New Universal Modules (slots 14–19) -----

(
  'Time Tracking Module',
  'Build a time tracking module to log billable and non-billable hours against projects and tasks. Include a weekly timesheet view, hours-by-project summary, and billable vs. non-billable breakdown. Time entries should feed into invoice line item generation. DB: time_entries table (user_id, project_id, task_id, hours, date, description, is_billable).',
  'backlog', 'high', 14, 'none', '[]', '{}'
),
(
  'Product & Service Catalog',
  'Create a catalog of standard services and products with default pricing. Catalog items are selectable as line item presets when building proposals and invoices, eliminating manual re-entry of recurring services. DB: catalog_items table (name, description, unit_price, category, is_active). UI: /catalog list + CRUD modal, and a line item picker in proposal/invoice forms.',
  'backlog', 'high', 15, 'none', '[]', '{}'
),
(
  'PDF Document Generation',
  'Generate branded PDF output from proposals, invoices, and contract templates. Support download and email delivery. All data already exists — this is purely a rendering layer. Evaluate @react-pdf/renderer or Puppeteer. Output should be branded with logo, address, and consistent typography matching the app design.',
  'backlog', 'high', 16, 'none', '[]', '{}'
),
(
  'Client Portal',
  'Build an external-facing authenticated view for clients. Clients log in via a separate auth path (not internal staff Clerk org) and can see: their active projects and milestones, outstanding invoices (with pay button once Stripe is integrated), proposal status, and documents requiring signature. Fully read-only for clients; no access to internal data.',
  'backlog', 'high', 17, 'none', '[]', '{}'
),
(
  'Global Search',
  'Add a cross-entity search bar to the top nav. Searches simultaneously across clients, contacts, organizations, proposals, projects, tasks, and invoices. Returns grouped results by entity type with a link to each record. Keyboard shortcut (Cmd/Ctrl+K) to open. Implementation: Supabase full-text search (to_tsvector) or ILIKE across key name/title fields.',
  'backlog', 'medium', 18, 'none', '[]', '{}'
),
(
  'Recurring Billing',
  'Define recurring invoice schedules for retainer clients. Specify client, amount, line items, and frequency (monthly/quarterly/annual). On schedule, auto-generate invoice records and trigger notifications. Builds on the existing Vercel cron + automation infrastructure. DB: recurring_billing table (client_id, amount, frequency, next_run_at, last_run_at, is_active).',
  'backlog', 'medium', 19, 'none', '[]', '{}'
),

-- ----- Phase 4: Integrations & Common Modules (slots 23, 27–28) -----

(
  'Scheduling & Appointments Module',
  'Book appointments with staff availability management. Staff define availability windows; internal or client users book time slots. Calendar view with day/week layout. Optional client self-booking link (unique URL per staff member). DB: appointments, availability_slots tables. Integrates with the Calendar Integration (Google/Outlook) module.',
  'backlog', 'medium', 23, 'none', '[]', '{}'
),
(
  'Vendor & Supplier Management',
  'Track vendor contacts, payment terms, and purchase history. Link vendors to expenses and purchase orders. Foundation for the Purchase Orders module. DB: vendors table (name, contact_name, email, phone, payment_terms, notes, is_active). UI: /vendors list + detail page with linked expenses.',
  'backlog', 'low', 27, 'none', '[]', '{}'
),
(
  'Purchase Orders',
  'Create purchase orders for materials and services from vendors. Track fulfillment status and link to project expenses. Depends on Vendor & Supplier Management being complete. DB: purchase_orders, purchase_order_line_items tables. UI: /purchase-orders list with status workflow (draft → sent → partially_received → received).',
  'backlog', 'low', 28, 'none', '[]', '{}'
),

-- ----- Phase 5: Reporting, Industry & QoL (slots 31–34) -----

(
  'Inventory Management',
  'Track materials, products, and stock levels. Link inventory items to projects and expenses. Alert when stock falls below reorder point. Applicable to contractor and retail clients. DB: inventory_items table (name, sku, quantity_on_hand, reorder_point, unit_cost, supplier_id). UI: /inventory list with stock level indicators and low-stock alerts.',
  'backlog', 'medium', 31, 'none', '[]', '{}'
),
(
  'Job / Work Orders',
  'Create and dispatch field jobs for contractor use cases. Track job status, parts used, hours worked, and field notes. Mobile-optimized card layout for field workers. DB: work_orders table linked to clients and projects. UI: /work-orders list with status workflow (scheduled → in_progress → completed) and a mobile-friendly detail view.',
  'backlog', 'medium', 32, 'none', '[]', '{}'
),
(
  'Bulk Actions on List Pages',
  'Add select-all checkbox and a floating bulk action bar to all list pages. Actions: bulk export (CSV), bulk delete, and bulk status change. Applies to: clients, contacts, organizations, proposals, projects, invoices, expenses, tasks, and pipelines. Consistent UI pattern: checkbox column left of each row, action bar appears at bottom on selection.',
  'backlog', 'low', 33, 'none', '[]', '{}'
),
(
  'Mobile Responsiveness Audit & Fixes',
  'Systematic review and fix of all pages for mobile screen sizes (375px and 768px breakpoints). Critical for contractors using the app on-site from a phone or tablet. Audit each page, document layout issues, and implement fixes. Priority pages: tasks kanban, work orders, client detail, invoice view, and the top nav.',
  'backlog', 'medium', 34, 'none', '[]', '{}'
);
