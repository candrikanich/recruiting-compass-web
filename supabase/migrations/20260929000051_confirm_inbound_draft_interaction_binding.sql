-- Qodo review on PR #990: confirm_inbound_draft (20260928000021) verified
-- only that the caller-supplied p_interaction_id's family_unit_id matched
-- the draft's -- not that the interaction was actually the one created for
-- this draft. Any authenticated member of that family could call the RPC
-- directly via PostgREST with an unrelated pre-existing interaction from
-- the same family and permanently attach it to a pending draft, bypassing
-- confirm.post.ts entirely. Confined to the caller's own family (no
-- cross-tenant leak), but still a false data association the route's own
-- flow never produces.
--
-- Fix: record which draft an interaction was created to confirm, and make
-- the RPC verify that binding instead of trusting family membership alone.
ALTER TABLE public.interactions
  ADD COLUMN IF NOT EXISTS source_draft_id uuid REFERENCES public.inbound_email_drafts(id);

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
  v_interaction_source_draft_id uuid;
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

  SELECT family_unit_id, source_draft_id
    INTO v_interaction_family_unit_id, v_interaction_source_draft_id
  FROM public.interactions
  WHERE id = p_interaction_id;

  IF v_interaction_family_unit_id IS NULL
     OR v_interaction_family_unit_id <> v_draft.family_unit_id
     OR v_interaction_source_draft_id IS DISTINCT FROM p_draft_id THEN
    RAISE EXCEPTION 'interaction was not created to confirm this draft' USING ERRCODE = '42501';
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
