# Kanban Sort Order & Backlog Cleanup

## Status: Complete — Pending DB Migration Run

## Overview
Add `sort_order` per-column ordering to the tasks table so the kanban board reflects the
agreed roadmap priority. Insert 22 net-new backlog tasks from the 2026-03-26 platform audit.
Fix the `tasks.status` CHECK constraint to include `'backlog'` (was missing from initial schema).

## Changes Delivered

### DB Migration — `supabase/migrations/20260326000000_tasks_schema_and_sort_order.sql`
- `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence / checklist / blocked_by` — adds missing columns for fresh-DB reproducibility
- `ALTER TABLE tasks DROP CONSTRAINT tasks_status_check` + re-add with `'backlog'` included
- `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order integer not null default 0`
- `CREATE INDEX tasks_status_sort_order_idx ON tasks (status, sort_order)`
- `UPDATE` statements setting sort_order on all 21 existing non-done tasks (backlog + todo)
- `INSERT` of 22 new backlog tasks, ordered by roadmap phase (sort_order gaps left between phases)

### Code Changes
- `lib/types/tasks.ts` — `sortOrder: number` added to `Task` interface
- `lib/validations/tasks.ts` — `sortOrder: z.number().int().min(0).optional()` added to `TaskSchema`
- `lib/db/tasks.ts` — `sort_order` in `TaskRow`, `fromRow`, `toInsert`, and `updateTask` patch builder
- `app/(dashboard)/tasks/page.tsx` — `filtered` sorted by `sortOrder ASC` before render; `#N` badge shown on each card when `sortOrder > 0`
- `lib/mock/tasks.ts` — `sortOrder: 0` added to all 12 mock task fixtures
- `tests/helpers/factories.ts` — `sortOrder: 0` added to `createMockTask` default
- `lib/db/tasks.test.ts` — `sortOrder: 0` added to `RECURRING_TASK` fixture
- `components/modules/TaskFormModal.tsx` — `sortOrder: 0` added to `DEFAULTS`

## Action Required
- [ ] Run migration in Supabase dashboard: paste contents of `20260326000000_tasks_schema_and_sort_order.sql`

## Verification
- [ ] Backlog column cards render in sort_order sequence (1, 2, 3 …) with `#N` badge visible
- [ ] Todo column cards render in sort_order sequence (1–7)
- [ ] 22 new tasks appear in backlog at correct positions
- [ ] `npx tsc --noEmit` passes (no new errors introduced)
- [ ] `npx jest` passes

## Sort Order Map (Backlog)

| # | Task | Phase |
|---|------|-------|
| 1 | Write Missing DB Migrations | P1 |
| 2 | Fix Schema Mismatches — Projects | P1 |
| 3 | Wire automation engine to proposals/invoices | P1 |
| 4 | Wire preference-based notifications | P1 |
| 5 | Webhooks Detail Route — GET + PATCH | P1 |
| 6 | Dashboard Wiring | P1 |
| 7 | Contact Detail Page | P2 |
| 8 | Organization Detail Page | P2 |
| 9 | Finance Overview Tab — KPI Cards | P2 |
| 10 | Automations — Execution History UI | P2 |
| 11 | Increase API Test Coverage to 80% | P2 |
| 12 | Skeleton Loading States | P2 |
| 13 | Pagination / SortableHeader Tests | P2 |
| 14 | Time Tracking Module | P3 |
| 15 | Product & Service Catalog | P3 |
| 16 | PDF Document Generation | P3 |
| 17 | Client Portal | P3 |
| 18 | Global Search | P3 |
| 19 | Recurring Billing | P3 |
| 20 | Unified Integration Framework | P4 |
| 21 | File Storage (S3 / Drive) | P4 |
| 22 | Payments (Stripe / QuickBooks) | P4 |
| 23 | Scheduling & Appointments Module | P4 |
| 24 | Calendar Integration | P4 |
| 25 | SMS & Email (Twilio / SendGrid) | P4 |
| 26 | Dynamic Form Builder | P4 |
| 27 | Vendor & Supplier Management | P4 |
| 28 | Purchase Orders | P4 |
| 29 | Reporting & Dashboard System | P5 |
| 30 | Marketing Module | P5 |
| 31 | Inventory Management | P5 |
| 32 | Job / Work Orders | P5 |
| 33 | Bulk Actions on List Pages | P5 |
| 34 | Mobile Responsiveness Audit | P5 |
| 35 | Agentic Workflow (Dev + Review Agents) | P5 |
| 36 | Agent / MCP Architecture | P5 |
