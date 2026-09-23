-- Every RETURN QUERY in create_family_for_user() and join_family_by_code()
-- (20260928000023_family_code_rpcs.sql, revised in place by #957/#951)
-- selects family_units.family_code/family_name (both character varying,
-- not text) into a RETURNS TABLE declared as text. PL/pgSQL's RETURN QUERY
-- does not implicitly cast varchar to text the way a plain variable
-- assignment does, so EVERY successful call -- not just the concurrent-
-- caller race 20260929000022 fixes -- has been raising "structure of query
-- does not match function result type" since these functions were first
-- created. 100% of signups/joins were broken, not just the racing case.
--
-- Confirmed live 2026-09-22: calling create_family_for_user() for a fresh
-- throwaway auth.users row reproduced this exact error; adding ::text
-- casts fixed it cleanly (verified via a temporary copy of the function
-- against the e2e-test project before writing this migration).
--
-- Split into its own migration (not folded into 20260929000022) because
-- `supabase db push` tracks applied migrations by version number, not file
-- content -- editing an already-pushed file's body a second time silently
-- no-ops instead of re-running it.

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
