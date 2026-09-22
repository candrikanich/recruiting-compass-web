-- Unblocks server/api/notifications/generate.post.ts for #912.
--
-- notifications only ever had self-owned INSERT policies (auth.uid() =
-- user_id), but this route is explicitly family-shared -- a parent's call
-- is redirected to their linked athlete (resolveActingAthleteId), and
-- notificationGenerator.ts's six insert call sites all write
-- user_id: <the resolved athlete id>, which is the caller's own id only
-- when the caller *is* the athlete. A parent-triggered generate has
-- nowhere to insert under RLS as-is.
--
-- Additive: OR in can_access_family_player_prefs(user_id) alongside the
-- existing self-owned policies (added in 20260821000010 for the same
-- self-or-linked-player shape) rather than replacing them.

CREATE POLICY "Family can insert player-owned notifications" ON public.notifications
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR public.can_access_family_player_prefs(user_id)
  );

-- notifications SELECT was self-only too -- generateOfferNotifications /
-- generateRecommendationNotifications / generateEventNotifications /
-- generateCoachFollowupNotifications each dedupe-check existing
-- notifications for the resolved athlete before inserting. Without this, a
-- parent-triggered generate can't see its own prior inserts and would
-- create duplicates on repeat calls -- not a leak, but breaks the dedupe.
CREATE POLICY "Family can view player-owned notifications" ON public.notifications
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.can_access_family_player_prefs(user_id)
  );

-- recommendation_letters' only SELECT policy gates on get_linked_user_ids(),
-- the legacy account_links-only helper -- same staleness gap already fixed
-- for athlete_task in 20260928000017. A parent linked purely through
-- family_members sees zero rows here, so generateRecommendationNotifications
-- silently generates nothing for that pair. Additive OR, existing policy
-- untouched for any account_links-linked pairs that still exist.
DROP POLICY IF EXISTS "Users can view own and linked recommendation letters" ON public.recommendation_letters;
CREATE POLICY "Users can view own and linked recommendation letters" ON public.recommendation_letters
  FOR SELECT USING (
    user_id IN (SELECT user_id FROM public.get_linked_user_ids())
    OR public.can_access_family_player_prefs(user_id)
  );
