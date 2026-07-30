-- Security advisor WARN pass: SECURITY DEFINER functions exposed to
-- anon/authenticated via PostgREST RPC, and mutable search_path.
--
-- Applied live to xpxzhqghxecsjhvklsqg via MCP as two migrations
-- (security_advisor_warn_hardening, security_advisor_warn_hardening_public_grant_fix)
-- and consolidated here into one file for the repo history. See
-- claude/database.md "Security advisor WARN pass" for the verification
-- record (usage audit, live-catalog cross-check, E2E confirmation).
--
-- Revoke anon on RLS-load-bearing helper functions. authenticated keeps
-- EXECUTE because these are called from inside RLS USING/WITH CHECK clauses
-- for authenticated-only queries (family_members SELECT, athlete_task
-- INSERT/UPDATE/DELETE) -- confirmed via pg_policy on the live DB.
--
-- Postgres grants EXECUTE to PUBLIC by default on function creation, and
-- anon/authenticated implicitly inherit through PUBLIC membership -- a
-- REVOKE targeting only the named roles has no effect unless PUBLIC is
-- also stripped. service_role is unaffected throughout: it holds its own
-- explicit GRANT from the baseline migration, independent of PUBLIC.
REVOKE EXECUTE ON FUNCTION public.get_user_family_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_family_ids() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_data_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_data_owner(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.user_is_family_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_is_family_member(uuid) TO authenticated;

-- Revoke anon + authenticated (via PUBLIC) on SECURITY DEFINER functions
-- with zero RLS policy dependents (verified via pg_policy) and zero
-- client-side .rpc() callers (verified via codebase grep). handle_new_user
-- and trigger_push_notification are trigger functions (on_auth_user_created,
-- push_on_notification_insert) that fire on DML regardless of grants.
-- increment_profile_link_view is only called server-side via the
-- service-role client, which bypasses grants entirely.
REVOKE EXECUTE ON FUNCTION public.is_parent_viewing_athlete(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_accessible_athletes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_primary_family_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_parent_viewing_linked_athlete(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_audit_log(uuid, character varying, character varying, uuid, character varying, text, jsonb, jsonb, inet, text, character varying, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_expired_audit_logs() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trigger_push_notification() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_profile_link_view(uuid) FROM PUBLIC;

-- Also explicitly revoke from the named roles (belt-and-suspenders --
-- redundant once PUBLIC is stripped, but matches what the advisor names).
REVOKE EXECUTE ON FUNCTION public.is_parent_viewing_athlete(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_accessible_athletes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_primary_family_id() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_parent_viewing_linked_athlete(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_audit_log(uuid, character varying, character varying, uuid, character varying, text, jsonb, jsonb, inet, text, character varying, text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_expired_audit_logs() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_push_notification() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_profile_link_view(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_family_ids() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_data_owner(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_is_family_member(uuid) FROM anon;

-- Harden mutable search_path on functions flagged by the advisor. Pure
-- hygiene against search_path hijacking -- no behavior or grant change.
ALTER FUNCTION public.is_parent_viewing_athlete(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.set_player_profiles_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_follow_up_reminders_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_profile_link_view(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_accessible_athletes() SET search_path = public, pg_temp;
ALTER FUNCTION public.trigger_push_notification() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
