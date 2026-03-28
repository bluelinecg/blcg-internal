# Standardize API Response Contract
**Kanban ID:** 52bf6322-32af-44ec-b739-455cb543ea6a
**Branch:** feature/data-access-contract
**Status:** Done

## Summary

All API routes now return responses exclusively through typed helpers in `lib/api/utils.ts`.
No route uses a bare `NextResponse.json()` for success responses.

### Changes

- **`lib/api/utils.ts`** — Added `apiList<T>(data, total, status?)` helper for paginated
  list endpoints, complementing `apiOk` (single-item) and `apiError`.

- **14 paginated GET routes** — Replaced `NextResponse.json({ data, total, error: null })`
  with `apiList(data, total)`:
  clients, tasks, contacts, organizations, projects, invoices, expenses, proposals,
  catalog, pipelines, pipelines/[id]/items, time-entries, internal/tasks, audit-log.

- **`app/api/emails/route.ts`** — Replaced `NextResponse.json({ data: merged, error: null })`
  with `apiOk(merged)`.

### Intentional exceptions (not changed)

- `app/api/invoices/[id]/pdf/route.ts` — Returns raw PDF buffer, not JSON.
- `app/api/automations/process-scheduled/route.ts` — Cron handler with task-specific payload.

### Verification

- Grepped entire `app/api/` for `NextResponse.json({.*error.*null` → zero matches.
- Response shapes are byte-for-byte identical; only the call site changed.

---

# Enforce Data Access Contract Across Codebase
**Kanban ID:** 9dab08bd-a22e-4742-a0a9-541fb206c646
**Branch:** feature/data-access-contract
**Status:** Done

## Overview

Enforce the rule that all DB queries go through `/lib/db` — no direct `serverClient()` calls
in API routes or other application code.

## Finding

One violation found: `app/api/automations/process-scheduled/route.ts` had two inline DB
query functions (`fetchStageItemsForRule`, `fetchOverdueTasksForRule`) using `serverClient()`
directly. All other routes already complied.

## Changes

- Moved `StageCandidateRow`, `TaskCandidateRow`, `fetchStageItemsForRule`,
  `fetchOverdueTasksForRule` to `lib/db/automations.ts`
- Updated `process-scheduled/route.ts` to import from `@/lib/db/automations`; removed
  direct `serverClient` import
- Added 7 unit tests for the two new db functions in `lib/db/automations.test.ts`

## Verification

- TypeScript: zero errors in changed files
- Grep confirms no `serverClient()` usage outside `lib/db/` in any `.ts` or `.tsx` file

---

# Implement Central Event Bus System
**Kanban ID:** c97ff6d8-3dea-48a2-be01-6c266cea724f
**Branch:** feature/event-bus
**Status:** Planning

## Overview

Create `/lib/events` — a synchronous, in-process pub/sub event bus that serves as the single
dispatch point for all domain events. This replaces the scattered per-route pattern of
manually calling `logAction()`, `dispatchWebhookEvent()`, `runAutomations()`, and
`notifyIfEnabled()` in each API route.

### Current Problem (Before)

Every API route that mutates data manually calls 2–4 side-effect functions:

```typescript
// PATCH /api/tasks/[id]/route.ts — current
void dispatchWebhookEvent('task.status_changed', data);
void runAutomations('task.status_changed', data);
void runAutomations('task.completed', data);
void logAction({ entityType: 'task', entityId, entityLabel, action: 'status_changed' });
```

Each subsystem (audit, webhooks, automations, notifications) is called independently
with no central registry or unified schema.

### After

```typescript
// PATCH /api/tasks/[id]/route.ts — after event bus
void bus.publish('task.status_changed', {
  actorId: user.id,
  actorName: user.fullName ?? user.id,
  entityType: 'task',
  entityId: id,
  entityLabel: task.title,
  action: 'status_changed',
  data: task as Record<string, unknown>,
  metadata: { previousStatus, newStatus: body.status },
});
```

All registered handlers (audit, webhooks, automations, notifications) are invoked
automatically by the bus.

---

## Architecture

```
/lib/events/
  types.ts              EventName union, DomainEventPayload interface
  bus.ts                EventBus class (on, onAny, publish)
  handlers/
    audit.ts            wraps logAction()
    webhooks.ts         wraps dispatchWebhookEvent()
    automations.ts      wraps runAutomations()
    notifications.ts    wraps notifyIfEnabled()
  registry.ts           creates and wires up a singleton bus instance
  index.ts              public exports (bus, types)
```

### EventBus API

```typescript
// Subscribe a handler to a specific event
bus.on(eventName: EventName, handler: EventHandler): void

// Subscribe a handler to ALL events (used by audit and webhooks)
bus.onAny(handler: EventHandler): void

// Publish an event — resolves after all handlers settle (Promise.allSettled)
bus.publish(eventName: EventName, payload: DomainEventPayload): Promise<void>
```

### Event Payload Shape

All events share one payload type:

```typescript
interface DomainEventPayload {
  actorId: string;               // Clerk user ID
  actorName: string;             // User display name
  entityType: AuditEntityType;   // 'contact' | 'task' | 'invoice' | ...
  entityId: string;              // UUID of the entity
  entityLabel: string;           // Human-readable label
  action: AuditAction;           // 'created' | 'updated' | 'deleted' | 'status_changed'
  data: Record<string, unknown>; // Full entity data after mutation
  metadata?: Record<string, unknown>; // Extra context (e.g. previousStatus, newStatus)
}
```

### Handler Routing

| Handler | Registered on | Behaviour |
|---------|--------------|-----------|
| `auditHandler` | `onAny` | Calls `logAction()` for every event |
| `webhooksHandler` | `onAny` | Maps EventName → WebhookEventType; skips unmapped events |
| `automationsHandler` | named events only | Calls `runAutomations()` for trigger events |
| `notificationsHandler` | named events only | Checks `metadata.newStatus` and calls `notifyIfEnabled()` |

---

## Implementation Plan

### Step 1 — Types
- [ ] Create `/lib/events/types.ts`
  - Export `EventName` union (all domain event names)
  - Export `DomainEventPayload` interface
  - Export `EventHandler` type

### Step 2 — EventBus Class
- [ ] Create `/lib/events/bus.ts`
  - `on(event, handler)` — register named handler
  - `onAny(handler)` — register wildcard handler
  - `async publish(event, payload): Promise<void>` — dispatches to all matching handlers via `Promise.allSettled`
  - Errors inside handlers are caught and logged; they never propagate out

### Step 3 — Handlers
- [ ] Create `/lib/events/handlers/audit.ts`
  - Calls `logAction()` — maps `DomainEventPayload` → `LogActionInput`
- [ ] Create `/lib/events/handlers/webhooks.ts`
  - Maps `EventName` → `WebhookEventType`; skips if no mapping
  - Calls `dispatchWebhookEvent(webhookEventType, payload.data)`
- [ ] Create `/lib/events/handlers/automations.ts`
  - Maps `EventName` → `AutomationTriggerType`; skips if not a trigger
  - Calls `runAutomations(triggerType, payload.data)`
- [ ] Create `/lib/events/handlers/notifications.ts`
  - Contains per-event notification logic
  - `proposal.status_changed` + `newStatus === 'accepted'` → `notifyIfEnabled(proposalAccepted)`
  - `invoice.status_changed` + `newStatus === 'paid'` → `notifyIfEnabled(invoicePaid)`
  - `invoice.status_changed` + `newStatus === 'overdue'` → `notifyIfEnabled(invoiceOverdue)`

### Step 4 — Registry
- [ ] Create `/lib/events/registry.ts`
  - Instantiates EventBus
  - Registers all handlers
  - Exports the configured `bus` singleton

### Step 5 — Index
- [ ] Create `/lib/events/index.ts`
  - Re-exports `bus`, `EventName`, `DomainEventPayload`, `EventHandler`

### Step 6 — Route Integration
Replace scattered side-effect calls with `void bus.publish(...)` in:

- [ ] `/api/contacts/route.ts` — POST (contact.created)
- [ ] `/api/contacts/[id]/route.ts` — PATCH (contact.updated), DELETE (contact.deleted)
- [ ] `/api/organizations/route.ts` — POST (organization.created)
- [ ] `/api/organizations/[id]/route.ts` — PATCH (organization.updated), DELETE (organization.deleted)
- [ ] `/api/clients/route.ts` — POST (client.created)
- [ ] `/api/clients/[id]/route.ts` — PATCH (client.updated), DELETE (client.deleted)
- [ ] `/api/projects/route.ts` — POST (project.created)
- [ ] `/api/projects/[id]/route.ts` — PATCH (project.updated), DELETE (project.deleted)
- [ ] `/api/tasks/route.ts` — POST (task.created)
- [ ] `/api/tasks/[id]/route.ts` — PATCH (task.status_changed / task.updated / task.completed), DELETE (task.deleted)
- [ ] `/api/invoices/route.ts` — POST (invoice.created)
- [ ] `/api/invoices/[id]/route.ts` — PATCH (invoice.status_changed / invoice.updated), DELETE (invoice.deleted)
- [ ] `/api/proposals/route.ts` — POST (proposal.created)
- [ ] `/api/proposals/[id]/route.ts` — PATCH (proposal.status_changed / proposal.updated), DELETE (proposal.deleted)
- [ ] `/api/pipelines/[id]/items/route.ts` — POST (pipeline.item_created)
- [ ] `/api/pipelines/[id]/items/[itemId]/route.ts` — PATCH (pipeline.item_stage_changed / pipeline.item_updated), DELETE (pipeline.item_deleted)
- [ ] `/api/expenses/route.ts` — POST (expense.created)
- [ ] `/api/expenses/[id]/route.ts` — PATCH (expense.updated), DELETE (expense.deleted)
- [ ] `/api/time-entries/route.ts` — POST (time_entry.created)
- [ ] `/api/time-entries/[id]/route.ts` — PATCH (time_entry.updated), DELETE (time_entry.deleted)

### Step 7 — Tests
- [ ] `/lib/events/bus.test.ts` — EventBus unit tests
  - subscribe + publish a named event
  - onAny receives all events
  - handler errors are caught, others still run
  - publish resolves after all handlers settle
- [ ] `/lib/events/handlers/audit.test.ts`
- [ ] `/lib/events/handlers/webhooks.test.ts`
- [ ] `/lib/events/handlers/automations.test.ts`
- [ ] `/lib/events/handlers/notifications.test.ts`

---

## Risks & Notes

- **No new dependencies required** — the bus is pure TypeScript, no external packages
- **Backwards-compatible** — routes that aren't updated yet still work (existing direct calls remain until replaced)
- **Serverless safe** — synchronous in-process pattern; no persistent state between requests
- **KI-001** — test infrastructure is broken (69 files fail with ERR_MODULE_NOT_FOUND). Tests will be written but may not run until KI-001 is resolved. Follow existing test file patterns.
- **Task.completed edge case** — currently two separate automation calls (`task.status_changed` AND `task.completed`) fire when a task is marked done. The automations handler will fire both `task.status_changed` and `task.completed` events as two separate publishes from the route.

---

## Definition of Done

- `/lib/events` directory fully implemented and typed
- All 20+ API routes emit events via `bus.publish()`
- No direct calls to `logAction`, `dispatchWebhookEvent`, `runAutomations`, `notifyIfEnabled` remain in routes (they exist only in handlers)
- Tests written for bus + all handlers
- TypeScript: zero new errors
- No `any` types introduced

---

*Previous task notes archived below.*

---

# Mobile Responsiveness Audit & Fixes
**Kanban ID:** 7b88a272-17a7-46d3-b785-bf34a4e24850
**Status:** Done

## Overview

Systematic audit and fix of all pages for mobile screen sizes (375px and 768px breakpoints).
Critical for contractors using the app on-site from a phone or tablet.

The app currently uses **zero responsive Tailwind prefixes** (`sm:`, `md:`, `lg:`) across 95%+
of the codebase. All layouts are desktop-first and hardcoded.

---

## Audit Findings Summary

| Area | Issue | Severity |
|------|-------|----------|
| Sidebar | Fixed `w-64`, no collapse/hamburger | Critical |
| Dashboard Layout | Fixed `h-screen` flex row, no mobile toggle | Critical |
| KanbanBoard | `min-w-52` columns, no mobile view | High |
| All Tables | Fixed multi-column layout, no horizontal scroll hint | High |
| All Grids | `grid-cols-4/3/2` hardcoded, no breakpoint variants | High |
| Fixed-width inputs | `w-64`, `w-56`, `w-48`, `w-44`, `w-40` throughout | High |
| PageShell padding | `px-8 py-6` on all pages, no mobile reduction | Medium |
| PageHeader | `justify-between` with no mobile stack | Medium |
| Modals | Fixed `max-w` sizes, no full-screen on mobile | Medium |
| Viewport meta tag | Missing explicit definition in `app/layout.tsx` | Low |

---

## Implementation Plan

### Phase 1 — Layout Foundation (do first — everything else depends on this)

- [x] **1.1 Add viewport meta tag** — `app/layout.tsx`
  - Export `viewport` metadata with `width=device-width, initial-scale=1`

- [x] **1.2 Responsive Sidebar** — `components/layout/Sidebar.tsx` + `app/(dashboard)/layout.tsx`
  - On mobile (<768px): sidebar hidden by default, opened via hamburger toggle
  - State lives in the dashboard layout (toggle button in TopNav)
  - Sidebar slides in as a drawer overlay on mobile; fixed sidebar on desktop
  - Close on route change or backdrop click

- [x] **1.3 Responsive TopNav** — `components/layout/TopNav.tsx`
  - Add hamburger icon (left side) visible only on mobile
  - Reduce horizontal padding: `px-4 md:px-6`

- [x] **1.4 Responsive PageShell** — `components/layout/PageShell.tsx`
  - Padding: `px-4 py-4 md:px-8 md:py-6`

- [x] **1.5 Responsive PageHeader** — `components/layout/PageHeader.tsx`
  - Stack on mobile: `flex-col gap-3 sm:flex-row sm:items-start sm:justify-between`
  - Actions row wraps to second line on small screens

---

### Phase 2 — Priority Pages

- [x] **2.1 Tasks Kanban** — `app/(dashboard)/tasks/page.tsx` + `components/ui/KanbanBoard.tsx`
  - **Mobile UX (confirmed): Option A — tab/column switcher on phones (<768px)**
  - One column visible at a time; tabs across the top to switch columns
  - Horizontal scroll acceptable for tablet (768px+)
  - Filter selects: stack vertically on mobile (`flex-col sm:flex-row`)
  - Remove fixed `w-56` / `w-40` on filter selects; use `w-full sm:w-56`

- [x] **2.2 Client Detail** — `components/modules/ClientDetailView.tsx`
  - Main grid: `grid-cols-1 md:grid-cols-3`
  - Inner 2-col card: `grid-cols-1 sm:grid-cols-2`
  - Action buttons: wrap on small screens (`flex-wrap`)

- [x] **2.3 Finances (Invoices & Expenses)** — `app/(dashboard)/finances/page.tsx`
  - Stat cards: `grid-cols-2 md:grid-cols-4`
  - Overview 2-col cards: `grid-cols-1 md:grid-cols-2`
  - Search/filter bar: `flex-col sm:flex-row`, inputs `w-full sm:w-64`
  - Tables: wrap in `overflow-x-auto` container

- [x] **2.4 Proposals** — `app/(dashboard)/proposals/page.tsx`
  - Stat pills row: `flex-wrap`; `min-w-32` stays, but wrap is allowed
  - Search/filter: `flex-col sm:flex-row`, inputs `w-full sm:w-72`
  - Table: wrap in `overflow-x-auto`

- [x] **2.5 Dashboard overview** — `app/(dashboard)/dashboard/page.tsx`
  - Stat card grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
  - Any 2-col secondary grids: `grid-cols-1 md:grid-cols-2`

---

### Phase 3 — Remaining Pages

- [x] **3.1 Clients list** — `app/(dashboard)/clients/page.tsx`
  - Filter bar: `flex-col sm:flex-row sm:items-center`; inputs `w-full sm:w-{n}`; table wrapped in `overflow-x-auto`

- [x] **3.2 Contacts list** — `app/(dashboard)/contacts/page.tsx`
  - Same table + filter treatment as clients

- [x] **3.3 Organizations list** — `app/(dashboard)/organizations/page.tsx`
  - Search input `w-full sm:w-72`; table wrapped in `overflow-x-auto`

- [x] **3.4 Projects list** — `app/(dashboard)/projects/page.tsx`
  - Summary row: `flex-wrap`; filter bar stacks; inputs `w-full sm:w-{n}`; table `overflow-x-auto`

- [x] **3.4 Projects detail** — `app/(dashboard)/projects/[id]/page.tsx`
  - Stat grid: `grid-cols-2 md:grid-cols-4`; milestone table `overflow-x-auto`; linked records `grid-cols-1 md:grid-cols-2`

- [x] **3.5 Pipelines list + board** — `app/(dashboard)/pipelines/[id]/page.tsx`
  - List page already had `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` — no changes needed
  - Detail header: `flex-col sm:flex-row sm:justify-between`; action buttons `flex-wrap`

- [x] **3.6 Automations** — `app/(dashboard)/automations/page.client.tsx`
  - RuleDetails expanded panel grid: `grid-cols-1 sm:grid-cols-2`; execution history table `overflow-x-auto`

- [x] **3.7 Settings** — `app/(dashboard)/settings/page.tsx`
  - Profile first/last name grid: `grid-cols-1 sm:grid-cols-2`
  - Webhooks header: `flex-col sm:flex-row sm:justify-between`
  - Endpoint list table and delivery log table: both wrapped in `overflow-x-auto`

---

### Phase 4 — UI Component Hardening

- [x] **4.1 Modal** — `components/ui/Modal.tsx`
  - Already correct: `w-full` + outer `p-4` on the container provides `mx-4` margin on all screen sizes. No additional change needed.

- [x] **4.2 ExpandableTable** — `components/ui/ExpandableTable.tsx`
  - Wrapped `<table>` in `<div className="overflow-x-auto">`
  - Fixed `ProposalLineItemsPanel` in `proposals/page.tsx`: `flex flex-col md:flex-row gap-8`, sidebar `w-full md:w-56`

- [x] **4.3 StatCard** — `components/ui/StatCard.tsx`
  - Value font: `text-2xl md:text-3xl`

---

## Verification Plan

For each phase:
- Test at 375px (iPhone SE — minimum target)
- Test at 768px (iPad — tablet target)
- Test at 1280px (desktop — must not regress)
- Check: no horizontal scroll on the body at 375px (except intentional Kanban scroll)
- Check: no truncated text or clipped buttons
- Check: all interactive targets ≥ 44px touch area

---

## Risks & Notes

- **KanbanBoard mobile UX is a design decision** — horizontal scroll vs. single-column stacked.
  Recommend single-column with column switcher (tabs or segmented control) for phones.
  Horizontal scroll is acceptable for tablet (768px).

- **Sidebar drawer** requires a small piece of client-side state. The dashboard layout already
  uses a server component wrapper — the toggle will need to be a `'use client'` component
  or the layout wrapper converted to client.

- **No new dependencies needed** — Tailwind v4 breakpoints are already available.

- Work orders page does not exist yet — skip for this task.

---

## Files to Change

**Phase 1:** `app/layout.tsx`, `components/layout/Sidebar.tsx`, `app/(dashboard)/layout.tsx`, `components/layout/TopNav.tsx`, `components/layout/PageShell.tsx`, `components/layout/PageHeader.tsx`

**Phase 2:** `app/(dashboard)/tasks/page.tsx`, `components/ui/KanbanBoard.tsx`, `components/modules/ClientDetailView.tsx`, `app/(dashboard)/finances/page.tsx`, `app/(dashboard)/proposals/page.tsx`, `app/(dashboard)/dashboard/page.tsx`

**Phase 3:** `app/(dashboard)/clients/page.tsx`, `app/(dashboard)/contacts/page.tsx`, `app/(dashboard)/organizations/page.tsx`, `app/(dashboard)/projects/[id]/page.tsx`, `app/(dashboard)/pipelines/[id]/page.tsx`, `app/(dashboard)/automations/page.tsx`, `app/(dashboard)/settings/page.tsx`

**Phase 4:** `components/ui/Modal.tsx`, `components/ui/ExpandableTable.tsx`, `components/ui/StatCard.tsx`

---

*Previous task notes archived below.*

---

# PDF Document Generation

## Status: Complete

## Overview
Implemented branded PDF generation for proposals and invoices using `@react-pdf/renderer`.
Supports direct download and email delivery via Gmail attachment.

## Library Choice: @react-pdf/renderer
Selected over Puppeteer because it is serverless-compatible (no Chromium binary required),
pure React component approach, and TypeScript-friendly. Vercel-safe.

## What Was Built

### PDF Templates
- `lib/pdf/styles.ts` — Shared brand styles: BLCG navy/blue/steel palette, typography, table layout
- `lib/pdf/proposal-template.tsx` — Proposal PDF: header, meta row, bill-to, situation, line items, totals, agreement fields, footer
- `lib/pdf/invoice-template.tsx` — Invoice PDF: header, meta row, bill-to, line items with isIncluded support, totals (subtotal/tax/deposit/balance), footer

### API Routes
- `app/api/proposals/[id]/pdf` — GET returns `application/pdf` inline download
- `app/api/invoices/[id]/pdf` — GET returns `application/pdf` inline download
- `app/api/proposals/[id]/send` — POST generates PDF, sends via Gmail as `multipart/mixed` attachment
- `app/api/invoices/[id]/send` — POST generates PDF, sends via Gmail as `multipart/mixed` attachment

### UI
- Proposals page: **PDF** button (opens in new tab) + **Send** button (modal with from/to/cc/subject/body)
- Finances page (Invoices tab): same PDF + Send buttons per invoice row

### Tests
- 22 unit tests covering auth guards, 404 handling, PDF headers, Gmail send call, and MIME encoding
- All 4 test files pass

## Files Changed
- `package.json` — added `@react-pdf/renderer`
- `lib/pdf/styles.ts` — NEW
- `lib/pdf/proposal-template.tsx` — NEW
- `lib/pdf/invoice-template.tsx` — NEW
- `app/api/proposals/[id]/pdf/route.ts` — NEW
- `app/api/proposals/[id]/pdf/route.test.ts` — NEW
- `app/api/proposals/[id]/send/route.ts` — NEW
- `app/api/proposals/[id]/send/route.test.ts` — NEW
- `app/api/invoices/[id]/pdf/route.ts` — NEW
- `app/api/invoices/[id]/pdf/route.test.ts` — NEW
- `app/api/invoices/[id]/send/route.ts` — NEW
- `app/api/invoices/[id]/send/route.test.ts` — NEW
- `app/(dashboard)/proposals/page.tsx` — added PDF/Send buttons + SendPdfModal
- `app/(dashboard)/finances/page.tsx` — added PDF/Send buttons + SendInvoicePdfModal

## Key Decisions
- Used `eslint-disable @typescript-eslint/no-explicit-any` on `React.createElement()` call to
  `renderToBuffer` — required because the @react-pdf/renderer JSX element type is not compatible
  with standard `React.ReactElement`; this is a known library type gap, not a logic issue.
- MIME attachment built manually (same approach as `/api/emails/send`) to avoid adding another
  email library dependency. Base64 split into 76-char lines per RFC 2045.

## Verification
- TypeScript: zero errors in new files
- Tests: 22/22 pass
- Send modal: pre-populated subject/body, success feedback, 1500ms auto-close
