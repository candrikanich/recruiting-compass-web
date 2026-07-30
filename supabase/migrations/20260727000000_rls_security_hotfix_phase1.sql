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

-- EXECUTE was granted to PUBLIC (not just anon/authenticated directly), and
-- anon/authenticated inherit PUBLIC grants — revoking from the named roles
-- alone is a no-op while the PUBLIC grant stands. Revoke from PUBLIC too,
-- then restore explicit grants for the roles that legitimately need it
-- (postgres, service_role already had their own direct grants, but PUBLIC's
-- presence made that moot; this makes the intent explicit and revocation-safe).
REVOKE ALL ON FUNCTION "public"."get_athlete_status"("p_user_id" "uuid") FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."get_athlete_status"("p_user_id" "uuid") FROM "anon";
REVOKE ALL ON FUNCTION "public"."get_athlete_status"("p_user_id" "uuid") FROM "authenticated";
GRANT EXECUTE ON FUNCTION "public"."get_athlete_status"("p_user_id" "uuid") TO "postgres";
GRANT EXECUTE ON FUNCTION "public"."get_athlete_status"("p_user_id" "uuid") TO "service_role";

-- 3. family_units_update: no WITH CHECK, so any family member (not just the
--    creator) could reassign created_by_user_id to themselves and then delete
--    the whole family via family_units_delete. Add a WITH CHECK that requires
--    created_by_user_id in the new row to match the row's current value.
--
--    A raw subquery re-reading family_units from within its own UPDATE policy
--    causes Postgres to re-evaluate the SELECT policy on the same table for
--    that subquery, which itself references the table again — infinite
--    recursion (42P17), confirmed against a live instance. Route the old-value
--    lookup through a SECURITY DEFINER function instead: it runs as the
--    function owner, so it reads the row directly without RLS re-applying.

CREATE OR REPLACE FUNCTION "public"."family_unit_created_by"("p_family_unit_id" "uuid")
RETURNS "uuid"
LANGUAGE "sql"
SECURITY DEFINER
SET "search_path" = "public"
STABLE
AS $$
  SELECT "created_by_user_id" FROM "public"."family_units" WHERE "id" = "p_family_unit_id";
$$;

-- Supabase's ALTER DEFAULT PRIVILEGES grants EXECUTE to anon/authenticated
-- directly at CREATE time, so revoking from PUBLIC alone leaves anon able to
-- call this via /rest/v1/rpc — revoke the direct grant too (advisor
-- anon_security_definer_function_executable, observed live 2026-07-30).
REVOKE ALL ON FUNCTION "public"."family_unit_created_by"("uuid") FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."family_unit_created_by"("uuid") FROM "anon";
GRANT EXECUTE ON FUNCTION "public"."family_unit_created_by"("uuid") TO "authenticated";

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
    AND ("created_by_user_id" = "public"."family_unit_created_by"("id"))
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

-- 5. "Users can insert events for own schools" has the identical school_id
--    IS NULL escape hatch as fix #1's SELECT/UPDATE/DELETE policies: since
--    permissive policies OR together, this WITH CHECK passes unconditionally
--    for any INSERT where school_id is NULL, regardless of user_id or
--    family_unit_id — letting an authenticated user insert an event row
--    impersonating another user's ownership. It is fully redundant with
--    "Users can insert their own events" (user_id = auth.uid()) and "Users
--    can create events in their families" (family_unit_id membership check),
--    both of which already cover every legitimate insert path. Drop it
--    outright rather than duplicate ownership logic a third time.

DROP POLICY IF EXISTS "Users can insert events for own schools" ON "public"."events";
