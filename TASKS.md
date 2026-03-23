# BLCG Internal — Build Status & Task Tracker

**Live URL**: https://admin.bluelinecg.com
**Repo**: github.com/bluelinecg/blcg-internal
**Current branch**: feature/live-client-data (in progress)

---

## Current status

**Phase**: RBAC and live data wiring complete. Pagination/filtering/sorting
implementation in progress on feature/live-client-data.

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
- [x] /dashboard — summary widgets
- [x] /clients — searchable list, create, edit, delete with dependency checks
- [x] /clients/[id] — detail view
- [x] /clients/new and /clients/[id]/edit — forms with validation
- [x] /proposals — expandable table with inline line items
- [x] /projects — milestone progress tracking
- [x] /projects/[id] — detail with MilestoneTracker visual + milestone table
- [x] /tasks — Kanban board with drag-and-drop
- [x] /finances — tabbed: overview, invoices, expenses
- [x] /emails — unified multi-account inbox (still on mock data)
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

### Live data wiring (merged via feature/wire-clients → feature/live-client-data)
- [x] Proposals page — removed MOCK_CLIENTS, fetches live clients + proposals in parallel
- [x] Projects page — removed MOCK_CLIENTS + MOCK_PROPOSALS, fetches all three live
- [x] Temp Gmail OAuth routes (app/api/auth/gmail/) deleted
- [x] 52 prospect leads imported to Supabase via scripts/import-leads.ts

### Pagination foundation (in progress on feature/live-client-data)
- [x] lib/types/pagination.ts — ListOptions, PaginatedResult, PaginatedApiResponse
- [x] lib/constants/pagination.ts — DEFAULT_PAGE_SIZE=25, MAX_PAGE_SIZE=100
- [x] lib/utils/parse-list-params.ts — parseListParams() utility
- [x] components/ui/Pagination.tsx — page window with ellipsis, Prev/Next
- [x] components/ui/SortableHeader.tsx — sortable &lt;th&gt; with ↑/↓/↕ indicators

---

## Immediate next task — PICK UP HERE

### Complete pagination/filtering/sorting (branch: feature/live-client-data)

Foundation already built (see Completed above). Remaining work:

**1. Export new UI components**
- Update `components/ui/index.ts` — add exports for `Pagination` and `SortableHeader`

**2. Create `lib/hooks/use-list-state.ts`**
Generic hook that manages page/sort state and fetches from an API endpoint.
```typescript
interface UseListStateOptions {
  endpoint: string;       // e.g. '/api/clients'
  defaultSort: string;    // e.g. 'name'
  defaultOrder?: 'asc' | 'desc';
}
interface UseListStateReturn<T> {
  data: T[];
  isLoading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  totalRecords: number;
  sort: string;
  order: 'asc' | 'desc';
  setPage: (page: number) => void;
  setSort: (column: string) => void;  // toggles asc/desc if same column
  reload: () => void;
}
```

**3. Update DB layer** — add `ListOptions` param and return `PaginatedResult<T>`
- `lib/db/clients.ts` — listClients(options?: ListOptions)
- `lib/db/proposals.ts` — listProposals(options?: ListOptions)
- `lib/db/projects.ts` — listProjects(options?: ListOptions)
- `lib/db/tasks.ts` — listTasks(options?: ListOptions)
- `lib/db/finances.ts` — listInvoices, listExpenses (options?: ListOptions)

Pattern for each:
```typescript
const from = ((page ?? 1) - 1) * (pageSize ?? DEFAULT_PAGE_SIZE);
const to = from + (pageSize ?? DEFAULT_PAGE_SIZE) - 1;
const query = supabase.from('clients').select('*', { count: 'exact' });
if (sort) query.order(sort, { ascending: order !== 'desc' });
const { data, count, error } = await query.range(from, to);
return { data, total: count, error: error?.message ?? null };
```

**4. Update API routes** — accept ?page, ?pageSize, ?sort, ?order via parseListParams()
- `app/api/clients/route.ts` (GET)
- `app/api/proposals/route.ts` (GET)
- `app/api/projects/route.ts` (GET)
- `app/api/tasks/route.ts` (GET)
- `app/api/invoices/route.ts` (GET)
- `app/api/expenses/route.ts` (GET)

**5. Update page components** — swap manual fetch for useListState, add Pagination + SortableHeader to tables
- `app/(dashboard)/clients/page.tsx`
- `app/(dashboard)/proposals/page.tsx`
- `app/(dashboard)/projects/page.tsx`
- `app/(dashboard)/finances/page.tsx` (invoices + expenses tabs)

**6. Run build check, commit, open PR**

---

### Gmail API integration for /emails (after pagination)

The emails page currently uses mock data. The goal is a unified inbox that
aggregates all 3 Gmail accounts (ryan@bluelinecg.com, nick@bluelinecg.com,
bluelinecgllc@gmail.com) into one view with read/reply capability.

**Architecture decision**: Emails are fetched live from the Gmail API — NOT
stored in Supabase. Always in sync, no storage costs, no sync complexity.

#### Step 1 — Google Cloud setup (manual, done by Ryan — ~15 min)

1. **Create a Google Cloud project** at https://console.cloud.google.com — "BLCG Internal"
2. **Enable the Gmail API** — APIs & Services → Enable APIs → Gmail API
3. **Create OAuth 2.0 credentials** — Web application type
   - Redirect URIs: `http://localhost:3000/api/auth/gmail/callback` and `https://admin.bluelinecg.com/api/auth/gmail/callback`
4. **Configure OAuth consent screen** — External, add all 3 addresses as test users
   - Scope: `https://www.googleapis.com/auth/gmail.modify`
5. **Add to .env.local and Vercel:**
   ```
   GMAIL_CLIENT_ID=...
   GMAIL_CLIENT_SECRET=...
   GMAIL_REFRESH_TOKEN_RYAN=...
   GMAIL_REFRESH_TOKEN_NICK=...
   GMAIL_REFRESH_TOKEN_GMAIL=...
   ```

#### Step 2 — Code (Claude builds once credentials are in place)

**Package**: `googleapis` (run `npm audit` after)

New files: `lib/integrations/gmail.ts`, API routes for list/send/reply/read/delete,
rewrite `app/(dashboard)/emails/page.tsx` to fetch live data.

---

## Backlog (after Gmail)

- [ ] **Dashboard wiring** — /dashboard page still uses MOCK_* imports for
      stat cards; wire to live API data from /api/clients, /api/projects, etc.
- [ ] **Testing** — Jest + RTL component tests and Playwright E2E tests
      (unit tests for lib/db are done; UI and E2E coverage still needed)
- [ ] **Agentic workflow** — implement two-agent Claude Code pipeline
      (dev agent + review agent via Agent SDK)
- [ ] **Supabase RLS policies** — RLS is enabled on all 9 tables (confirmed in
      migration); permissive policies still need to be defined per-table
      (currently only service role can read/write)

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
