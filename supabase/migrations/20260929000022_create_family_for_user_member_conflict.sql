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
-- Fix 1: match the same ON CONFLICT DO NOTHING already used in the
-- race-recovery branch. No behavior change for the non-racing case; makes
-- the racing case idempotent instead of a crash.
--
-- Fix 2 (found while verifying fix 1 live): every RETURN QUERY in this
-- function selects family_units.family_code/family_name (both
-- character varying, not text) into a RETURNS TABLE declared as text --
-- PL/pgSQL's RETURN QUERY does not implicitly cast varchar to text the way
-- a plain variable assignment does, so EVERY successful call (not just the
-- racing ones) has been raising `structure of query does not match
-- function result type` since this function was first created -- 100% of
-- signups were broken, not just the concurrent-caller case fix 1 covers.
-- Confirmed live: calling the function via a fresh throwaway auth.users
-- row reproduced this exact error; adding ::text casts fixed it cleanly.
-- Same bug exists in join_family_by_code's RETURN QUERY (family_name) --
-- fixed in the same pass below since it's the identical defect in a
-- sibling RPC from the same original migration.
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
    RETURN QUERY SELECT v_existing_family.id, v_existing_family.family_code::text, v_existing_family.family_name::text, true;
    RETURN;
  END IF;

  -- Already a member via invite (never created their own family_units row)?
  SELECT fu.id, fu.family_code, fu.family_name INTO v_existing_membership
    FROM public.family_members fm
    JOIN public.family_units fu ON fu.id = fm.family_unit_id
   WHERE fm.user_id = auth.uid()
   LIMIT 1;
  IF FOUND THEN
    RETURN QUERY SELECT v_existing_membership.id, v_existing_membership.family_code::text, v_existing_membership.family_name::text, true;
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

    RETURN QUERY SELECT v_race_winner.id, v_race_winner.family_code::text, v_race_winner.family_name::text, true;
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

  RETURN QUERY SELECT v_new_family.id, v_new_family.family_code::text, v_new_family.family_name::text, false;
END;
$$;

-- Same varchar/text mismatch, same original migration (20260928000023,
-- since revised in-place by PR #957 to add error_code -- this reproduces
-- that current signature exactly, just with the missing casts). Confirmed
-- by inspection (not a separate live repro): identical
-- v_family.family_name (family_units.family_name is varchar(255)) selected
-- into a RETURNS TABLE column declared text, in the same RETURN QUERY
-- pattern already proven broken above.
CREATE OR REPLACE FUNCTION "public"."join_family_by_code"("p_family_code" "text")
RETURNS TABLE("family_id" "uuid", "family_name" "text", "already_member" boolean, "error_code" "text")
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" = "public"
AS $$
DECLARE
  v_role text;
  v_family public.family_units%ROWTYPE;
  v_recent_attempts int;
BEGIN
  IF p_family_code !~ '^FAM-[A-Z0-9]{6}$' THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, false, 'INVALID_CODE_FORMAT'::text;
    RETURN;
  END IF;

  SELECT role INTO v_role FROM public.users WHERE id = auth.uid() FOR UPDATE;

  DELETE FROM public.family_code_join_attempts
   WHERE user_id = auth.uid() AND attempted_at < now() - interval '1 hour';

  SELECT count(*) INTO v_recent_attempts
    FROM public.family_code_join_attempts
   WHERE user_id = auth.uid() AND attempted_at > now() - interval '5 minutes';

  IF v_recent_attempts >= 5 THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, false, 'RATE_LIMITED'::text;
    RETURN;
  END IF;

  INSERT INTO public.family_code_join_attempts (user_id) VALUES (auth.uid());

  SELECT * INTO v_family
    FROM public.family_units
   WHERE family_code = p_family_code;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, false, 'CODE_NOT_FOUND'::text;
    RETURN;
  END IF;

  IF v_family.created_by_user_id = auth.uid() THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, false, 'CANNOT_JOIN_OWN_FAMILY'::text;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.family_members
     WHERE family_unit_id = v_family.id AND user_id = auth.uid()
  ) THEN
    RETURN QUERY SELECT v_family.id, v_family.family_name::text, true, NULL::text;
    RETURN;
  END IF;

  INSERT INTO public.family_members (family_unit_id, user_id, role)
  VALUES (v_family.id, auth.uid(), COALESCE(v_role, 'player'));

  BEGIN
    INSERT INTO public.family_code_usage_log (family_unit_id, user_id, code_used, action)
    VALUES (v_family.id, auth.uid(), p_family_code, 'joined');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'family_code_usage_log insert failed (join): %', SQLERRM;
  END;

  RETURN QUERY SELECT v_family.id, v_family.family_name::text, false, NULL::text;
END;
$$;
