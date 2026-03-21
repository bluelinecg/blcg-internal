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
**Phase**: Initial setup and proof of concept
**Live URL**: https://admin.bluelinecg.com
**Repo**: github.com/[personal-account]/blcg-internal

**Completed**:
- GitHub repo created and connected to Vercel
- Vercel auto-deploy pipeline active
- Custom subdomain admin.bluelinecg.com live and SSL confirmed
- DNS managed via Wix (temporary)

**Next steps**:
- Initialize Next.js project with App Router and TypeScript
- Install and configure Tailwind CSS
- Install and configure Clerk authentication
- Install and configure Supabase client
- Build authenticated dashboard shell with sidebar navigation
- Build client/customer management module (first core feature)

---

## Extraction checklist
When this project reaches a stable state, the following will be extracted
into blcg-starter-template:

- [ ] Next.js + Tailwind + TypeScript base configuration
- [ ] Clerk authentication setup and middleware
- [ ] Supabase client configuration and type generation setup
- [ ] /components/ui primitive library
- [ ] /lib/config.ts environment variable validation pattern
- [ ] Standard API route response shape
- [ ] GitHub Actions CI/CD workflow file
- [ ] .env.example template
- [ ] Base Tailwind configuration with design tokens
- [ ] This CLAUDE.md adapted as a generic template
