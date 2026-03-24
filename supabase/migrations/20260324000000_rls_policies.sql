-- RLS Policies — explicit deny for anon and authenticated roles
--
-- All 14 tables already have RLS enabled (from initial schema migration).
-- All app data flows through Next.js API routes using the service_role key,
-- which bypasses RLS entirely. These policies make the deny intent explicit
-- and serve as defense in depth.
--
-- service_role: always bypasses RLS — no policy needed or possible.
-- anon: no access — must go through authenticated API routes.
-- authenticated: no access — Clerk users do not authenticate via Supabase Auth.
--   When Clerk JWT integration is added in the future, replace the
--   "deny_authenticated_all" policies on the relevant tables with
--   selective allow policies (e.g. FOR SELECT USING (true)).

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------

CREATE POLICY "deny_anon_all" ON clients
  FOR ALL TO anon
  USING (false) WITH CHECK (false);

CREATE POLICY "deny_authenticated_all" ON clients
  FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- contacts
-- ---------------------------------------------------------------------------

CREATE POLICY "deny_anon_all" ON contacts
  FOR ALL TO anon
  USING (false) WITH CHECK (false);

CREATE POLICY "deny_authenticated_all" ON contacts
  FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------

CREATE POLICY "deny_anon_all" ON organizations
  FOR ALL TO anon
  USING (false) WITH CHECK (false);

CREATE POLICY "deny_authenticated_all" ON organizations
  FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- proposals
-- ---------------------------------------------------------------------------

CREATE POLICY "deny_anon_all" ON proposals
  FOR ALL TO anon
  USING (false) WITH CHECK (false);

CREATE POLICY "deny_authenticated_all" ON proposals
  FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- proposal_line_items
-- ---------------------------------------------------------------------------

CREATE POLICY "deny_anon_all" ON proposal_line_items
  FOR ALL TO anon
  USING (false) WITH CHECK (false);

CREATE POLICY "deny_authenticated_all" ON proposal_line_items
  FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------

CREATE POLICY "deny_anon_all" ON projects
  FOR ALL TO anon
  USING (false) WITH CHECK (false);

CREATE POLICY "deny_authenticated_all" ON projects
  FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- milestones
-- ---------------------------------------------------------------------------

CREATE POLICY "deny_anon_all" ON milestones
  FOR ALL TO anon
  USING (false) WITH CHECK (false);

CREATE POLICY "deny_authenticated_all" ON milestones
  FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------

CREATE POLICY "deny_anon_all" ON invoices
  FOR ALL TO anon
  USING (false) WITH CHECK (false);

CREATE POLICY "deny_authenticated_all" ON invoices
  FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- invoice_line_items
-- ---------------------------------------------------------------------------

CREATE POLICY "deny_anon_all" ON invoice_line_items
  FOR ALL TO anon
  USING (false) WITH CHECK (false);

CREATE POLICY "deny_authenticated_all" ON invoice_line_items
  FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------

CREATE POLICY "deny_anon_all" ON tasks
  FOR ALL TO anon
  USING (false) WITH CHECK (false);

CREATE POLICY "deny_authenticated_all" ON tasks
  FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------

CREATE POLICY "deny_anon_all" ON expenses
  FOR ALL TO anon
  USING (false) WITH CHECK (false);

CREATE POLICY "deny_authenticated_all" ON expenses
  FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------

CREATE POLICY "deny_anon_all" ON audit_log
  FOR ALL TO anon
  USING (false) WITH CHECK (false);

CREATE POLICY "deny_authenticated_all" ON audit_log
  FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- webhook_endpoints
-- ---------------------------------------------------------------------------

CREATE POLICY "deny_anon_all" ON webhook_endpoints
  FOR ALL TO anon
  USING (false) WITH CHECK (false);

CREATE POLICY "deny_authenticated_all" ON webhook_endpoints
  FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- webhook_deliveries
-- ---------------------------------------------------------------------------

CREATE POLICY "deny_anon_all" ON webhook_deliveries
  FOR ALL TO anon
  USING (false) WITH CHECK (false);

CREATE POLICY "deny_authenticated_all" ON webhook_deliveries
  FOR ALL TO authenticated
  USING (false) WITH CHECK (false);
