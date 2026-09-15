-- Allow a creator to SELECT the family_units row they created even before their
-- own family_members row lands. Closes a race on the "one family per creator"
-- conflict-recovery path: two concurrent createFamily calls for the same user
-- can 23505 on idx_family_units_one_per_creator, and the loser must read the
-- winner's row back to return it -- but the old family_units_select policy only
-- authorized via family_members membership, which the winner's insert may not
-- have committed yet. created_by_user_id = auth.uid() is always self-evident and
-- safe to authorize directly, independent of membership-row timing.

DROP POLICY IF EXISTS "family_units_select" ON "public"."family_units";

CREATE POLICY "family_units_select" ON "public"."family_units" FOR SELECT USING (
  ("created_by_user_id" = "auth"."uid"())
  OR ("id" IN ( SELECT "family_members"."family_unit_id"
     FROM "public"."family_members"
    WHERE ("family_members"."user_id" = "auth"."uid"())))
);
