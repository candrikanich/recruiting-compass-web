-- Allow a linked parent to help check off recruiting-timeline tasks.
--
-- The athlete_task INSERT/UPDATE policies were self-only
-- (athlete_id = auth.uid()), so a parent viewing their athlete's timeline could
-- see tasks (SELECT is scoped to get_linked_user_ids) but could not complete
-- them. Widen INSERT/UPDATE to the same linked scope the SELECT policy already
-- uses: get_linked_user_ids() = self + accepted account_links (both directions).
--
-- Idempotent: this change was already applied live to prod out-of-band, so the
-- new policy names are dropped first too. The migration converges from any
-- starting state and `supabase db push` is safe against prod and local DBs.

DROP POLICY IF EXISTS "Athletes can create own task records" ON "public"."athlete_task";
DROP POLICY IF EXISTS "Linked users can create athlete task records" ON "public"."athlete_task";

CREATE POLICY "Linked users can create athlete task records"
  ON "public"."athlete_task"
  FOR INSERT
  WITH CHECK (
    athlete_id IN (SELECT user_id FROM get_linked_user_ids())
  );

DROP POLICY IF EXISTS "Athletes can update own task status" ON "public"."athlete_task";
DROP POLICY IF EXISTS "Linked users can update athlete task status" ON "public"."athlete_task";

CREATE POLICY "Linked users can update athlete task status"
  ON "public"."athlete_task"
  FOR UPDATE
  USING (
    athlete_id IN (SELECT user_id FROM get_linked_user_ids())
  )
  WITH CHECK (
    athlete_id IN (SELECT user_id FROM get_linked_user_ids())
  );
