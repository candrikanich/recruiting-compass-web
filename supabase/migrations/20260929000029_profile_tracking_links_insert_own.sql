-- #912: server/api/player/profile/tracking-links/[coachId].post.ts inserts
-- a profile_tracking_links row for the caller's own player_profiles.id
-- (profile_id resolved server-side from player_profiles WHERE user_id =
-- auth.uid(), never a client-supplied profile id). profile_tracking_links
-- only had a SELECT policy (self-scoped via profile_id) -- no INSERT
-- policy at all, so a session-scoped client would get zero rows inserted.
-- ref_token is generated server-side (crypto.getRandomValues), coach_id is
-- caller-supplied but carries no privilege (any coach id is a valid target
-- for a tracking link), so a straight self-scoped WITH CHECK is safe here
-- -- no RPC needed, unlike the family-scoped/token-bearing tables
-- elsewhere in #912.
--
-- Review fix (PR #967): this table was created with the default broad
-- table-level grant (ALL on ALL columns to anon/authenticated), not the
-- REVOKE-then-column-GRANT hardening used elsewhere in #912. The RLS
-- policy alone only checks profile_id -- with the row-level check now
-- passing for the caller's own profile, the still-open column grant would
-- let a direct API call also set view_count/last_viewed_at/created_at
-- (all server-managed: view_count defaults 0 and is only ever incremented
-- elsewhere, created_at defaults now()), forging tracking-link analytics.
-- REVOKE the existing INSERT grant and GRANT it back column-scoped to
-- exactly what the route sets.

REVOKE INSERT ON "public"."profile_tracking_links" FROM "anon", "authenticated";

GRANT INSERT ("profile_id", "coach_id", "ref_token")
  ON "public"."profile_tracking_links" TO "authenticated";

CREATE POLICY "profile_tracking_links_insert_own" ON "public"."profile_tracking_links"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (
    "profile_id" IN (
      SELECT "id" FROM "public"."player_profiles" WHERE "user_id" = "auth"."uid"()
    )
  );
