# Mobile Responsiveness Audit & Fixes
**Kanban ID:** 7b88a272-17a7-46d3-b785-bf34a4e24850
**Status:** Planning

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

- [ ] **4.1 Modal** — `components/ui/Modal.tsx`
  - All sizes: add `w-full mx-4` on mobile so modals don't clip viewport

- [ ] **4.2 ExpandableTable** — `components/ui/ExpandableTable.tsx`
  - Wrap in `overflow-x-auto` by default
  - Expanded detail panel: `flex-col md:flex-row` instead of fixed `flex gap-8`

- [ ] **4.3 StatCard** — `components/ui/StatCard.tsx`
  - Value font: `text-2xl md:text-3xl` to prevent overflow on small screens

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
