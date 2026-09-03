-- Closes advisor findings introduced by 20260916000000/20260917000000:
-- Supabase's default-privilege grants to anon/authenticated attach to a new
-- function after its inline CREATE FUNCTION statement, so the REVOKE inside
-- 20260916000000 didn't remove anon's EXECUTE on family_can_write. Neither
-- create_family_subscription (fires only via the AFTER INSERT trigger on
-- family_units) nor touch_updated_at (fires only via BEFORE UPDATE triggers)
-- should be callable directly by any client role.

revoke all on function public.family_can_write(uuid) from public, anon;
grant execute on function public.family_can_write(uuid) to authenticated, service_role;

revoke all on function public.create_family_subscription() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;

alter function public.touch_updated_at() set search_path = public;
