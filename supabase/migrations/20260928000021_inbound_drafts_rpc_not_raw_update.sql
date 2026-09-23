-- Corrective migration for 20260928000020 (already deployed) -- qodo review
-- on PR #948 caught that the "inbound_email_drafts family update" policy
-- was a raw USING-only UPDATE grant: it authorizes every family member to
-- update EVERY column, not just the status transitions confirm/discard
-- perform. Same class of gap as accept_family_invitation
-- (20260928000014): USING-only RLS can't restrict which columns an UPDATE
-- touches or compare old vs. new values, so a family member with raw
-- UPDATE access could rewrite parsed email content, matched_school_id,
-- confirmed_interaction_id, or status directly to 'confirmed' without ever
-- creating the interaction row -- via a direct Supabase call, bypassing
-- confirm.post.ts/discard.post.ts entirely.
--
-- Fix: drop the raw policy, replace with two SECURITY DEFINER functions
-- that perform only the exact narrow transition each route needs, reading
-- the row's own family_unit_id/status rather than trusting anything the
-- client supplies for those fields.

DROP POLICY IF EXISTS "inbound_email_drafts family update" ON "public"."inbound_email_drafts";

CREATE OR REPLACE FUNCTION "public"."discard_inbound_draft"("p_draft_id" "uuid")
RETURNS "public"."inbound_email_drafts"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" = "public"
AS $$
DECLARE
  v_draft public.inbound_email_drafts%ROWTYPE;
BEGIN
  SELECT * INTO v_draft
  FROM public.inbound_email_drafts
  WHERE id = p_draft_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'draft not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_draft.family_unit_id NOT IN (
    SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not authorized to discard this draft' USING ERRCODE = '42501';
  END IF;

  -- Idempotent no-op for a non-pending draft, matching discard.post.ts's
  -- existing behavior (never overwrites a confirmed draft's interaction link).
  IF v_draft.status <> 'pending' THEN
    RETURN v_draft;
  END IF;

  UPDATE public.inbound_email_drafts
  SET status = 'discarded'
  WHERE id = p_draft_id
  RETURNING * INTO v_draft;

  RETURN v_draft;
END;
$$;

REVOKE ALL ON FUNCTION "public"."discard_inbound_draft"("uuid") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."discard_inbound_draft"("uuid") TO "authenticated";

CREATE OR REPLACE FUNCTION "public"."confirm_inbound_draft"(
  "p_draft_id" "uuid",
  "p_interaction_id" "uuid"
)
RETURNS "public"."inbound_email_drafts"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" = "public"
AS $$
DECLARE
  v_draft public.inbound_email_drafts%ROWTYPE;
  v_interaction_family_unit_id uuid;
BEGIN
  SELECT * INTO v_draft
  FROM public.inbound_email_drafts
  WHERE id = p_draft_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'draft not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_draft.family_unit_id NOT IN (
    SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not authorized to confirm this draft' USING ERRCODE = '42501';
  END IF;

  -- Idempotent: re-confirming returns the already-confirmed row unchanged,
  -- matching confirm.post.ts's existing behavior.
  IF v_draft.status = 'confirmed' THEN
    RETURN v_draft;
  END IF;

  IF v_draft.status <> 'pending' THEN
    RAISE EXCEPTION 'draft is not pending' USING ERRCODE = 'P0001';
  END IF;

  SELECT family_unit_id INTO v_interaction_family_unit_id
  FROM public.interactions
  WHERE id = p_interaction_id;

  IF v_interaction_family_unit_id IS NULL
     OR v_interaction_family_unit_id <> v_draft.family_unit_id THEN
    RAISE EXCEPTION 'interaction does not belong to this draft''s family' USING ERRCODE = '42501';
  END IF;

  -- Only flip status when still pending -- closes the concurrent-confirm
  -- race the same way the prior raw UPDATE ... WHERE status = 'pending' did.
  UPDATE public.inbound_email_drafts
  SET status = 'confirmed', confirmed_interaction_id = p_interaction_id
  WHERE id = p_draft_id AND status = 'pending'
  RETURNING * INTO v_draft;

  IF NOT FOUND THEN
    -- Lost the race to a concurrent confirm; return the current row.
    SELECT * INTO v_draft FROM public.inbound_email_drafts WHERE id = p_draft_id;
  END IF;

  RETURN v_draft;
END;
$$;

REVOKE ALL ON FUNCTION "public"."confirm_inbound_draft"("uuid", "uuid") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."confirm_inbound_draft"("uuid", "uuid") TO "authenticated";
