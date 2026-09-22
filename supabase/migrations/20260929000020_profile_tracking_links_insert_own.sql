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

CREATE POLICY "profile_tracking_links_insert_own" ON "public"."profile_tracking_links"
  FOR INSERT
  WITH CHECK (
    "profile_id" IN (
      SELECT "id" FROM "public"."player_profiles" WHERE "user_id" = "auth"."uid"()
    )
  );
