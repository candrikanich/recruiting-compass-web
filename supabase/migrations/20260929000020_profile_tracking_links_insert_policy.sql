-- Unblocks server/api/player/profile/tracking-links/[coachId].post.ts for
-- #912. profile_tracking_links only ever got a SELECT policy
-- (20260317000000, written for defense-in-depth while every route still
-- used the service-role client) -- no INSERT policy exists at all, so a
-- straight client swap on the write path has nowhere to go under RLS.
--
-- Same self-owned-profile scope as the existing SELECT policy.

CREATE POLICY "profile_tracking_links_insert" ON public.profile_tracking_links
  FOR INSERT WITH CHECK (
    profile_id IN (
      SELECT id FROM public.player_profiles WHERE user_id = auth.uid()
    )
  );
