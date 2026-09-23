-- #912: server/api/family/invite.post.ts looks up an invited email's
-- existing user_id to check "is this person already a member of my
-- family" before creating a duplicate invitation. Under a session-scoped
-- client, a plain `users` SELECT by an arbitrary email is blocked -- the
-- active `users` SELECT policies only cover the caller's own row or an
-- existing family co-member's row, and the whole point of this check is
-- for someone who ISN'T yet a co-member. A raw lookup would silently
-- return nothing, always missing the duplicate-invite case.
--
-- Narrow RPC instead of widening `users` SELECT: returns the existing
-- member's family_members.id only when that email already has an
-- account AND is already a member of the CALLER's own family_unit_id --
-- never exposes any other user's row, existence, or membership in any
-- other family.

CREATE OR REPLACE FUNCTION "public"."find_family_member_by_email"(
  "p_email" "text",
  "p_family_unit_id" "uuid"
)
RETURNS "uuid"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" = "public"
AS $$
DECLARE
  v_member_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_unit_id = p_family_unit_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not authorized for this family' USING ERRCODE = '42501';
  END IF;

  SELECT fm.id INTO v_member_id
  FROM public.users u
  JOIN public.family_members fm ON fm.user_id = u.id
  WHERE lower(u.email) = lower(p_email)
    AND fm.family_unit_id = p_family_unit_id;

  RETURN v_member_id;
END;
$$;

REVOKE ALL ON FUNCTION "public"."find_family_member_by_email"("text", "uuid") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."find_family_member_by_email"("text", "uuid") TO "authenticated";
