-- Phase 1 RLS security hotfix (audit finding, see planning/audit-2026-07-27-findings.md).
--
-- Four independent fixes, each closing an active cross-tenant/authz hole. Every
-- policy is DROP IF EXISTS + CREATE so this migration is safe to re-run.

-- 1. Events: "for own schools" SELECT/UPDATE/DELETE policies used
--    `school_id IS NULL OR school_id IN (...)`. Since events.school_id is
--    nullable, the IS NULL branch made the whole predicate true for ANY
--    school-less event regardless of who owns it — any authenticated user
--    could read/update/delete any other user's school-less events. These
--    policies are permissive duplicates of "Users can view/update/delete
--    their own events" (which correctly gate on `user_id = auth.uid()`);
--    fix by gating on the same ownership column instead of the nullable
--    school_id escape hatch.

DROP POLICY IF EXISTS "Users can view events for own schools" ON "public"."events";
CREATE POLICY "Users can view events for own schools" ON "public"."events"
  FOR SELECT USING (("user_id" = "auth"."uid"()));

DROP POLICY IF EXISTS "Users can update events for own schools" ON "public"."events";
CREATE POLICY "Users can update events for own schools" ON "public"."events"
  FOR UPDATE USING (("user_id" = "auth"."uid"()));

DROP POLICY IF EXISTS "Users can delete events for own schools" ON "public"."events";
CREATE POLICY "Users can delete events for own schools" ON "public"."events"
  FOR DELETE USING (("user_id" = "auth"."uid"()));

-- 2. get_athlete_status(p_user_id): SECURITY DEFINER function with no internal
--    caller check, previously EXECUTE-granted to anon + authenticated — any
--    signed-in (or anonymous) caller could probe any athlete's status by UUID
--    via `rpc('get_athlete_status', { p_user_id: <any-uuid> })`. The only
--    legitimate caller is server/api/athlete/status.get.ts, which already uses
--    the service-role client (bypasses grants entirely). Revoke the
--    unnecessary client-facing grants rather than adding an in-function check,
--    since no client-side caller needs this.

REVOKE ALL ON FUNCTION "public"."get_athlete_status"("p_user_id" "uuid") FROM "anon";
REVOKE ALL ON FUNCTION "public"."get_athlete_status"("p_user_id" "uuid") FROM "authenticated";

-- 3. family_units_update: no WITH CHECK, so any family member (not just the
--    creator) could reassign created_by_user_id to themselves and then delete
--    the whole family via family_units_delete. Add a WITH CHECK that requires
--    created_by_user_id in the new row to match the row's current value. The
--    subquery re-reads the row by primary key; because RLS WITH CHECK runs
--    against the proposed tuple before it lands in the heap, this subquery
--    still observes the pre-update value for that row, so it correctly
--    detects any attempt to change created_by_user_id.

DROP POLICY IF EXISTS "family_units_update" ON "public"."family_units";
CREATE POLICY "family_units_update" ON "public"."family_units"
  FOR UPDATE
  USING (("id" IN ( SELECT "family_members"."family_unit_id"
     FROM "public"."family_members"
    WHERE ("family_members"."user_id" = "auth"."uid"()))))
  WITH CHECK (
    ("id" IN ( SELECT "family_members"."family_unit_id"
       FROM "public"."family_members"
      WHERE ("family_members"."user_id" = "auth"."uid"())))
    AND ("created_by_user_id" = ( SELECT "fu"."created_by_user_id"
           FROM "public"."family_units" "fu"
          WHERE ("fu"."id" = "family_units"."id")))
  );

-- 4. "Users can insert interactions" (legacy account_links-era policy,
--    coexists as a permissive OR with "Only players can create interactions")
--    only checked school access, not who the row claims logged it — an
--    authenticated user could insert an interaction with an arbitrary
--    `logged_by` (forged attribution). Add the same attribution requirement
--    already enforced by the sibling "Users can update/delete own
--    interactions" policies.

DROP POLICY IF EXISTS "Users can insert interactions" ON "public"."interactions";
CREATE POLICY "Users can insert interactions" ON "public"."interactions"
  FOR INSERT WITH CHECK (
    ("logged_by" = "auth"."uid"())
    AND ("school_id" IN ( SELECT "schools"."id"
           FROM "public"."schools"
          WHERE ("schools"."user_id" IN ( SELECT "get_linked_user_ids"."user_id"
                   FROM "public"."get_linked_user_ids"() "get_linked_user_ids"("user_id")))))
  );

COMMENT ON POLICY "Users can insert interactions" ON "public"."interactions" IS 'Allows authenticated users to create interactions for accessible schools, attributed to themselves (logged_by = auth.uid()).';
