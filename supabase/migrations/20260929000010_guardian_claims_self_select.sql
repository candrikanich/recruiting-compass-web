-- #912: server/api/guardian/status.get.ts reads the caller's own
-- guardian_claims row (guardian_email, status, expires_at only -- never
-- token) but guardian_claims has RLS enabled with zero policies, so a
-- session-scoped client gets nothing back.
--
-- Adding a plain self-scoped SELECT policy would also let the player read
-- `token` directly via PostgREST (RLS is row-scoped, not column-scoped) --
-- status.get.ts's own doc comment: "Never returns `token` ... handing it
-- to the player would let a minor confirm their own account." Column-level
-- REVOKE closes that gap the same way 20260928000011 did for
-- family_invitations.pending_player_details.
--
-- server/api/guardian/resend.post.ts still needs to read/write `token`
-- itself (to email a fresh one and to revoke/reissue), which this REVOKE
-- also blocks for the `authenticated` role -- it stays on the service-role
-- client, documented as an intentional #912 exception in that file rather
-- than migrated here. A safe migration needs SECURITY DEFINER RPCs without
-- duplicating guardianGate.ts's resolveGuardianLock eligibility predicate
-- in SQL (that file's own comments warn against a second copy of it) --
-- real design work for its own pass.

CREATE POLICY "guardian_claims_select_own" ON "public"."guardian_claims"
  FOR SELECT
  USING ("player_user_id" = "auth"."uid"());

REVOKE SELECT ("token") ON "public"."guardian_claims" FROM "anon", "authenticated";
