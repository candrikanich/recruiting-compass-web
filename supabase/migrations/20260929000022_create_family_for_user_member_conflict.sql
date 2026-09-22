-- Fixes a real crash in create_family_for_user() (#912/#951,
-- supabase/migrations/20260928000023_family_code_rpcs.sql): the "winner"
-- branch's own INSERT INTO family_members has no ON CONFLICT handling,
-- unlike the race-recovery branch a few lines below it. Every signup fires
-- TWO concurrent callers of this RPC -- pages/signup.vue's own explicit
-- POST /api/family/create, plus plugins/auth.client.ts's SIGNED_IN listener
-- (composables/useAccountProvisioning.ts ensureAccountProvisioned), which
-- is never suppressed for the plain signup flow (only the guardian-claim
-- accept flow calls suppressAutoFamilyCreateOnNextSignIn first). When the
-- "loser" call's exception-recovery path (ON CONFLICT DO NOTHING) commits
-- its membership insert before the "winner" call reaches its own
-- unconditional insert, the winner hits
-- family_members_family_unit_id_user_id_key and the whole RPC call fails
-- with an unhandled unique_violation -- surfaced to the client as a raw
-- 500 ("Failed to create family"). Root-caused live via CI trace inspection
-- + a direct SQL repro against the e2e-test project 2026-09-22.
--
-- Fix: match the same ON CONFLICT DO NOTHING already used in the
-- race-recovery branch. No behavior change for the non-racing case; makes
-- the racing case idempotent instead of a crash.
CREATE OR REPLACE FUNCTION "public"."create_family_for_user"()
RETURNS TABLE("family_id" "uuid", "family_code" "text", "family_name" "text", "already_existed" boolean)
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" = "public"
AS $$
DECLARE
  v_role text;
  v_existing_family public.family_units%ROWTYPE;
  v_existing_membership record;
  v_new_code text;
  v_new_token text;
  v_new_family public.family_units%ROWTYPE;
  v_race_winner public.family_units%ROWTYPE;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE id = auth.uid();

  -- Already created a family?
  SELECT * INTO v_existing_family
    FROM public.family_units
   WHERE created_by_user_id = auth.uid()
   LIMIT 1;
  IF FOUND THEN
    RETURN QUERY SELECT v_existing_family.id, v_existing_family.family_code, v_existing_family.family_name, true;
    RETURN;
  END IF;

  -- Already a member via invite (never created their own family_units row)?
  SELECT fu.id, fu.family_code, fu.family_name INTO v_existing_membership
    FROM public.family_members fm
    JOIN public.family_units fu ON fu.id = fm.family_unit_id
   WHERE fm.user_id = auth.uid()
   LIMIT 1;
  IF FOUND THEN
    RETURN QUERY SELECT v_existing_membership.id, v_existing_membership.family_code, v_existing_membership.family_name, true;
    RETURN;
  END IF;

  v_new_code := public.generate_unique_family_code();
  v_new_token := public.generate_unique_inbound_token();

  BEGIN
    INSERT INTO public.family_units (
      created_by_user_id, family_name, family_code, code_generated_at, inbound_token
    ) VALUES (
      auth.uid(), 'My Family', v_new_code, now(), v_new_token
    )
    RETURNING * INTO v_new_family;
  EXCEPTION WHEN unique_violation THEN
    -- Lost the create race to a concurrent caller -- reuse the winner's row
    -- and durable-ize our own membership (idempotent, matches create.post.ts).
    SELECT * INTO v_race_winner
      FROM public.family_units
     WHERE created_by_user_id = auth.uid()
     LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'FAMILY_CREATE_FAILED' USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.family_members (family_unit_id, user_id, role)
    VALUES (v_race_winner.id, auth.uid(), COALESCE(v_role, 'player'))
    ON CONFLICT (family_unit_id, user_id) DO NOTHING;

    RETURN QUERY SELECT v_race_winner.id, v_race_winner.family_code, v_race_winner.family_name, true;
    RETURN;
  END;

  -- Same concurrent-caller race as above, just from the other side: a
  -- second in-flight call for this same user (the SIGNED_IN listener vs.
  -- the page's own explicit call) can insert this exact membership row via
  -- its own ON CONFLICT DO NOTHING recovery path before this INSERT runs.
  INSERT INTO public.family_members (family_unit_id, user_id, role)
  VALUES (v_new_family.id, auth.uid(), COALESCE(v_role, 'player'))
  ON CONFLICT (family_unit_id, user_id) DO NOTHING;

  BEGIN
    INSERT INTO public.family_code_usage_log (family_unit_id, user_id, code_used, action)
    VALUES (v_new_family.id, auth.uid(), v_new_code, 'generated');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'family_code_usage_log insert failed (create): %', SQLERRM;
  END;

  RETURN QUERY SELECT v_new_family.id, v_new_family.family_code, v_new_family.family_name, false;
END;
$$;
