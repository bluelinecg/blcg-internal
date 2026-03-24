# Task Todo

This file tracks in-progress implementation tasks for the current session.
It is reset at the start of each new task. See the Kanban board (/tasks) for
the full backlog and project-level tracking.

---

## feature/supabase-rls — Supabase RLS Policies

- [x] Create feature branch `feature/supabase-rls`
- [ ] Create `supabase/migrations/20260324000000_rls_policies.sql`
- [ ] Append migration SQL to `TASKS.md` log
- [ ] Commit + open PR
- [ ] User runs migration in Supabase dashboard

## Verification
- [ ] No existing API functionality broken (service_role bypasses RLS)
- [ ] Migration runs without errors in Supabase SQL editor
