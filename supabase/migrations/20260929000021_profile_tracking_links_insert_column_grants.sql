-- Follow-up to 20260929000020 (Qodo review on PR #968): the new INSERT
-- policy checks only profile_id ownership, but Supabase's default
-- table-level INSERT grant to `authenticated` still lets any signed-in
-- player set view_count/last_viewed_at/created_at directly via the REST
-- API for their own profile -- fields the route always leaves at their
-- column defaults, since they're meant to be server/trigger-controlled
-- (populated by profile view tracking, not the link-creation route).
--
-- Narrow to column-level INSERT on exactly what the route writes.

REVOKE INSERT ON public.profile_tracking_links FROM "authenticated";
GRANT INSERT (profile_id, coach_id, ref_token) ON public.profile_tracking_links TO "authenticated";
