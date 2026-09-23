-- Qodo review on PR #991: 20260929000051's source_draft_id binding is not
-- actually a provenance guarantee -- interactions.source_draft_id is set by
-- an ordinary authenticated INSERT under the existing family-scoped
-- interactions policy, so any family member can insert their own
-- interaction row with an arbitrary target source_draft_id and pass its id
-- to confirm_inbound_draft, reaching the same forged confirmation
-- confirm.post.ts exists to prevent.
--
-- Fix: stop accepting a caller-supplied interaction id at all. The RPC now
-- creates the interaction itself (SECURITY DEFINER, so its own INSERT sets
-- source_draft_id from the row it just locked, never from client input)
-- and confirms the draft in the same call. confirm.post.ts no longer does
-- its own interactions insert before calling this.
DROP FUNCTION IF EXISTS public.confirm_inbound_draft(uuid, uuid);

CREATE OR REPLACE FUNCTION "public"."confirm_inbound_draft"(
  "p_draft_id" "uuid",
  "p_school_id" "uuid",
  "p_coach_id" "uuid",
  "p_coach_id_set" boolean,
  "p_type" "text",
  "p_direction" "text",
  "p_subject" "text",
  "p_subject_set" boolean,
  "p_content" "text",
  "p_content_set" boolean,
  "p_occurred_at" timestamptz
)
RETURNS TABLE("draft" "public"."inbound_email_drafts", "interaction_id" "uuid")
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" = "public"
AS $$
DECLARE
  v_draft public.inbound_email_drafts%ROWTYPE;
  v_school_id uuid;
  v_new_interaction_id uuid;
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
  -- matching confirm.post.ts's prior behavior. No new interaction on replay.
  IF v_draft.status = 'confirmed' THEN
    RETURN QUERY SELECT v_draft, v_draft.confirmed_interaction_id;
    RETURN;
  END IF;

  IF v_draft.status <> 'pending' THEN
    RAISE EXCEPTION 'draft is not pending' USING ERRCODE = 'P0001';
  END IF;

  IF v_draft.matched_school_id IS NOT NULL THEN
    v_school_id := v_draft.matched_school_id;
  ELSIF p_school_id IS NOT NULL THEN
    -- Explicit check stays even under RLS: the interactions INSERT policy
    -- only validates family_unit_id + logged_by, not that school_id itself
    -- belongs to the same family -- confirm the caller-supplied schoolId
    -- actually belongs to this draft's family before it reaches the insert.
    PERFORM 1 FROM public.schools
    WHERE id = p_school_id AND family_unit_id = v_draft.family_unit_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'invalid schoolId' USING ERRCODE = '22023';
    END IF;
    v_school_id := p_school_id;
  ELSE
    RAISE EXCEPTION 'schoolId is required -- this draft has no matched school'
      USING ERRCODE = '22004';
  END IF;

  INSERT INTO public.interactions (
    family_unit_id, school_id, coach_id, type, direction,
    subject, content, occurred_at, logged_by, source_draft_id
  )
  VALUES (
    v_draft.family_unit_id,
    v_school_id,
    CASE WHEN p_coach_id_set THEN p_coach_id ELSE v_draft.matched_coach_id END,
    COALESCE(p_type, 'email')::interaction_type,
    COALESCE(p_direction, 'inbound')::interaction_direction,
    CASE WHEN p_subject_set THEN p_subject ELSE v_draft.subject END,
    CASE WHEN p_content_set THEN p_content ELSE v_draft.body_text END,
    COALESCE(p_occurred_at, v_draft.occurred_at),
    auth.uid(),
    p_draft_id
  )
  RETURNING id INTO v_new_interaction_id;

  -- Only flip status when still pending -- closes the concurrent-confirm
  -- race the same way the prior raw UPDATE ... WHERE status = 'pending' did.
  UPDATE public.inbound_email_drafts
  SET status = 'confirmed', confirmed_interaction_id = v_new_interaction_id
  WHERE id = p_draft_id AND status = 'pending'
  RETURNING * INTO v_draft;

  IF NOT FOUND THEN
    -- Lost the race to a concurrent confirm; the interaction we just
    -- created is orphaned (residual duplicate-interaction risk on true
    -- concurrent confirms -- same pre-existing gap noted in confirm.post.ts,
    -- not newly introduced by moving the insert server-side). Return the
    -- winner's row.
    SELECT * INTO v_draft FROM public.inbound_email_drafts WHERE id = p_draft_id;
  END IF;

  RETURN QUERY SELECT v_draft, v_draft.confirmed_interaction_id;
END;
$$;

REVOKE ALL ON FUNCTION "public"."confirm_inbound_draft"(
  "uuid", "uuid", "uuid", boolean, "text", "text", "text", boolean, "text", boolean, timestamptz
) FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."confirm_inbound_draft"(
  "uuid", "uuid", "uuid", boolean, "text", "text", "text", boolean, "text", boolean, timestamptz
) TO "authenticated";

-- source_draft_id itself is still writable via the ordinary family-scoped
-- interactions INSERT policy (unchanged, out of scope here) -- that's fine
-- now: nothing trusts it for authorization anymore. It's populated
-- exclusively by this RPC on the one path that matters (confirming a
-- draft) and is otherwise just bookkeeping on a caller's own family's own
-- row.
