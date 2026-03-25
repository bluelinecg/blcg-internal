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
