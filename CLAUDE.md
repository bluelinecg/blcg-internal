# BLCG Internal Admin — Claude Context

## Company overview
Blue Line Consulting Group (BLCG) is a technical consulting firm that builds web
applications for small business clients. The public-facing site lives at
bluelinecg.com.

This internal admin application (admin.bluelinecg.com) serves two purposes:
1. A working operations hub for BLCG to manage clients, proposals, and internal
   workflows
2. A proof of concept and template for the exact stack and process used for all
   future client deliverables

Every decision made in this codebase should be made with reusability in mind.
If something is built well here, it becomes the starting point for the next
project. Avoid clever one-off solutions — prefer patterns that can be extracted,
documented, and reused.

---

## Tech stack
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript throughout — no plain JavaScript files
- **Styling**: Tailwind CSS v4 — no inline styles, no CSS modules, no styled components
- **Database**: Supabase (Postgres + file storage + realtime)
- **Authentication**: Clerk v7 (SSO, MFA, user management)
- **Hosting**: Vercel (auto-deploys from GitHub on push to main)
- **DNS**: Wix DNS currently, transferring to Cloudflare in future
- **IDE**: Cursor with Claude and ChatGPT connected
- **Version control**: GitHub (personal account, repo: blcg-internal)

## Stack notes — read before writing any code
These are active gotchas that will cause errors if ignored:

- **Next.js 16.2.1** — not 14 as originally planned. Use 16 conventions throughout.
- **Tailwind v4** — no tailwind.config.ts. Uses `@import "tailwindcss"` in globals.css.
  Content auto-detected. Do not create a tailwind.config.ts file.
- **Clerk v7** — use `clerkMiddleware` not the deprecated `authMiddleware`.
- **React 19** — use current React 19 patterns.
- **Async dynamic route params** — params in dynamic routes are
  `Promise<{ id: string }>` and must always be awaited.
- **vercel.json** — declares Next.js framework for correct Vercel detection.
  Do not remove or modify this file.

---

## Folder structure
```
/app
    /layout.tsx           → root layout, Clerk provider wraps everything here
    /page.tsx             → root redirect to /dashboard
    /(auth)
        /sign-in          → Clerk sign in page
        /sign-up          → Clerk sign up page
    /(dashboard)
        /layout.tsx       → dashboard shell with nav sidebar
        /dashboard        → main overview page
        /clients          → client/customer management
        /proposals        → proposal creation and tracking
        /emails           → email management
        /settings         → app and account settings
/components
    /ui                   → pure reusable primitives
                            Button, Input, Card, Modal, Badge,
                            Table, Select, Textarea, Spinner
    /modules              → feature-specific composed components
                            ClientCard, ProposalForm, EmailThread,
                            StatusBadge, ActivityFeed
    /layout               → structural components
                            Sidebar, TopNav, PageHeader, PageShell
/lib
    /db                   → all Supabase query functions live here only
    /utils                → general utility functions
        /dependencies.ts  → dependency check functions for all entities
        /format.ts        → formatting utilities
    /hooks                → custom React hooks
    /types                → shared TypeScript type definitions
    /constants            → app-wide constants and config values
        /brand.ts         → single source of truth for brand tokens
    /mock                 → mock data used before Supabase is wired
    /validations          → Zod schemas for all form and API inputs
    /config.ts            → env variable validation — runs on startup
/styles
    /globals.css          → Tailwind base imports, @theme block, global overrides
public                    → static assets, logo, favicon
.env.example              → every required env variable documented with comments
.github
    /workflows            → GitHub Actions CI/CD pipeline
    /agents               → writer and reviewer agent instructions
CLAUDE.md                 → this file
```

---

## Reusability principles
This codebase is the master template. Every component, hook, and pattern built
here will be extracted into blcg-starter-template for future client projects.
Always code with that extraction in mind.

**Components** should be:
- Generic enough to work outside this specific app
- Accepting props rather than hardcoding values
- Documented with a brief comment explaining purpose and props
- Free of any BLCG-specific business logic (that belongs in /modules)

**Functions in /lib** should be:
- Pure where possible (same input always gives same output)
- Single responsibility — one function does one thing
- Named clearly enough that their purpose is obvious without reading the body

**Patterns to establish and follow consistently**:
- All database access through /lib/db — never query Supabase directly in a component
- All authentication checks through Clerk middleware — never roll custom auth
- All environment variables accessed through /lib/config.ts which validates
  their presence on startup
- All API routes in /app/api follow the same response shape:
  `{ data: T | null, error: string | null }`
- All form and API inputs validated with Zod schemas in /lib/validations

---

## Data integrity — dependency deletion rule

**RULE: Never allow deletion of a record that has active dependencies.**

Before any delete operation is permitted, check for child records that would be
orphaned or broken. Surface a blocking error to the user that names the specific
dependencies and what must be resolved first. Do NOT silently skip or cascade-delete.

**Dependency matrix:**

| Record       | Blocked if...                                                                         |
|--------------|---------------------------------------------------------------------------------------|
| Client       | Has proposals with status `sent`, `viewed`, or `accepted`; OR projects with status   |
|              | `active` or `on_hold`; OR invoices with status `sent`, `viewed`, or `overdue`        |
| Proposal     | Has a linked project (any status)                                                     |
| Project      | Has invoices with status `sent`, `viewed`, or `overdue`                               |
| Invoice      | Status is anything other than `draft` or `cancelled`                                 |
| Task         | No restrictions — always deletable                                                    |
| Expense      | No restrictions — always deletable                                                    |
| Email thread | No restrictions — always deletable                                                    |

**This rule is enforced at three layers — all three must be in place before a module
is considered production-ready:**

1. **Frontend (required even in mock-data phase)**
   - All dependency check functions live in `lib/utils/dependencies.ts`,
     one function per entity
   - Every delete button calls the relevant checker before opening any dialog
   - Pass the result to `ConfirmDialog`'s `blockedBy` prop
   - If blocked: red dependency list shown, confirm button disabled
   - If clear: standard "Are you sure?" confirm, then execute delete
   - This is UX — it tells the user why they cannot delete and what to fix first

2. **Server / API layer (required when API routes are added)**
   - Every delete API route re-runs the same dependency check against live DB data
   - Returns `{ data: null, error: string }` if blocked
   - Never trust the frontend check alone — a direct API call would bypass it

3. **Database constraints (required when Supabase schema is defined)**
   - Add foreign key constraints on all relationship columns
   - This is the ultimate safety net — Postgres rejects orphaning deletes at query level
   - Translate Postgres FK violation errors into user-friendly messages at the API layer

**The `lib/utils/dependencies.ts` functions must not be removed when the DB layer is
added. They serve UX clarity — a different purpose from DB constraint enforcement.
Both coexist permanently.**

---

## Coding conventions

### TypeScript
- Strict mode enabled — no exceptions
- No use of `any` type under any circumstances
- Every component has an explicitly typed Props interface defined directly above
  the component function
- Use Supabase generated types for all database shapes
- Prefer `type` for unions and primitives, `interface` for component props
  and object shapes

### Components
- **Named exports only** — no default exports on components
- One component per file
- /components/ui for generic reusable primitives only
- /components/modules for feature-specific composed components
- No direct Supabase calls inside components — ever
- Tailwind classes only — no inline styles, no CSS modules
- Existing /components/ui primitives used before creating new ones

### File and folder naming
- Components: PascalCase (ClientCard.tsx)
- Everything else: kebab-case (client-utils.ts)
- Folders: kebab-case
- No spaces or special characters in any file or folder name

### Component structure order
1. Imports (external → internal → types)
2. Types and interfaces
3. Constants local to the component
4. Component function
5. Helper functions used only by this component

### Tailwind
- Class order: layout → spacing → sizing → typography → color → border → effects
- Brand tokens from lib/constants/brand.ts — never hardcode color values
- @theme block in globals.css registers all custom tokens
- bg-brand-navy, bg-brand-blue, bg-brand-steel available globally

### General
- **No magic numbers** — any numeric value with meaning goes in /lib/constants
- **Error handling** — every async function has a try/catch, errors are logged
  and surfaced to the user via a toast notification, never silently swallowed
- **No commented-out code** left in committed files
- **No console.log statements** left in committed files

---

## AWS Well-Architected principles

These six pillars guide every architectural decision in this codebase and all
future client projects built from this template.

### 1. Operational excellence
- All deployments go through the GitHub → Vercel pipeline — no manual deploys
- Every feature branch goes through a PR before merging to main
- Errors are logged and observable — never silently swallowed
- CLAUDE.md kept current as the project evolves
- Runbooks documented in blcg-docs for common operations

Claude must:
- Write observable code — meaningful error messages, clear failure states in UI
- Document non-obvious decisions with inline comments
- Flag any manual step that should be automated

### 2. Security
- Authentication via Clerk on every protected route
- Authorisation checked server-side — never trust the client
- Row Level Security enabled on every Supabase table
- Principle of least privilege — users and service accounts access only what
  they need
- All secrets in environment variables — never in code
- Input validated with Zod on every form and API route
- HTTPS enforced everywhere
- Run `npm audit` before adding any new dependency

Claude must:
- Never hardcode secrets, keys, or credentials
- Always validate user input with Zod before processing
- Always check authentication before returning data
- Always use parameterised Supabase queries — never string-concat
- Flag any pattern that could introduce a vulnerability

### 3. Reliability
- Every async operation has error handling and a fallback UI state
- UI always shows loading, error, and empty states explicitly
- Environment variables validated on startup via /lib/config.ts — app fails
  loudly on misconfiguration rather than silently at runtime
- Vercel instant rollback available — use it immediately if a deploy breaks
- No single points of failure in critical user flows

Claude must:
- Always implement loading, error, and empty states in UI components
- Write functions that fail loudly with clear messages rather than returning
  undefined or null silently
- Handle network failures gracefully in all data fetching

### 4. Performance efficiency
- Prefer React Server Components for data fetching
- Use Next.js built-in caching appropriately — understand when to opt out
- All images use next/image for automatic optimisation
- All fonts use next/font to prevent layout shift
- Database queries select only needed columns — no SELECT *
- Pagination on all list views — never load unbounded data
- Import only what is needed from third-party libraries

Claude must:
- Default to server components unless interactivity requires a client component
- Always paginate list queries — never fetch all records without a limit
- Use next/image for all images without exception

### 5. Cost optimisation
- All services use free tiers where currently available
- No polling — use Supabase realtime subscriptions where live data is needed
- Avoid patterns that generate excessive serverless function calls
- Review costs monthly as usage grows

Claude must:
- Avoid patterns that generate excessive API or function calls
- Flag any implementation that could cause unexpected cost increases at scale
- Prefer static generation over server rendering for infrequently changing content

### 6. Sustainability
- Write efficient code that does not waste compute
- Avoid over-engineering — solve the actual problem at hand
- Remove dead code and unused dependencies regularly
- Right-size solutions for current needs — do not build for 10x scale prematurely

---

## Security — OWASP Top 10

Claude must actively prevent all ten of these in every PR.

**A01 — Broken access control**
Every API route and server action checks auth before returning data.
```typescript
const { userId } = await auth()
if (!userId) return new Response('Unauthorised', { status: 401 })
```

**A02 — Cryptographic failures**
Never store sensitive data in plain text. Never log passwords, tokens, or PII.
Always use HTTPS. Let Clerk handle all password hashing.

**A03 — Injection**
Never concatenate user input into queries. Always use Supabase query builder.
Always validate inputs with Zod before processing.
```typescript
// Never
supabase.rpc(`SELECT * FROM clients WHERE id = ${id}`)
// Always
supabase.from('clients').select().eq('id', id)
```

**A04 — Insecure design**
Model threats before building. Ask: what is the worst a user could do with this
feature? Design permissions to prevent it before writing code.

**A05 — Security misconfiguration**
RLS enabled on every table. Env variables never committed. No debug info
exposed in production error messages.

**A06 — Vulnerable components**
Run `npm audit` before adding dependencies. Check for open security issues on
the package's GitHub repo before installing.

**A07 — Authentication failures**
Clerk handles all auth — never build custom auth. Enforce MFA for admin
accounts. Never store session tokens manually.

**A08 — Data integrity failures**
Validate all data shapes with Zod on ingress. Never trust external data without
explicit validation.

**A09 — Logging failures**
Log meaningful events: auth failures, permission denials, unexpected errors.
Never log passwords, tokens, or PII.

**A10 — Server-side request forgery**
Validate and sanitise any user-supplied URLs before making server-side requests.
Never proxy arbitrary external URLs.

---

## 12 Factor App principles

1. **Codebase** — one repo in Git, multiple deploys (preview + production)
2. **Dependencies** — explicitly declared in package.json, no system dependencies
3. **Config** — all config in environment variables, validated in /lib/config.ts
4. **Backing services** — Supabase, Clerk, email providers as attached resources
5. **Build, release, run** — separated via GitHub → Vercel pipeline
6. **Processes** — app is stateless — user data in Supabase storage, not local disk
7. **Port binding** — handled by Vercel
8. **Concurrency** — handled by Vercel's edge network
9. **Disposability** — fast startup, graceful shutdown, no long-running in-process state
10. **Dev/prod parity** — local and production kept as similar as possible
11. **Logs** — treat as event streams, not files
12. **Admin processes** — DB migrations as tracked one-off processes,
    never manual SQL in production

---

## Testing standards

Testing is not optional. Every feature must have coverage before it is done.

### Testing layers
- **Unit tests** — functions in /lib — tool: Jest
- **Component tests** — UI components in isolation — tool: Jest + React Testing Library
- **End to end tests** — full user flows — tool: Playwright

### What must be tested
- Every function in /lib/db
- Every function in /lib/utils including dependencies.ts
- Every component in /components/ui
- Every critical user flow end to end:
  - Sign in and sign out
  - Create and view a client
  - Create and view a proposal
  - Any flow that mutates data
  - Blocked delete scenarios (dependency rule enforcement)

### Conventions
- Test files co-located with source: ClientCard.test.tsx next to ClientCard.tsx
- Test names describe behaviour: `shows error when email is invalid`
  not `tests validateEmail`
- Mock Supabase and Clerk in all tests — never hit real services
- Never skip tests to save time

### CI gate
All tests must pass before any PR can merge. Failing test blocks merge
regardless of review approval status.

---

## Branch and commit conventions

### Branch naming
- `feature/short-description`
- `fix/short-description`
- `chore/short-description`

### Commit format (Conventional Commits)
Format: `type: short description`

Types: `feat` `fix` `chore` `docs` `refactor` `test` `style`

Examples:
- `feat: add client list page`
- `fix: resolve proposal form validation error`
- `test: add unit tests for client db queries`
- `chore: update supabase client to v2`

Rules:
- Never commit directly to main
- Commit often — small focused commits over one large end-of-session commit
- Always open a PR so CI checks run and there is a record of the change

### Definition of done
A feature is not done until all of these are true:
- [ ] Code follows all conventions in this file
- [ ] Tests written and passing
- [ ] .env.example updated if new variables were added
- [ ] No console.log statements remaining
- [ ] No commented-out code remaining
- [ ] PR description complete with what changed, why, and how to test
- [ ] CI checks passing
- [ ] Reviewer approved or all issues addressed

---

## Environment variables

All environment variables must be:
- Added to .env.local for local development (gitignored — never commit this file)
- Added to .env.example with a descriptive comment and placeholder value
- Added to Vercel environment settings before deploying
- Validated in /lib/config.ts on startup — never access process.env directly
- Never hardcoded anywhere in the codebase

### Validation pattern — /lib/config.ts
```typescript
function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export const config = {
  clerk: {
    publishableKey: requireEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'),
    secretKey: requireEnv('CLERK_SECRET_KEY'),
  },
  supabase: {
    url: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  },
}
```

Required variables:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

---

## Authentication rules
- Clerk handles all authentication — never build custom auth logic
- The entire dashboard route group is protected via Clerk middleware
- Use `clerkMiddleware` — not the deprecated `authMiddleware`
- Public routes are limited to: `/`, `/sign-in`, `/sign-up`
- User roles are managed in Clerk's metadata — check roles server-side
- Never trust client-side role checks for access control

---

## Database conventions
- All Supabase queries live exclusively in /lib/db
- Each domain area has its own file: clients.ts, proposals.ts, emails.ts
- Query functions are async and always return `{ data, error }` shape
- Use Supabase generated TypeScript types — regenerate when schema changes
- Row Level Security must be enabled on every table
- Never use the service role key client-side — server only
- Never modify Supabase schema directly — describe the migration and confirm
  before executing

---

## Agentic development instructions

### Before starting any task
- Read this entire file before writing a single line of code
- Check existing folder structure before creating new files
- Identify components or utilities that can be reused
- Do not install new packages without flagging it first
- Confirm task scope with the user before proceeding

### When creating new components
- Check /components/ui first — reuse before creating
- Follow the exact folder structure defined above
- Add to the appropriate index.ts barrel export
- Write the component test alongside the component

### When modifying existing files
- Read the full file before making any changes
- Preserve existing code style and patterns exactly
- Do not refactor code outside the scope of the current task
- Flag bugs found outside the task scope as a comment — do not fix silently

### When working with the database
- Never modify Supabase schema directly — describe migration and confirm first
- Always check RLS policies when adding new tables
- Always add new query functions to the test suite

### When you are unsure
- Stop and ask rather than guess
- Propose two to three approaches with tradeoffs
- Flag any decision with significant architectural implications

### Things Claude must never do autonomously
- Delete files or folders
- Modify .env files
- Change authentication or security configuration
- Push to main or merge pull requests
- Install packages without explicit user confirmation
- Modify this CLAUDE.md without being explicitly asked
- Skip writing tests to save time
- Use `any` type to resolve a TypeScript error
- Disable TypeScript strict checks for any reason

---

## Agentic workflow (planned)

The goal is a two-agent pipeline that mirrors a real dev/review process:

**Dev agent** responsibilities:
- Read CLAUDE.md at the start of every task
- Create a feature branch before touching any files
- Implement the task end-to-end: components, types, tests
- Commit with conventional messages and open a PR with full description

**Review agent** responsibilities:
- Read the diff of the open PR
- Check against all CLAUDE.md conventions
- Verify folder structure, naming, exports, no `any`, brand tokens, OWASP rules
- Approve if passing, or request changes with specific file:line feedback

Implementation approach: Claude Code sub-agents via the Agent SDK, triggered
by a hook or manual invocation. Both agents share this CLAUDE.md as their
primary context document.

---

## Current build status

**Phase**: Supabase wiring complete for all modules except emails (Gmail API integration pending)
**Live URL**: https://admin.bluelinecg.com
**Repo**: github.com/bluelinecg/blcg-internal
**Open branch**: feature/wire-clients (ready to PR → main)

### Completed
- GitHub repo created and connected to Vercel
- Vercel auto-deploy pipeline active (PR preview + merge to main)
- Custom subdomain admin.bluelinecg.com live and SSL confirmed
- DNS managed via Wix (temporary)
- Next.js 16 with App Router and TypeScript strict mode
- Tailwind v4 configured (no tailwind.config.ts — v4 auto-detects content)
- Clerk v7 authentication working end-to-end
  - Sign-in and sign-up pages at /sign-in and /sign-up
  - Clerk middleware protecting all /dashboard routes
  - ClerkProvider in root layout with afterSignOutUrl configured
- /lib/config.ts env variable validation pattern established (includes Supabase vars)
- .env.example documenting all required variables (includes Supabase vars)
- vercel.json declaring Next.js framework for correct Vercel detection
- Dashboard shell built and live
  - Sidebar with alphabetical nav, Settings pinned to bottom
  - TopNav with page title and Clerk UserButton
  - PageShell and PageHeader layout components
  - BrandLogo inline SVG component (light/dark variants)
- Brand token system established
  - lib/constants/brand.ts as single source of truth
  - @theme block in globals.css registers bg-brand-navy, bg-brand-blue, bg-brand-steel
  - All UI primitives wired to brand tokens
- Full /components/ui primitive library built
  - Button, Badge, Card, Input, Select, Textarea, Spinner
  - Modal, ConfirmDialog, ExpandableTable, KanbanBoard, MilestoneTracker, StatCard, Tabs
- All dashboard pages built with mock data and full CRUD via local React state
  - /dashboard — summary widgets (active clients, projects, invoices, tasks)
  - /clients — searchable/filterable list, create, edit, delete with dependency checks
  - /clients/[id] — detail view with dependency-checked delete
  - /clients/new and /clients/[id]/edit — forms with validation
  - /proposals — expandable table with inline line items, full CRUD
  - /projects — milestone progress tracking, full CRUD
  - /projects/[id] — detail with MilestoneTracker visual + milestone table
  - /tasks — Kanban board with HTML5 drag-and-drop, full CRUD
  - /finances — tabbed view: overview, invoices, expenses; full CRUD
  - /emails — unified multi-account inbox (3 accounts), compose, delete (still mock)
  - /settings — tabbed: profile, notifications, preferences
- lib/types established for all modules (clients, proposals, projects, tasks, finances, emails)
- lib/mock data established for all modules
- lib/utils/dependencies.ts — frontend dependency-delete enforcement for all entities
- Dependency-delete rule enforced at frontend layer across all deletable entities
- **Supabase setup** (merged)
  - @supabase/supabase-js installed
  - supabase/migrations/20260322000000_initial_schema.sql — initial schema
  - lib/db/supabase.ts — serverClient + browserClient
  - lib/config.ts updated with Supabase env var validation
  - All TypeScript types redesigned to match DB schema
  - All mock data, form modals, pages, and Zod schemas updated
- **Supabase wiring — all non-email modules** (branch: feature/wire-clients)
  - lib/db/clients.ts + API routes + updated pages + 11 unit tests
  - lib/db/proposals.ts + API routes + updated pages + 12 unit tests
  - lib/db/projects.ts + API routes + updated pages + 13 unit tests
  - lib/db/tasks.ts + API routes + updated pages + 11 unit tests
  - lib/db/finances.ts + API routes (invoices + expenses) + updated pages + 18 unit tests
  - All form modals updated with isSaving/saveError async feedback props
  - All delete flows use two-step pattern: GET /blockers → ConfirmDialog → DELETE
  - 253 tests passing across all test suites

### Immediate next task — PICK UP HERE
**Merge feature/wire-clients PR, then wire the emails module via Gmail API**

#### Step 1 — Merge the open branch
Push `feature/wire-clients` and open a PR against `main`. Verify the Vercel preview
build passes, then merge.

#### Step 2 — Gmail API setup (manual steps, done by Ryan)
Before any code can be written, the following must be completed in Google Cloud:

1. **Create a Google Cloud project** (or use an existing one)
   - Go to https://console.cloud.google.com
   - Create a new project named "BLCG Internal"

2. **Enable the Gmail API**
   - In the project: APIs & Services → Enable APIs
   - Search for "Gmail API" and enable it

3. **Create OAuth 2.0 credentials**
   - APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
   - Application type: **Web application**
   - Authorized redirect URIs: add `http://localhost:3000/api/auth/gmail/callback`
     and `https://admin.bluelinecg.com/api/auth/gmail/callback`
   - Save the **Client ID** and **Client Secret**

4. **Configure OAuth consent screen**
   - User type: Internal (since all 3 accounts are in the same Google Workspace org)
     OR External with the 3 addresses added as test users if not on Workspace
   - Add scopes: `https://www.googleapis.com/auth/gmail.modify`
     (covers read, send, and modify — marks as read, etc.)

5. **Run the OAuth consent flow for each of the 3 accounts**
   - This is a one-time step per account to generate a refresh token
   - Claude can build a temporary `/api/auth/gmail/[account]` route to handle this
   - After authorisation, the refresh token is printed to the console / returned
     so you can copy it into your env vars

6. **Add credentials to .env.local and Vercel**
   ```
   GMAIL_CLIENT_ID=...
   GMAIL_CLIENT_SECRET=...
   GMAIL_REFRESH_TOKEN_RYAN=...        # ryan@bluelinecg.com
   GMAIL_REFRESH_TOKEN_NICK=...        # nick@bluelinecg.com
   GMAIL_REFRESH_TOKEN_GMAIL=...       # bluelinecgllc@gmail.com
   ```

#### Step 3 — Gmail integration code (Claude builds this)
Once the credentials are in place, the integration follows this pattern:

**New files to create:**
- `lib/integrations/gmail.ts` — Gmail API client factory; one authenticated client
  per account using `googleapis` npm package; refresh tokens loaded from config
- `lib/config.ts` — add Gmail credential validation
- `.env.example` — document the 5 new Gmail env vars
- `app/api/emails/route.ts` — GET: fetches threads from all 3 accounts in parallel,
  merges and sorts by date, returns unified list
- `app/api/emails/send/route.ts` — POST: sends a new email from the specified account
- `app/api/emails/[id]/reply/route.ts` — POST: sends a reply in an existing thread
- `app/api/emails/[id]/read/route.ts` — PATCH: marks a thread as read
- `app/api/emails/[id]/route.ts` — DELETE: moves thread to trash on the correct account
- `app/(dashboard)/emails/page.tsx` — rewrite to fetch from /api/emails, remove
  MOCK_EMAIL_THREADS import

**Architecture decisions:**
- Emails are NOT stored in Supabase — fetched live from Gmail API each load
- Each API route identifies which Gmail account a thread belongs to via the
  `account` field on the thread and routes the API call to the correct client
- The `googleapis` package handles OAuth token refresh automatically given a
  valid refresh token — no manual token management needed
- Threads from all 3 accounts are fetched in parallel (Promise.all) and merged
- Reply threads are matched by Gmail thread ID stored on the EmailThread object

**Package to install:** `googleapis` (official Google API client for Node.js)
Run `npm audit` after install before committing.

### Next steps after Gmail integration
1. **Testing** — add Jest + RTL unit/component tests and Playwright E2E tests
2. **Dashboard wiring** — /dashboard page still uses MOCK_* imports for stat cards;
   wire to live API data
3. **Agentic workflow** — implement two-agent Claude Code pipeline (dev + review agents)

---

## Extraction checklist for blcg-starter-template

- [x] Next.js + Tailwind + TypeScript base configuration
- [x] Clerk authentication setup and middleware
- [x] Supabase client configuration and type generation setup
- [x] /components/ui primitive library
- [x] /lib/config.ts environment variable validation pattern
- [x] Brand token system (brand.ts + @theme pattern)
- [x] BrandLogo component (swap-ready for client rebranding)
- [ ] Standard API route response shape
- [ ] GitHub Actions CI/CD workflow file
- [ ] Jest and Playwright test configuration
- [x] .env.example template
- [x] Base Tailwind configuration with brand design tokens
- [x] Zod validation schemas pattern in /lib/validations
- [ ] This CLAUDE.md adapted as a generic template
- [ ] Writer Agent and Reviewer Agent instruction files