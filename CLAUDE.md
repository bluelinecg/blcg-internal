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
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript throughout — no plain JavaScript files
- **Styling**: Tailwind CSS — no inline styles, no CSS modules, no styled components
- **Database**: Supabase (Postgres + file storage + realtime)
- **Authentication**: Clerk (SSO, MFA, user management)
- **Hosting**: Vercel (auto-deploys from GitHub on push to main)
- **DNS**: Wix DNS currently, transferring to Cloudflare in future
- **IDE**: Cursor with Claude and ChatGPT connected
- **Version control**: GitHub (personal account, repo: blcg-internal)

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
    /hooks                → custom React hooks
    /types                → shared TypeScript type definitions
    /constants            → app-wide constants and config values
/styles
    /globals.css          → Tailwind base imports and global overrides
public                    → static assets, logo, favicon
.env.example              → every required env variable documented with comments
.github
    /workflows            → GitHub Actions CI/CD pipeline
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
- All environment variables accessed through a single /lib/config.ts file that
  validates their presence on startup
- All API routes in /app/api follow the same response shape:
  `{ data: T | null, error: string | null }`

---

## Data integrity — dependency deletion rule

**RULE: Never allow deletion of a record that has active dependencies.**

Before any delete operation is permitted, check for child records that would be
orphaned or broken. Surface a blocking error to the user that names the specific
dependencies and what must be resolved first. Do NOT silently skip or cascade-delete.

**Dependency matrix:**

| Record       | Blocked if...                                                              |
|--------------|---------------------------------------------------------------------------|
| Client       | Has any proposals with status `sent`, `viewed`, or `accepted`; OR any projects with status `active` or `on_hold`; OR any invoices with status `sent`, `viewed`, or `overdue` |
| Proposal     | Has a linked project (any status)                                         |
| Project      | Has invoices with status `sent`, `viewed`, or `overdue`                   |
| Invoice      | Status is anything other than `draft` or `cancelled`                      |
| Task         | No restrictions — always deletable                                        |
| Expense      | No restrictions — always deletable                                        |
| Email thread | No restrictions — always deletable                                        |

**This rule is enforced at three layers — all three must be in place before a module is
considered production-ready:**

1. **Frontend (always required, even in mock-data phase)**
   - All dependency check functions live in `lib/utils/dependencies.ts`, one per entity
   - Every delete button calls the relevant checker before opening any dialog
   - Pass the result to `ConfirmDialog`'s `blockedBy` prop
   - If blocked: red dependency list shown, confirm button disabled
   - If clear: standard "Are you sure?" confirm, then execute delete
   - This is UX — it tells the user *why* they can't delete and what to fix

2. **Server / API layer (required when API routes are added)**
   - Every delete API route re-runs the same dependency check against live DB data
   - Returns a structured `{ data: null, error: string }` response if blocked
   - Never trust the frontend check alone — a direct API call would bypass it

3. **Database constraints (required when Supabase schema is defined)**
   - Add foreign key constraints on all relationship columns
     (e.g. `proposals.client_id → clients.id`, `projects.proposal_id → proposals.id`)
   - This is the ultimate safety net — Postgres rejects orphaning deletes at the query level
   - Translate Postgres FK violation errors into user-friendly messages at the API layer

**The `lib/utils/dependencies.ts` functions must not be removed when the DB layer is added.
They serve a different purpose (UX clarity) than DB constraints (data integrity). Both coexist.**

---

## Coding conventions
- **Named exports only** — no default exports on components
- **TypeScript strict mode** — no use of `any` type, ever
- **Props interfaces** — every component has an explicitly typed Props interface
  defined directly above the component
- **File naming** — components use PascalCase (ClientCard.tsx), everything else
  uses kebab-case (client-utils.ts)
- **Component structure order**:
  1. Imports
  2. Types / interfaces
  3. Constants local to the component
  4. Component function
  5. Helper functions used only by this component
- **Tailwind class order** — layout → spacing → sizing → typography → color →
  border → effects. Use Prettier with Tailwind plugin to enforce automatically.
- **No magic numbers** — any numeric value with meaning goes in /lib/constants
- **Error handling** — every async function has a try/catch, errors are logged
  and surfaced to the user via a toast notification, never silently swallowed

---

## Branch and commit conventions
- **Never commit directly to main** — all changes go through feature branches
- **Branch naming**: `feature/short-description`, `fix/short-description`,
  `chore/short-description`
- **Commit messages**: lowercase, present tense, imperative mood
  - Good: `add client list page`, `fix proposal form validation`
  - Bad: `Added stuff`, `WIP`, `fixing things`
- **Commit often** — small focused commits are better than one large commit
  at the end of a session
- **PR before merging** — even solo, open a PR so the CI checks run and there
  is a record of what changed and why

---

## Environment variables
All environment variables must be:
- Added to .env.local for local development (this file is gitignored)
- Added to .env.example with a descriptive comment and placeholder value
- Added to Vercel's environment variable settings before deploying
- Never hardcoded anywhere in the codebase

Required variables (see .env.example for full list):
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
- Public routes are limited to: `/`, `/sign-in`, `/sign-up`
- User roles are managed in Clerk's metadata — check roles server-side
- Never trust client-side role checks for access control — always verify
  on the server

---

## Database conventions
- All Supabase queries live exclusively in /lib/db
- Each domain area has its own file: clients.ts, proposals.ts, emails.ts
- Query functions are async and always return `{ data, error }` shape
- Use Supabase's generated TypeScript types — regenerate when schema changes
- Row Level Security (RLS) must be enabled on every table
- Never use the service role key client-side — server only

---

## Agentic development instructions
These instructions apply specifically when Claude is operating autonomously
across multiple files or executing multi-step tasks.

**Before starting any task**:
- Read this file fully
- Check the existing folder structure before creating new files
- Identify any existing components or utilities that can be reused
- Do not install new npm packages without flagging it first

**When creating new components**:
- Check /components/ui first — if a suitable primitive exists, use it
- Follow the exact folder structure defined above
- Add the component to the appropriate index.ts barrel export

**When modifying existing files**:
- Read the full file before making changes
- Preserve existing code style and patterns
- Do not refactor code outside the scope of the current task
- If you notice a bug outside the current task, flag it in a comment
  rather than fixing it silently

**When working with the database**:
- Never modify Supabase schema directly — describe the migration needed
  and confirm before executing
- Always check RLS policies when adding new tables
- Test queries return the expected shape before wiring to UI

**When you are unsure**:
- Stop and ask rather than guess
- Propose two or three approaches with tradeoffs rather than picking one
  unilaterally
- Flag any decision that has significant architectural implications

**Things Claude should never do autonomously**:
- Delete files or folders
- Modify .env files
- Change authentication or security configuration
- Push to main or merge pull requests
- Install packages marked as incompatible in this file
- Modify this CLAUDE.md file without being explicitly asked

---

## Current build status
**Phase**: Full frontend UI complete (mock data) — ready for Supabase wiring
**Live URL**: https://admin.bluelinecg.com
**Repo**: github.com/bluelinecg/blcg-internal
**Open branch**: feature/full-frontend-ui (not yet pushed — push and open PR before merging)

**Completed**:
- GitHub repo created and connected to Vercel
- Vercel auto-deploy pipeline active (PR preview + merge to main)
- Custom subdomain admin.bluelinecg.com live and SSL confirmed
- DNS managed via Wix (temporary)
- Next.js 16 with App Router and TypeScript strict mode initialized
- Tailwind v4 configured (no tailwind.config.ts — v4 auto-detects content)
- Clerk v7 authentication installed and working end-to-end
  - Sign-in and sign-up pages at /sign-in and /sign-up
  - Clerk middleware protecting all /dashboard routes
  - ClerkProvider in root layout with afterSignOutUrl configured
- /lib/config.ts env variable validation pattern established
- .env.example documenting all required variables
- vercel.json declaring Next.js framework for correct Vercel detection
- Dashboard shell built and live
  - Sidebar with nav links (alphabetical, Settings pinned bottom)
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
- All dashboard pages built with mock data and full CRUD via local state
  - /dashboard — summary widgets (active clients, projects, invoices, tasks)
  - /clients — list, create, edit, delete (with dependency checks)
  - /clients/[id] — detail view with dependency-checked delete
  - /clients/new and /clients/[id]/edit — forms with validation
  - /proposals — expandable table with line items, full CRUD
  - /projects — milestone progress tracking, full CRUD
  - /projects/[id] — detail with MilestoneTracker visual
  - /tasks — Kanban board (drag-and-drop), full CRUD
  - /finances — tabbed: overview, invoices, expenses; full CRUD
  - /emails — unified multi-account inbox with compose and delete
  - /settings — tabbed: profile, notifications, preferences
- lib/types, lib/mock, lib/utils/dependencies.ts established for all modules
- Dependency-delete rule enforced at frontend layer across all deletable entities

**Stack notes**:
- Next.js 16.2.1 (not 14 as originally planned — use 16 conventions)
- Tailwind v4 — no tailwind.config.ts, uses @import "tailwindcss" in globals.css
- Clerk v7 — use clerkMiddleware (not deprecated authMiddleware)
- React 19
- params in dynamic routes are async (Promise<{ id: string }>) — always await them
- Never nest <button> inside <button> — use <div> with onClick and cursor-pointer instead

**Next steps**:
1. **Push and merge** feature/full-frontend-ui — open PR, verify preview deploy, merge to main
2. **Supabase setup**
   - Install @supabase/supabase-js (flag for approval before installing)
   - Create /lib/db/supabase.ts client (server and browser variants)
   - Define schema for all modules (clients, proposals, projects, tasks, finances, emails)
   - Enable RLS and write policies on every table
   - Replace mock data in /lib/mock/* with /lib/db/* query functions
3. **API routes** — add /app/api routes for each entity with server-side dependency checks
4. **Agentic workflow** — build a two-agent Claude Code workflow:
   - Dev agent: picks up tasks and implements them end-to-end on a feature branch
   - Review agent: code reviews the PR, checks conventions, approves or requests changes
   See Claude Code hooks and sub-agent documentation for implementation approach

---

## Agentic workflow (planned)
The goal is a two-agent pipeline that mirrors a real dev/review process:

**Dev agent** responsibilities:
- Read CLAUDE.md and memory at the start of every task
- Create a feature branch before touching any files
- Implement the task end-to-end (components, types, tests where applicable)
- Commit with conventional messages and open a PR

**Review agent** responsibilities:
- Read the diff of the open PR
- Check against CLAUDE.md conventions (naming, exports, no `any`, brand tokens, etc.)
- Verify folder structure is correct
- Approve if passing, or request changes with specific file:line feedback

Implementation approach: Claude Code sub-agents via the Agent SDK, triggered by
a hook or manual invocation. Both agents share this CLAUDE.md as their primary
context document.

---

## Extraction checklist
When this project reaches a stable state, the following will be extracted
into blcg-starter-template:

- [x] Next.js + Tailwind + TypeScript base configuration
- [x] Clerk authentication setup and middleware
- [ ] Supabase client configuration and type generation setup
- [x] /components/ui primitive library
- [x] /lib/config.ts environment variable validation pattern
- [x] Brand token system (brand.ts + @theme pattern)
- [x] BrandLogo component (swap-ready for client rebranding)
- [ ] Standard API route response shape
- [ ] GitHub Actions CI/CD workflow file
- [x] .env.example template
- [x] Base Tailwind configuration with brand design tokens
- [ ] This CLAUDE.md adapted as a generic template
