-- Migration 041: Enable Row Level Security on tables missing coverage
--
-- Run `SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname='public'`
-- to verify current state before applying.
--
-- Tables covered: notifications, profiles, social_media_posts, preference_history
--
-- NOTE: Apply selectively based on actual table existence in your Supabase project.
-- Some tables may be managed by Supabase Auth (profiles) — verify access model before applying.

-- ── notifications ──────────────────────────────────────────────────────────────
-- User-specific notifications; each row has a user_id column.

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_own" ON notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE USING (user_id = auth.uid());

-- Service role (used for system-generated notifications) bypasses RLS automatically.


-- ── profiles ───────────────────────────────────────────────────────────────────
-- User profile data; each row has a user_id column.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "profiles_delete_own" ON profiles
  FOR DELETE USING (user_id = auth.uid());


-- ── social_media_posts ─────────────────────────────────────────────────────────
-- Scraped social posts linked to coaches. Access scoped to the family who owns the coach.
-- Coaches are scoped to family_unit_id, so join through coaches table.

ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_media_posts_select_family" ON social_media_posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN family_members fm ON fm.family_unit_id = c.family_unit_id
      WHERE c.id = social_media_posts.coach_id
        AND fm.user_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE handled by service role (sync jobs) only — no user policies needed.


-- ── preference_history ─────────────────────────────────────────────────────────
-- User preference change history; each row has a user_id column.

ALTER TABLE preference_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "preference_history_select_own" ON preference_history
  FOR SELECT USING (user_id = auth.uid());

-- History is append-only from the server side; no user INSERT/UPDATE/DELETE policies.
