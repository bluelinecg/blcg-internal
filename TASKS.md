# BLCG Internal — Build Status & Task Tracker

**Live URL**: https://admin.bluelinecg.com
**Repo**: github.com/bluelinecg/blcg-internal
**Current branch**: main (feature/wire-clients merged)

---

## Current status

**Phase**: Supabase wiring complete for all modules except emails.
Gmail API integration is the active next task — requires manual Google Cloud
setup steps before code can be written (see below).

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

---

## Immediate next task — PICK UP HERE

### Gmail API integration for /emails

The emails page currently uses mock data. The goal is a unified inbox that
aggregates all 3 Gmail accounts (ryan@bluelinecg.com, nick@bluelinecg.com,
bluelinecgllc@gmail.com) into one view with read/reply capability.

**Architecture decision**: Emails are fetched live from the Gmail API — NOT
stored in Supabase. Always in sync, no storage costs, no sync complexity.

---

#### Step 1 — Google Cloud setup (manual, done by Ryan — ~15 min)

1. **Create a Google Cloud project**
   - Go to https://console.cloud.google.com
   - Create a new project named "BLCG Internal"

2. **Enable the Gmail API**
   - APIs & Services → Enable APIs → search "Gmail API" → enable

3. **Create OAuth 2.0 credentials**
   - APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/gmail/callback`
     - `https://admin.bluelinecg.com/api/auth/gmail/callback`
   - Save the **Client ID** and **Client Secret**

4. **Configure OAuth consent screen**
   - User type: External (add all 3 addresses as test users)
   - Scopes: `https://www.googleapis.com/auth/gmail.modify`
     (covers read, send, mark as read, trash)

5. **Run OAuth consent flow once per account**
   - Claude will build a temporary `/api/auth/gmail/[account]` route for this
   - After each authorisation, copy the refresh token into your env vars

6. **Add to .env.local and Vercel (all environments)**
   ```
   GMAIL_CLIENT_ID=...
   GMAIL_CLIENT_SECRET=...
   GMAIL_REFRESH_TOKEN_RYAN=...        # ryan@bluelinecg.com
   GMAIL_REFRESH_TOKEN_NICK=...        # nick@bluelinecg.com
   GMAIL_REFRESH_TOKEN_GMAIL=...       # bluelinecgllc@gmail.com
   ```

---

#### Step 2 — Code (Claude builds once credentials are in place)

**Package to install**: `googleapis` — run `npm audit` after install.

**New files:**
- `lib/integrations/gmail.ts` — Gmail API client factory; one authenticated
  client per account; refresh tokens loaded from config; token refresh handled
  automatically by the googleapis SDK
- `lib/config.ts` — add Gmail credential validation
- `.env.example` — document the 5 new Gmail env vars
- `app/api/auth/gmail/[account]/route.ts` — temporary OAuth callback route
  for generating refresh tokens (can be removed after setup)
- `app/api/emails/route.ts` — GET: fetches threads from all 3 accounts in
  parallel, merges and sorts by date
- `app/api/emails/send/route.ts` — POST: sends new email from specified account
- `app/api/emails/[id]/reply/route.ts` — POST: sends reply in existing thread
- `app/api/emails/[id]/read/route.ts` — PATCH: marks thread as read
- `app/api/emails/[id]/route.ts` — DELETE: moves thread to trash
- `app/(dashboard)/emails/page.tsx` — rewrite to fetch from /api/emails,
  remove MOCK_EMAIL_THREADS import

---

## Backlog (next after Gmail)

- [ ] **Dashboard wiring** — /dashboard page still uses MOCK_* imports for
      stat cards; wire to live API data from /api/clients, /api/projects, etc.
- [ ] **Testing** — Jest + RTL component tests and Playwright E2E tests
      (unit tests for lib/db are done; UI and E2E coverage still needed)
- [ ] **Agentic workflow** — implement two-agent Claude Code pipeline
      (dev agent + review agent via Agent SDK)
- [ ] **Pagination** — all list views currently load all records; add
      cursor-based pagination for production readiness
- [ ] **Supabase RLS policies** — Row Level Security rules need to be defined
      and applied to all tables

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
