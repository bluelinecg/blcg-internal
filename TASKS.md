# BLCG Internal — Build Status & Task Tracker

**Live URL**: https://admin.bluelinecg.com
**Repo**: github.com/bluelinecg/blcg-internal
**Current branch**: feature/live-client-data (ready to PR — reset to 84fabcf after agent UI regression)

---

## Current status

**Phase**: Phase 2 (CRM Data Model) complete. 280 tests passing.
Phase 3 next: Role-Based Permissions System enhancement + Outbound Webhooks.

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
- [x] **Test infrastructure** — Jest + RTL + Playwright fully configured; 253 tests
      passing across 21 suites; `tests/helpers/` has render, factories (all entities
      incl. Task), and Supabase mock builder; mocks for Clerk and next/navigation
- [x] **Error monitoring** — `@sentry/nextjs` integrated; client/server/edge configs
      with PII scrubbing (`beforeSend` filters cookies and auth headers); `global-error.tsx`
      root error boundary; `instrumentation.ts` registers server/edge configs;
      `next.config.ts` wrapped with `withSentryConfig` (source maps, bundle optimisation);
      `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_AUTH_TOKEN` documented in `.env.example`;
      disabled in non-production environments

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
- [x] 253 tests passing across all test suites (280 after CRM module)

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
- [x] tasks — Supabase check constraint updated to include `backlog` status (run in SQL editor)
- [x] tasks — fromRow normalises due_date to full ISO datetime to pass Zod validation on edit
- [x] tasks — assignee and project clearing on edit: empty string was silently dropped via
      `|| undefined`, now kept and mapped to null in toInsert/updateTask via `|| null`

### CRM Data Model (Phase 2 — complete)
- [x] lib/types/crm.ts — Contact, Organization, ContactStatus types
- [x] lib/validations/contacts.ts + organizations.ts — Zod schemas
- [x] lib/db/contacts.ts — full CRUD + 11 unit tests
- [x] lib/db/organizations.ts — full CRUD + contact count + getOrganizationContactCount + 16 unit tests
- [x] lib/utils/dependencies.ts — getOrganizationDeleteBlockers (blocks if contacts exist)
- [x] lib/utils/dependencies.test.ts — 3 new tests for org blocker
- [x] API routes: /api/contacts, /api/contacts/[id], /api/organizations, /api/organizations/[id], /api/organizations/[id]/blockers
- [x] components/modules/OrganizationFormModal.tsx + ContactFormModal.tsx
- [x] app/(dashboard)/organizations/page.tsx — searchable list, full CRUD, dependency-aware delete
- [x] app/(dashboard)/contacts/page.tsx — searchable list with status + org filters, full CRUD
- [x] Sidebar — Contacts and Organizations nav items added

**Migration SQL required** — run in Supabase SQL editor before deploying:

```sql
-- Organizations table
CREATE TABLE organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  website     text,
  phone       text,
  industry    text,
  address     text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- Contacts table
CREATE TABLE contacts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  first_name      text NOT NULL,
  last_name       text NOT NULL,
  email           text,
  phone           text,
  title           text,
  status          text NOT NULL DEFAULT 'lead'
                    CHECK (status IN ('lead', 'prospect', 'active', 'inactive')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
```

---

### Activity Logging / Audit Trail (feature/activity-logging — in progress)
- [x] lib/types/audit-log.ts — AuditLog, AuditAction, AuditEntityType types
- [x] lib/db/audit-log.ts — insertLog(), listLogs(), listLogsForEntity() + 8 unit tests
- [x] lib/utils/audit.ts — logAction() server helper (resolves actor from Clerk)
- [x] app/api/audit-log/route.ts — GET, entity-scoped + global (admin only)
- [x] lib/db/finances.ts — getExpenseById() added
- [x] logAction() wired into all mutating routes:
      clients, contacts, organizations, proposals, projects, tasks, invoices, expenses
      (POST = created, PATCH = updated/status_changed, DELETE = deleted)
- [x] components/modules/ActivityFeed.tsx — timeline feed with pagination, relative timestamps
- [x] ClientDetailView — Activity card in right sidebar
- [x] settings/page.tsx — "Activity Log" tab (admin only), global log view
- [x] 305 tests passing (25 suites)

**Migration SQL required** — run in Supabase SQL editor before deploying:

```sql
CREATE TABLE audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type  text NOT NULL,
  entity_id    uuid NOT NULL,
  entity_label text NOT NULL,
  action       text NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'status_changed')),
  actor_id     text NOT NULL,
  actor_name   text NOT NULL,
  metadata     jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_audit_log_entity ON audit_log (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_log_created_at ON audit_log (created_at DESC);
```

## Immediate next task — PICK UP HERE

Open a PR for `feature/activity-logging` → `main` once migration SQL is run and build is confirmed.

## Backlog (foundations-first order)

- [ ] **Supabase RLS Policies** — RLS is enabled on all tables but no per-role policies
      defined yet. Currently only service role can read/write — security foundation.
- [ ] **Dashboard wiring** — /dashboard page still uses MOCK_* imports for
      stat cards; wire to live API data from /api/clients, /api/projects, etc.
- [ ] **Link Clients to CRM** — `Client` and `Organization` are currently parallel,
      unconnected records:
      - Add `organization_id uuid REFERENCES organizations(id)` to the `clients` table
      - Add `contact_id uuid REFERENCES contacts(id)` to the `proposals` table
      - Deprecate flat `contactName`/`email`/`phone` on Client in favour of linked Contact
      - UI: show linked org/contact on client detail; allow promoting an org to a client
- [ ] **Marketing Module** — campaign tracking, lead source attribution, conversion funnel
      (depends on CRM link above being in place)
- [ ] **Tasks page pagination** — Kanban board is not paginated; add server-side pagination
      or list/table view alternative as task count grows
- [ ] **Pagination/SortableHeader/use-list-state tests** — components from the pagination
      feature still need co-located test files
- [ ] **Document storage** — file management for proposals, templates, and project/client
      documentation. Store files in Supabase Storage. Needs:
      - Supabase Storage bucket (with per-client/per-project folder structure)
      - /documents page or per-entity document tab (clients, projects)
      - Upload, download, rename, delete with dependency-aware controls
      - File type filtering (PDF, DOCX, etc.) and metadata (name, size, uploaded by, date)
      - RBAC: all users can view; admin-only delete
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
