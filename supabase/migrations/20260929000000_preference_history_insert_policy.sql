-- #912: server/api/user/preferences/history.post.ts is the only route that
-- writes preference_history, and it only ever inserts a row for the
-- caller's own user_id/changed_by (never a client-supplied actor id) --
-- see historySchema in that file, which has no user-id field at all; both
-- come from requireAuth(event).id server-side. preference_history had no
-- INSERT policy at all (only the two pre-existing self-scoped SELECT
-- policies), so swapping that route off the service-role client needs one.

CREATE POLICY "preference_history_insert_own" ON "public"."preference_history"
  FOR INSERT
  WITH CHECK (("user_id" = "auth"."uid"()) AND ("changed_by" = "auth"."uid"()));
