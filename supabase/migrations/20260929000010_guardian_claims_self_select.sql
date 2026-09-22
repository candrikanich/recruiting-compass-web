-- #912: server/api/guardian/status.get.ts reads the caller's own
-- guardian_claims row (guardian_email, status, expires_at only -- never
-- token) but guardian_claims has RLS enabled with zero policies AND
-- `revoke all on table public.guardian_claims from anon, authenticated`
-- from its creation (20260926000000) -- an RLS policy alone can't restore
-- privileges a table-level REVOKE already stripped, so a session-scoped
-- client would still get a permission error on every column, RLS policy
-- notwithstanding (review finding on PR #963: status.get.ts's `const {
-- data: claim } = ...` silently drops that error and reports "no claim").
--
-- Fix: grant SELECT on exactly the columns status.get.ts (and any future
-- self-service reader) legitimately needs -- never `token`, which the
-- table's original blanket REVOKE keeps unreachable regardless of this
-- grant, same intent as 20260928000011's column-level REVOKE for
-- family_invitations.pending_player_details.
--
-- server/api/guardian/resend.post.ts still needs to read/write `token`
-- itself (to email a fresh one and to revoke/reissue), which the column
-- staying ungranted here also blocks for the `authenticated` role -- it
-- stays on the service-role client, documented as an intentional #912
-- exception in that file rather than migrated here. A safe migration needs
-- SECURITY DEFINER RPCs without duplicating guardianGate.ts's
-- resolveGuardianLock eligibility predicate in SQL (that file's own
-- comments warn against a second copy of it) -- real design work for its
-- own pass.

CREATE POLICY "guardian_claims_select_own" ON "public"."guardian_claims"
  FOR SELECT
  USING ("player_user_id" = "auth"."uid"());

GRANT SELECT ("id", "player_user_id", "guardian_email", "status", "created_at", "expires_at")
  ON "public"."guardian_claims" TO "authenticated";
