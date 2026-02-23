-- Migration 040: Enable Row Level Security on account_links table
--
-- The account_links table stores legacy parent-child relationships and is used
-- in authorization decisions. Without RLS, any authenticated user can query all
-- parent-child links system-wide (IDOR vulnerability).
--
-- Policy design:
--   - Users can only view links they are party to (parent OR player side)
--   - Only the parent can create/update/delete links they initiated

ALTER TABLE account_links ENABLE ROW LEVEL SECURITY;

-- SELECT: users can only see links they are directly party to
DROP POLICY IF EXISTS "account_links_select_own" ON account_links;

CREATE POLICY "account_links_select_own" ON account_links
  FOR SELECT
  USING (
    parent_user_id = auth.uid()
    OR player_user_id = auth.uid()
  );

-- INSERT: only parents can create account links
DROP POLICY IF EXISTS "account_links_insert_parent" ON account_links;

CREATE POLICY "account_links_insert_parent" ON account_links
  FOR INSERT
  WITH CHECK (parent_user_id = auth.uid());

-- UPDATE: only the parent who created the link can update it
DROP POLICY IF EXISTS "account_links_update_parent" ON account_links;

CREATE POLICY "account_links_update_parent" ON account_links
  FOR UPDATE
  USING (parent_user_id = auth.uid());

-- DELETE: only the parent who created the link can delete it
DROP POLICY IF EXISTS "account_links_delete_parent" ON account_links;

CREATE POLICY "account_links_delete_parent" ON account_links
  FOR DELETE
  USING (parent_user_id = auth.uid());
