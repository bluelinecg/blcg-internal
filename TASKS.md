# BLCG Internal — Build Status & Task Tracker

**Live URL**: https://admin.bluelinecg.com
**Repo**: github.com/bluelinecg/blcg-internal
**Current branch**: feature/rbac (ready to merge)

---

## Current status

**Phase**: Core application complete. Gmail integration live. RBAC implemented.
Remaining work is production hardening — RLS policies, tests, and pagination.

---

## Completed

### Infrastructure & setup
- [x] GitHub repo created and connected to Vercel
- [x] Vercel auto-deploy pipeline active (PR preview + merge to main)
- [x] Custom subdomain admin.bluelinecg.com live and SSL confirmed
- [x] DNS managed via Wix (temporary, transferring to Cloudflare)
- [x] Next.js 16 + TypeScript strict mode
- [x] Tailwind v4 configured (no tailwind.config.ts)
- [x] Clerk v7 authentication working end-to-end
- [x] /lib/config.ts env variable validation pattern
- [x] .env.example with all required variables documented
- [x] vercel.json for correct Vercel framework detection

### UI & components
- [x] Dashboard shell — sidebar nav, TopNav, PageShell, PageHeader
- [x] BrandLogo inline SVG component (light/dark variants)
- [x] Brand token system — lib/constants/brand.ts + @theme in globals.css
- [x] Full /components/ui primitive library:
  Button, Badge, Card, Input, Select, Textarea, Spinner,
  Modal, ConfirmDialog, ExpandableTable, KanbanBoard, MilestoneTracker, StatCard, Tabs

### Pages (all with full CRUD)
- [x] /dashboard — live stat cards + recent proposals, active projects, tasks in progress
- [x] /clients — searchable list, create, edit, delete with dependency checks
- [x] /clients/[id] — detail view
- [x] /clients/new and /clients/[id]/edit — forms with validation
- [x] /proposals — expandable table with inline line items
- [x] /projects — milestone progress tracking
- [x] /projects/[id] — detail with MilestoneTracker visual + milestone table
- [x] /tasks — Kanban board with drag-and-drop
- [x] /finances — tabbed: overview, invoices, expenses
- [x] /emails — unified multi-account inbox (live Gmail API, 3 accounts)
- [x] /settings — tabbed: profile, notifications, preferences

### Supabase wiring (all modules)
- [x] lib/db/clients.ts + API routes + 11 unit tests
- [x] lib/db/proposals.ts + API routes + 12 unit tests
- [x] lib/db/projects.ts + API routes + 13 unit tests
- [x] lib/db/tasks.ts + API routes + 11 unit tests
- [x] lib/db/finances.ts (invoices + expenses) + API routes + 18 unit tests
- [x] All delete flows: GET /blockers → ConfirmDialog → DELETE (409 if blocked)
- [x] Dashboard wired to live Supabase data (all modules in parallel)
- [x] 253 tests passing across all test suites

### Gmail API integration
- [x] lib/integrations/gmail.ts — client factory + thread mapping helpers
- [x] lib/config.ts — Gmail credential validation
- [x] GET /api/emails — merged inbox across all 3 accounts, deduped, sorted
- [x] GET /api/emails/[id] — full thread with message bodies
- [x] PATCH /api/emails/[id]/read — marks thread as read
- [x] POST /api/emails/[id]/reply — reply in existing thread
- [x] POST /api/emails/send — compose and send from any account
- [x] DELETE /api/emails/[id] — moves to trash
- [x] /emails page — live data, compose modal, reply box, delete, auto mark-as-read
- [x] All 3 refresh tokens captured and stored in .env.local + Vercel

### Data
- [x] 52 prospects imported from lead list (St. Pete FL + Main Line PA)

### RBAC (feature/rbac — ready to merge)
- [x] lib/auth/roles.ts — getRole(), isAdmin(), guardAdmin() server utilities
- [x] lib/auth/use-role.ts — useRole() client hook
- [x] All DELETE API routes guarded (clients, proposals, projects, tasks)
- [x] All finances API routes guarded (invoices + expenses, all methods)
- [x] /finances layout — server-side redirect for members
- [x] Sidebar hides Finances nav for members
- [x] Delete buttons hidden in proposals, projects, tasks for members
- [x] Roles set in Clerk: Ryan = admin, Nick = member

---

## Backlog (in priority order)

- [ ] **Merge feature/rbac PR** — branch is pushed and build is passing
- [ ] **Supabase RLS policies** — Row Level Security rules need to be defined
      and applied to all tables; currently relying on service role key + API auth only
- [ ] **Component + E2E tests** — Jest + RTL component tests and Playwright E2E
      (unit tests for lib/db are done; UI and E2E coverage still needed)
      Key flows to cover: sign in/out, create client, delete with blocker,
      admin vs member access, finances redirect for members
- [ ] **Pagination** — all list views currently load all records; add
      cursor-based pagination for production readiness
- [ ] **Agentic workflow** — implement two-agent Claude Code pipeline
      (dev agent + review agent via Agent SDK)
- [ ] **Delete temp OAuth routes** — app/api/auth/gmail/ can be removed now
      that all 3 refresh tokens are captured

---

## Environment variables reference

| Variable | Used by | Where to find |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk (client) | Clerk dashboard → API Keys |
| `CLERK_SECRET_KEY` | Clerk (server) | Clerk dashboard → API Keys |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Supabase dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase (client) | Supabase dashboard → Settings → API → anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase (server) | Supabase dashboard → Settings → API → service_role key |
| `GMAIL_CLIENT_ID` | Gmail API | Google Cloud → Credentials |
| `GMAIL_CLIENT_SECRET` | Gmail API | Google Cloud → Credentials |
| `GMAIL_REFRESH_TOKEN_RYAN` | Gmail API | Generated via OAuth flow |
| `GMAIL_REFRESH_TOKEN_NICK` | Gmail API | Generated via OAuth flow |
| `GMAIL_REFRESH_TOKEN_GMAIL` | Gmail API | Generated via OAuth flow |
