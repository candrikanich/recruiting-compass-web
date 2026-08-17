-- Allow any family member (parent or player) to log interactions.
--
-- The prior policy "Only players can create interactions" required the caller
-- to hold the 'player' role, which blocked parents from logging interactions
-- on behalf of their athlete even though the app exposes the "Add Interaction"
-- flow to them. Parents manage the athlete's recruiting record, so membership
-- in the family unit plus logged_by = auth.uid() is sufficient authorization;
-- the role gate is dropped.

-- Idempotent: this policy was already applied live to prod out-of-band, so drop
-- the new name too. The migration then converges from any starting state (old
-- policy present, new policy present, or neither) and `supabase db push` is safe
-- to run against prod even though prod already has the new policy live.
DROP POLICY IF EXISTS "Only players can create interactions" ON "public"."interactions";
DROP POLICY IF EXISTS "Family members can create interactions" ON "public"."interactions";

CREATE POLICY "Family members can create interactions"
  ON "public"."interactions"
  FOR INSERT
  WITH CHECK (
    ("family_unit_id" IN (
      SELECT "family_members"."family_unit_id"
      FROM "public"."family_members"
      WHERE ("family_members"."user_id" = "auth"."uid"())
    ))
    AND ("logged_by" = "auth"."uid"())
  );
