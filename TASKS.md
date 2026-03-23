# BLCG Internal — Build Status & Task Tracker

**Live URL**: https://admin.bluelinecg.com
**Repo**: github.com/bluelinecg/blcg-internal
**Current branch**: feature/live-client-data (ready to PR)

---

## Current status

**Phase**: Pagination/sorting, live data wiring, and Gmail integration all complete
on `feature/live-client-data`. Branch is pushed and ready to open a PR to main.

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
  Modal, ConfirmDialog, ExpandableTable, KanbanBoard, MilestoneTracker, StatCard, Tabs,
  Pagination, SortableHeader

### Pages (all with full CRUD)
- [x] /dashboard — summary widgets
- [x] /clients — searchable list, create, edit, delete with dependency checks
- [x] /clients/[id] — detail view
- [x] /clients/new and /clients/[id]/edit — forms with validation
- [x] /proposals — expandable table with inline line items
- [x] /projects — milestone progress tracking
- [x] /projects/[id] — detail with MilestoneTracker visual + milestone table
- [x] /tasks — Kanban board with drag-and-drop
- [x] /finances — tabbed: overview, invoices, expenses
- [x] /emails — unified multi-account inbox (live Gmail API data)
- [x] /settings — tabbed: profile, notifications, preferences

### Supabase wiring (all non-email modules)
- [x] lib/db/clients.ts + API routes + 11 unit tests
- [x] lib/db/proposals.ts + API routes + 12 unit tests
- [x] lib/db/projects.ts + API routes + 13 unit tests
- [x] lib/db/tasks.ts + API routes + 11 unit tests
- [x] lib/db/finances.ts (invoices + expenses) + API routes + 18 unit tests
- [x] All delete flows: GET /blockers → ConfirmDialog → DELETE (409 if blocked)
- [x] All form modals: isSaving/saveError async feedback props
- [x] 253 tests passing across all test suites

### RBAC (merged via feature/rbac)
- [x] lib/auth/roles.ts — getRole(), isAdmin(), guardAdmin() (uses currentUser(), NOT sessionClaims)
- [x] lib/auth/use-role.ts — client-side useRole() hook
- [x] guardAdmin() applied to all DELETE routes and all finances API routes
- [x] Finances layout.tsx — server-side redirect for non-admins
- [x] Sidebar hides Finances nav item for non-admin users
- [x] Tasks, Proposals, Projects pages hide Delete buttons for non-admin users

### Live data wiring
- [x] Proposals page — removed MOCK_CLIENTS, fetches live clients + proposals in parallel
- [x] Projects page — removed MOCK_CLIENTS + MOCK_PROPOSALS, fetches all three live
- [x] 52 prospect leads imported to Supabase via scripts/import-leads.ts

### Pagination / sorting (feature/live-client-data)
- [x] lib/types/pagination.ts — ListOptions, PaginatedResult, PaginatedApiResponse
- [x] lib/constants/pagination.ts — DEFAULT_PAGE_SIZE=25, MAX_PAGE_SIZE=100
- [x] lib/utils/parse-list-params.ts — parseListParams() utility
- [x] components/ui/Pagination.tsx — page window with ellipsis, Prev/Next
- [x] components/ui/SortableHeader.tsx — sortable <th> with ↑/↓/↕ indicators
- [x] components/ui/index.ts — exports for Pagination and SortableHeader
- [x] lib/hooks/use-list-state.ts — generic hook managing page/sort state + API fetch
- [x] All DB list functions updated: ListOptions param + PaginatedResult<T> return
- [x] All GET API routes updated: parse ?page/?pageSize/?sort/?order via parseListParams()
- [x] Clients page — useListState + SortableHeader + Pagination
- [x] Proposals page — useListState + SortableHeader + Pagination
- [x] Projects page — useListState + SortableHeader + Pagination
- [x] Finances page — separate useListState for invoices + expenses tabs + Pagination each
- [x] ExpandableTable — TableColumn.header widened to ReactNode (supports SortableHeader)

### Gmail integration (feature/live-client-data)
- [x] lib/integrations/gmail.ts — authenticated Gmail client, thread/message mappers
- [x] lib/config.ts — Gmail credentials use optionalEnv (app does not crash if unconfigured)
- [x] Gmail API — 2 accounts only: ryan@bluelinecg.com and bluelinecgllc@gmail.com
- [x] /emails page rewired to live Gmail API via /api/emails
- [x] Nick's account fully removed from EmailAccount type, all UI, Zod schemas, config
- [x] One-time OAuth callback routes deleted (tokens captured, no longer needed)

### Bug fixes (feature/live-client-data)
- [x] tasks.ts — TaskRow.assignee renamed to assignee_id to match DB column schema
- [x] emails — invalid_grant fixed by removing Nick's revoked OAuth account from the integration

---

## Immediate next task — PICK UP HERE

### Open PR for feature/live-client-data

Branch is pushed and build is clean. Open a PR from `feature/live-client-data` → `main`.

PR covers:
- Pagination/sorting on all list pages (clients, proposals, projects, finances)
- Gmail integration live (emails page off mock data)
- Bug fixes: assignee_id column, invalid_grant, optional Gmail config
- Nick account removal from entire codebase

---

## Backlog (after PR merged)

- [ ] **Dashboard wiring** — /dashboard page still uses MOCK_* imports for
      stat cards; wire to live API data from /api/clients, /api/projects, etc.
- [ ] **Tasks page pagination** — Kanban board is not paginated; if task count
      grows large, add server-side pagination or a list/table view alternative
- [ ] **Testing** — Jest + RTL component tests and Playwright E2E tests
      (unit tests for lib/db are done; UI component tests and E2E coverage still needed;
      new components: Pagination, SortableHeader; new hook: use-list-state)
- [ ] **Supabase RLS policies** — RLS is enabled on all 9 tables (confirmed in
      migration); permissive policies still need to be defined per-table
      (currently only service role can read/write)
- [ ] **Agentic workflow** — implement two-agent Claude Code pipeline
      (dev agent + review agent via Agent SDK)

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
| `GMAIL_REFRESH_TOKEN_GMAIL` | Gmail API | Generated via OAuth flow |
