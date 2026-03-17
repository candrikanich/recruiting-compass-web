-- RLS policies for player profile tables
-- Tables: player_profiles, profile_tracking_links, profile_views
-- Note: all API routes use useSupabaseAdmin() (service role) which bypasses RLS.
-- These policies govern direct client queries and provide defense-in-depth.

-- ── player_profiles ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "player_profiles_select_own"   ON player_profiles;
DROP POLICY IF EXISTS "player_profiles_select_public" ON player_profiles;
DROP POLICY IF EXISTS "player_profiles_insert"       ON player_profiles;
DROP POLICY IF EXISTS "player_profiles_update"       ON player_profiles;

ALTER TABLE player_profiles ENABLE ROW LEVEL SECURITY;

-- Authenticated players can read their own profile
CREATE POLICY "player_profiles_select_own" ON player_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Anyone (including anon) can read published profiles — powers the public /p/[slug] route
CREATE POLICY "player_profiles_select_public" ON player_profiles
  FOR SELECT USING (is_published = true);

-- Players can create their own profile row
CREATE POLICY "player_profiles_insert" ON player_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Players can update their own profile
CREATE POLICY "player_profiles_update" ON player_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- No user-facing DELETE — cascade deletes handle cleanup via users/family_units FK

-- ── profile_tracking_links ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "profile_tracking_links_select" ON profile_tracking_links;

ALTER TABLE profile_tracking_links ENABLE ROW LEVEL SECURITY;

-- Players can view tracking links for profiles they own
CREATE POLICY "profile_tracking_links_select" ON profile_tracking_links
  FOR SELECT USING (
    profile_id IN (
      SELECT id FROM player_profiles WHERE user_id = auth.uid()
    )
  );

-- No public access. Inserts/lookups are done via service role in API routes.

-- ── profile_views ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "profile_views_select" ON profile_views;

ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

-- Players can view the view log for profiles they own
CREATE POLICY "profile_views_select" ON profile_views
  FOR SELECT USING (
    profile_id IN (
      SELECT id FROM player_profiles WHERE user_id = auth.uid()
    )
  );

-- No public INSERT policy. View recording is done via service role in API routes.
