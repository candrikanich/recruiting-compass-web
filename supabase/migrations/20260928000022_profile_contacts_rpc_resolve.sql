-- #912: server/api/player/profile/contacts/[id]/resolve.post.ts mutates
-- profile_contacts.status/interaction_id, but 20260909000000's own comment
-- says explicitly "No INSERT/UPDATE/DELETE policy: writes happen only via
-- the service-role client ... never from an authenticated browser session".
-- Swapping this route off the service-role client onto a session-scoped
-- one needs a way to perform that mutation under RLS.
--
-- Going straight to a SECURITY DEFINER RPC rather than a raw UPDATE policy
-- (the mistake corrected in 20260928000021 for inbound_email_drafts): a
-- USING-only UPDATE grant would let any family member rewrite any column
-- (coach_name, coach_email, matched_coach_id, interaction_id, status) via a
-- direct Supabase call, not just the resolve/dismiss transition this route
-- performs.

CREATE OR REPLACE FUNCTION "public"."resolve_profile_contact_lead"(
  "p_lead_id" "uuid",
  "p_status" "text",
  "p_interaction_id" "uuid"
)
RETURNS "public"."profile_contacts"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" = "public"
AS $$
DECLARE
  v_lead public.profile_contacts%ROWTYPE;
  v_interaction_family_unit_id uuid;
BEGIN
  IF p_status NOT IN ('resolved', 'dismissed') THEN
    RAISE EXCEPTION 'invalid status' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_lead
  FROM public.profile_contacts
  WHERE id = p_lead_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'lead not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_lead.family_unit_id NOT IN (
    SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not authorized to resolve this lead' USING ERRCODE = '42501';
  END IF;

  -- Double-convert guard: never overwrite an existing resolution, matching
  -- resolve.post.ts's existing idempotent behavior.
  IF v_lead.status = 'resolved' THEN
    RETURN v_lead;
  END IF;

  IF p_status = 'resolved' THEN
    IF p_interaction_id IS NULL THEN
      RAISE EXCEPTION 'interactionId is required when resolving' USING ERRCODE = 'P0001';
    END IF;

    SELECT family_unit_id INTO v_interaction_family_unit_id
    FROM public.interactions
    WHERE id = p_interaction_id;

    IF v_interaction_family_unit_id IS NULL
       OR v_interaction_family_unit_id <> v_lead.family_unit_id THEN
      RAISE EXCEPTION 'interaction does not belong to this lead''s family' USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE public.profile_contacts
  SET status = p_status,
      interaction_id = CASE WHEN p_status = 'resolved' THEN p_interaction_id ELSE NULL END
  WHERE id = p_lead_id
  RETURNING * INTO v_lead;

  RETURN v_lead;
END;
$$;

REVOKE ALL ON FUNCTION "public"."resolve_profile_contact_lead"("uuid", "text", "uuid") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."resolve_profile_contact_lead"("uuid", "text", "uuid") TO "authenticated";
