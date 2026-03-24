# BLCG Internal — Reference

**Live URL**: https://admin.bluelinecg.com
**Repo**: github.com/bluelinecg/blcg-internal

> **Backlog and active work is tracked in the app's Kanban board** (`/tasks`).
> This file is kept only as a reference for environment variables and migration SQL history.

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

---

## Migration SQL log

All migrations have been run in Supabase. Kept here as a permanent record.

### Organizations + Contacts (CRM Data Model)

```sql
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

### Audit Log (Activity Logging)

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

### RLS Policies — Explicit Deny (all 14 tables)

All tables already had RLS enabled. These policies make the deny intent explicit for
`anon` and `authenticated` roles. The `service_role` key (used in all API routes)
bypasses RLS by design and requires no policy.

When Clerk JWT integration is added in the future, replace `deny_authenticated_all`
on relevant tables with selective allow policies.

```sql
-- Pattern applied to all 14 tables:
-- clients, contacts, organizations, proposals, proposal_line_items,
-- projects, milestones, invoices, invoice_line_items, tasks, expenses,
-- audit_log, webhook_endpoints, webhook_deliveries

CREATE POLICY "deny_anon_all" ON <table>
  FOR ALL TO anon
  USING (false) WITH CHECK (false);

CREATE POLICY "deny_authenticated_all" ON <table>
  FOR ALL TO authenticated
  USING (false) WITH CHECK (false);
```

Full migration: `supabase/migrations/20260324000000_rls_policies.sql`
