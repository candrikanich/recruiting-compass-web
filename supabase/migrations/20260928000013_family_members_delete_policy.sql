-- family_members has SELECT/INSERT policies but no UPDATE/DELETE policy at
-- all, so every family_members write currently goes through the service-role
-- client (#912). Add DELETE scoped to a family creator removing a non-self,
-- parent-role member row -- matching the authorization already enforced in
-- server/api/family/members/[memberId].delete.ts (created_by_user_id check,
-- self-removal guard, role==='parent' guard).
--
-- Subquery hits family_units, not family_members again, so there's no
-- recursion risk (the user_is_family_member() SECURITY DEFINER workaround in
-- 20260228000003 was only needed for family_members policies that query
-- family_members itself). family_units_select already authorizes
-- created_by_user_id = auth.uid() directly (20260928000004), so this
-- subquery resolves under RLS.
--
-- No matching UPDATE policy: nothing in the current route set needs it, and
-- a blanket family_members UPDATE (e.g. reassigning role) is a bigger attack
-- surface than DELETE. Add one later only if a real use case shows up.

CREATE POLICY "family_members_delete_by_creator" ON "public"."family_members"
  FOR DELETE
  USING (
    "role" = 'parent'
    AND "user_id" <> "auth"."uid"()
    AND "family_unit_id" IN (
      SELECT "id" FROM "public"."family_units" WHERE "created_by_user_id" = "auth"."uid"()
    )
  );
