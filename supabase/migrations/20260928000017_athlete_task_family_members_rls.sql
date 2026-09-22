-- #926: athlete_task's SELECT/INSERT/UPDATE policies gate on
-- get_linked_user_ids(), which only recognizes the legacy account_links
-- table, not family_members. Confirmed no app code writes to account_links
-- anymore (family creation/invite-accept never touch it), so a parent
-- linked to their player purely through family_members -- the current
-- model, and presumably most or all pairs by now -- sees zero rows here
-- under RLS. This silently corrupts (doesn't leak) any route that reads
-- athlete_task through a session-scoped client for such a pair, e.g. the
-- #912 migrations of athlete/phase.get.ts and
-- athlete/status/recalculate.post.ts (the latter routed around this via a
-- SECURITY DEFINER RPC instead of waiting on this fix).
--
-- Additive: OR in can_access_family_player_prefs(athlete_id) (added in
-- 20260821000010 for this exact self-or-linked-player shape) alongside the
-- existing get_linked_user_ids() clause, rather than replacing it --
-- account_links-linked pairs (if any remain) keep working unchanged.

DROP POLICY IF EXISTS "Users can view own and linked athlete tasks" ON "public"."athlete_task";
CREATE POLICY "Users can view own and linked athlete tasks" ON "public"."athlete_task"
  FOR SELECT USING (
    athlete_id IN (SELECT user_id FROM public.get_linked_user_ids())
    OR public.can_access_family_player_prefs(athlete_id)
  );

DROP POLICY IF EXISTS "Linked users can create athlete task records" ON "public"."athlete_task";
CREATE POLICY "Linked users can create athlete task records" ON "public"."athlete_task"
  FOR INSERT WITH CHECK (
    athlete_id IN (SELECT user_id FROM public.get_linked_user_ids())
    OR public.can_access_family_player_prefs(athlete_id)
  );

DROP POLICY IF EXISTS "Linked users can update athlete task status" ON "public"."athlete_task";
CREATE POLICY "Linked users can update athlete task status" ON "public"."athlete_task"
  FOR UPDATE
  USING (
    athlete_id IN (SELECT user_id FROM public.get_linked_user_ids())
    OR public.can_access_family_player_prefs(athlete_id)
  )
  WITH CHECK (
    athlete_id IN (SELECT user_id FROM public.get_linked_user_ids())
    OR public.can_access_family_player_prefs(athlete_id)
  );
