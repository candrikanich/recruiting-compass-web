-- Qodo review on PR #991: editing 20260929000032's SQL body (to make it a
-- no-op) only repairs a *fresh* apply of the migration set -- Supabase
-- tracks applied migrations by timestamp/version, not content hash, so an
-- environment whose schema_migrations already recorded 20260929000032 as
-- applied would never re-run this changed body and could still carry the
-- broad policies if it happened to run the old (pre-rename) content.
--
-- Verified via Supabase MCP execute_sql against both prod (lrzsenidegcqhwzwncve)
-- and QA/E2E (xpxzhqghxecsjhvklsqg) on 2026-09-23: neither currently has the
-- "Family can insert player-owned notifications", "Family can view
-- player-owned notifications", or resurrected "Users can view own and
-- linked recommendation letters" policies -- both environments already
-- converged to the secure (031) state before this was flagged. This
-- migration is defense-in-depth for any other environment (local dev, a
-- stale branch/snapshot) that might not have, not a fix for a live leak.
DROP POLICY IF EXISTS "Family can insert player-owned notifications" ON public.notifications;
DROP POLICY IF EXISTS "Family can view player-owned notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own and linked recommendation letters" ON public.recommendation_letters;
