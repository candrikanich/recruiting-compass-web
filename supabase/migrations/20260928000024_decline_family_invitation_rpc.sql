-- #912: server/api/family/invite/[token]/decline.post.ts mutates
-- family_invitations.status, but family_invitations_update's RLS
-- (invited_by = auth.uid()) only ever authorized the inviter, never the
-- invitee -- the exact same gap accept_family_invitation
-- (20260928000014) was built to close for acceptance. A raw UPDATE under
-- a session-scoped client would match zero rows for the invitee (RLS
-- silently excludes it, no error), so decline would appear to succeed
-- while never actually updating the row.
--
-- Mirrors accept_family_invitation's shape: SELECT ... FOR UPDATE locks
-- the row, invited_email is compared against the caller's own JWT email
-- (never a client-supplied value), and each expected failure raises a
-- distinct errcode the route already maps to its existing HTTP responses.

CREATE OR REPLACE FUNCTION "public"."decline_family_invitation"("p_invitation_id" "uuid")
RETURNS "public"."family_invitations"
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
    RAISE EXCEPTION 'INVITATION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF lower(v_invitation.invited_email) <> lower(auth.email()) THEN
    RAISE EXCEPTION 'not authorized to decline this invitation' USING ERRCODE = '42501';
  END IF;

  IF v_invitation.status <> 'pending' THEN
    RAISE EXCEPTION 'INVITATION_NOT_PENDING' USING ERRCODE = 'P0001';
  END IF;

  IF v_invitation.expires_at < now() THEN
    RAISE EXCEPTION 'INVITATION_EXPIRED' USING ERRCODE = 'P0010';
  END IF;

  UPDATE public.family_invitations
     SET status = 'declined', declined_at = now()
   WHERE id = p_invitation_id
  RETURNING * INTO v_invitation;

  RETURN v_invitation;
END;
$$;

REVOKE ALL ON FUNCTION "public"."decline_family_invitation"("uuid") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."decline_family_invitation"("uuid") TO "authenticated";
