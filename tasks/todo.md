# Write Missing DB Migrations

## Status: Complete — Pending Run in Supabase

## Overview
Create a migration file for 9 tables that exist in the live Supabase instance but had no
`CREATE TABLE` statement in the repo. Without these, any fresh-DB setup fails at the RLS
policies migration (20260324000000) which references tables that don't yet exist.

## Key Decision: Timestamp 20260323

The new migration is stamped `20260323000000` — intentionally between the initial schema
(20260322) and the RLS policies migration (20260324). This ensures the tables exist before
the policies that reference them are applied.

Naming it `20260326001000` (as originally drafted) would have placed it AFTER the RLS migration,
leaving a fresh-DB setup broken.

## Tables Created

| Table | Dependencies | Notes |
|-------|-------------|-------|
| `organizations` | — | CRM: companies/accounts |
| `contacts` | organizations | CRM: individuals |
| `audit_log` | — | Append-only, no updated_at |
| `pipelines` | — | Pipeline definitions |
| `pipeline_stages` | pipelines (cascade) | Ordered columns |
| `pipeline_items` | pipelines, pipeline_stages, contacts, clients | Deal cards |
| `pipeline_stage_history` | pipeline_items, pipeline_stages (cascade) | Stage transition log — referenced in lib/db/pipelines.ts but missing from backlog #1's original list |
| `webhook_endpoints` | — | Registered destination URLs |
| `webhook_deliveries` | webhook_endpoints (cascade) | Per-attempt delivery log |

## RLS Split

| Table group | Policies location |
|------------|------------------|
| contacts, organizations, audit_log, pipelines, pipeline_stages, pipeline_items | `20260324000000_rls_policies.sql` (pre-existing) |
| pipeline_stage_history, webhook_endpoints, webhook_deliveries | `20260323000000_missing_tables.sql` (this migration) |

## Action Required
- [ ] Run migration in Supabase dashboard: paste contents of `supabase/migrations/20260323000000_missing_tables.sql`
  - Note: tables already exist in live DB — all `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, and `CREATE OR REPLACE TRIGGER` statements are idempotent
  - Only net-new effect on live DB: RLS policies for pipeline_stage_history, webhook_endpoints, and webhook_deliveries

## Verification (Fresh DB)
- [ ] Run all 6 migrations in order — zero errors
- [ ] `select count(*) from contacts` — succeeds
- [ ] `select count(*) from organizations` — succeeds
- [ ] `select count(*) from audit_log` — succeeds
- [ ] `select count(*) from pipelines` — succeeds
- [ ] `select count(*) from pipeline_stage_history` — succeeds
- [ ] `select count(*) from webhook_endpoints` — succeeds
- [ ] `select count(*) from webhook_deliveries` — succeeds

## Files Changed
- `supabase/migrations/20260323000000_missing_tables.sql` — NEW

## No App Code Changes
This is a pure schema migration. No TypeScript changes were required — the app code
in lib/db/ already assumed these tables existed.

---

# AI Developer Module — Backlog

A packaged "AI Developer" offering: a chatbot-driven maintenance and support layer
shipped with every client web app. Non-technical users describe bugs or feature requests
in plain English; the AI triages, explains, and (depending on tier) proposes or deploys fixes.
Hosted and billed client-side — BLCG is the builder, not the ongoing operator.

Full concept and rationale: stored in memory at `project_ai_developer_module.md`.

---

## Tier 1 — Automated Intake & Triage
**Status: Backlog**

The fully-automated layer. No human in the loop. Buildable now.

### Tasks
- [ ] Design the `ai-developer` package structure within the app template
- [ ] Build `AIDeveloperChat` component — chat UI embeddable in any client app
- [ ] Integrate Claude API — client supplies their own Anthropic API key via env var
- [ ] Implement system prompt with injected codebase context (file tree + key patterns)
- [ ] Build agent tool: search codebase / documentation
- [ ] Build agent tool: create structured GitHub issue from conversation
- [ ] Implement severity triage logic (P1 blocker vs. minor vs. feature request)
- [ ] Implement "known issue" lookup before creating duplicate tickets
- [ ] Add audit logging for all AI actions (leverage existing audit_log pattern)
- [ ] Write tests for intake flow, triage classification, and issue creation
- [ ] Document per-client onboarding setup (API key, repo connection, codebase indexing)

---

## Tier 2 — AI-Drafted, Human-Approved Fixes
**Status: Backlog (after Tier 1 is stable)**

AI proposes fixes; a BLCG dev reviews asynchronously; automated deploy on approval.
Requires staging environment and an approval workflow UI.

### Tasks
- [ ] Design approval workflow: AI proposes fix → BLCG review queue → approve/reject
- [ ] Build fix proposal UI — non-technical plain-language explanation of what changed
- [ ] Build BLCG reviewer interface — diff view + approve/reject action
- [ ] Integrate with CI/CD: trigger staging deploy on approval
- [ ] Build agent tool: read and write files within the client codebase (sandboxed)
- [ ] Build agent tool: trigger staging deploy pipeline
- [ ] Implement escalation logic — agent must recognize when a request is out of scope
- [ ] Add guardrails: agent cannot touch auth, security config, or DB migrations autonomously
- [ ] Write tests for fix proposal generation, approval flow, and deploy trigger
- [ ] Define SLA and pricing model for Tier 2 (BLCG async review time)

---

## Tier 3 — Autonomous Low-Risk Deploys
**Status: Backlog (roadmap — 12–24 months)**

Fully autonomous deploys for pre-classified low-risk changes. Client approves via staging
preview; no BLCG involvement required. Escalates complex or risky changes automatically.

### Tasks
- [ ] Define and document the "low-risk change" classification criteria
- [ ] Build change risk classifier — gates autonomous deploy vs. escalation path
- [ ] Build client-facing staging preview and self-serve approve/reject UI
- [ ] Implement autonomous deploy pipeline (client approves, CI/CD fires)
- [ ] Build escalation routing — sends high-risk requests back to BLCG Tier 2 queue
- [ ] Security audit: review agent permissions, sandboxing, and blast radius
- [ ] Write end-to-end tests covering autonomous deploy + rollback on failure
- [ ] Define pricing model and client contract language for autonomous tier
