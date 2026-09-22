-- Unblocks server/api/family/invite/[token]/accept.post.ts for #912: the
-- invitee accepting their own pending invitation currently can't even SELECT
-- it under RLS (existing family_invitations_select only authorizes via an
-- existing family_members row, which the invitee doesn't have yet -- that's
-- the whole point of accepting).
--
-- auth.email() reads the `email` claim directly off the request JWT -- no
-- table lookup, no recursion risk. lower() on both sides matches the route's
-- own `.trim().toLowerCase()` comparison (accept.post.ts:58-60) and avoids a
-- case-mismatch false-denial.
DROP POLICY IF EXISTS "family_invitations_select" ON "public"."family_invitations";

CREATE POLICY "family_invitations_select" ON "public"."family_invitations" FOR SELECT USING (
  ("family_unit_id" IN ( SELECT "family_members"."family_unit_id"
     FROM "public"."family_members"
    WHERE ("family_members"."user_id" = "auth"."uid"())))
  OR (lower("invited_email") = lower("auth"."email"()))
);

-- family_invitations_update is intentionally NOT widened to the invitee.
-- USING-only RLS policies can't restrict which columns an UPDATE touches or
-- compare old vs. new values, so an invitee with raw UPDATE access could
-- rewrite `role` (or family_unit_id, token, invited_email, expires_at) to
-- anything before accepting -- e.g. a player invitee escalating themselves
-- to role='parent'. accepting the invite (status -> accepted, and the
-- family_members insert) instead goes through the SECURITY DEFINER function
-- below, which reads the invitation's role from the trusted row itself, not
-- from anything the client can tamper with.

-- The invitee's family_members insert has the same problem if done as a raw
-- table-level policy: a WITH CHECK on family_members can verify the inserting
-- user has *a* valid pending invitation, but can't force the inserted `role`
-- to match that invitation's issued role without an old-row comparison RLS
-- can't express. A SECURITY DEFINER function sidesteps this by using
-- v_invitation.role directly rather than trusting client-supplied input.
CREATE OR REPLACE FUNCTION "public"."accept_family_invitation"("p_invitation_id" "uuid")
RETURNS TABLE("family_unit_id" "uuid", "role" "text", "pending_player_details" "jsonb")
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" = "public"
AS $$
DECLARE
  v_invitation public.family_invitations%ROWTYPE;
BEGIN
  SELECT * INTO v_invitation
  FROM public.family_invitations
  WHERE id = p_invitation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invitation not found' USING ERRCODE = 'P0002';
  END IF;

  IF lower(v_invitation.invited_email) <> lower(auth.email()) THEN
    RAISE EXCEPTION 'not authorized to accept this invitation' USING ERRCODE = '42501';
  END IF;

  IF v_invitation.status <> 'pending' THEN
    RAISE EXCEPTION 'invitation is no longer valid' USING ERRCODE = 'P0001';
  END IF;

  IF v_invitation.expires_at < now() THEN
    RAISE EXCEPTION 'invitation has expired' USING ERRCODE = 'P0010';
  END IF;

  -- Idempotent: skip the insert if the caller is already a member (matches
  -- the route's pre-existing idempotency behavior).
  IF NOT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_unit_id = v_invitation.family_unit_id
      AND user_id = auth.uid()
  ) THEN
    INSERT INTO public.family_members (family_unit_id, user_id, role)
    VALUES (v_invitation.family_unit_id, auth.uid(), v_invitation.role);
  END IF;

  UPDATE public.family_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = v_invitation.id;

  RETURN QUERY SELECT v_invitation.family_unit_id, v_invitation.role, v_invitation.pending_player_details;
END;
$$;

REVOKE ALL ON FUNCTION "public"."accept_family_invitation"("uuid") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."accept_family_invitation"("uuid") TO "authenticated";
