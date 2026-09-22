-- #912: server/api/family/{create,code/join,code/regenerate}.post.ts all
-- need operations no ordinary RLS policy can safely express:
--
-- - Finding a family_units row by family_code to join it, or checking a
--   generated code for collision, requires reading ANY family's row, not
--   just the caller's own -- family_units_select only authorizes via
--   existing membership or created_by_user_id = auth.uid(), so a
--   session-scoped client gets zero rows for both operations, breaking
--   join and code generation entirely.
-- - regenerate.post.ts's app-level check restricts code regeneration to
--   the family's creator, but family_units_update's RLS authorizes ANY
--   family member -- a raw UPDATE under a session-scoped client would
--   let any member regenerate the code, not just the owner.
-- - create.post.ts's race-recovery path (idx_family_units_one_per_creator
--   23505) reads back and upserts membership atomically; splitting that
--   across ordinary RLS-scoped queries reopens the exact race the
--   service-role version already closed.
--
-- Fix: SECURITY DEFINER RPCs for all three, mirroring each route's
-- existing logic (including the race-recovery paths) rather than
-- redesigning behavior. All three key off auth.uid(), never a
-- client-supplied actor id.

CREATE OR REPLACE FUNCTION "public"."generate_unique_family_code"()
RETURNS "text"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" = "public"
AS $$
DECLARE
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_candidate text;
  v_i int;
  v_attempt int;
BEGIN
  FOR v_attempt IN 1..5 LOOP
    v_candidate := 'FAM-';
    FOR v_i IN 1..6 LOOP
      v_candidate := v_candidate || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM public.family_units WHERE family_code = v_candidate) THEN
      RETURN v_candidate;
    END IF;
  END LOOP;
  RAISE EXCEPTION 'Failed to generate unique family code after 5 retries';
END;
$$;

REVOKE ALL ON FUNCTION "public"."generate_unique_family_code"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION "public"."generate_unique_inbound_token"()
RETURNS "text"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" = "public"
AS $$
DECLARE
  v_chars text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  v_candidate text;
  v_i int;
  v_attempt int;
BEGIN
  FOR v_attempt IN 1..5 LOOP
    v_candidate := '';
    FOR v_i IN 1..8 LOOP
      v_candidate := v_candidate || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM public.family_units WHERE inbound_token = v_candidate) THEN
      RETURN v_candidate;
    END IF;
  END LOOP;
  RAISE EXCEPTION 'Failed to generate unique inbound token after 5 retries';
END;
$$;

REVOKE ALL ON FUNCTION "public"."generate_unique_inbound_token"() FROM PUBLIC, "anon", "authenticated";

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

  INSERT INTO public.family_members (family_unit_id, user_id, role)
  VALUES (v_new_family.id, auth.uid(), COALESCE(v_role, 'player'));

  INSERT INTO public.family_code_usage_log (family_unit_id, user_id, code_used, action)
  VALUES (v_new_family.id, auth.uid(), v_new_code, 'generated');

  RETURN QUERY SELECT v_new_family.id, v_new_family.family_code, v_new_family.family_name, false;
END;
$$;

REVOKE ALL ON FUNCTION "public"."create_family_for_user"() FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."create_family_for_user"() TO "authenticated";

CREATE OR REPLACE FUNCTION "public"."join_family_by_code"("p_family_code" "text")
RETURNS TABLE("family_id" "uuid", "family_name" "text", "already_member" boolean)
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" = "public"
AS $$
DECLARE
  v_role text;
  v_family public.family_units%ROWTYPE;
BEGIN
  IF p_family_code !~ '^FAM-[A-Z0-9]{6}$' THEN
    RAISE EXCEPTION 'INVALID_CODE_FORMAT' USING ERRCODE = 'P0001';
  END IF;

  SELECT role INTO v_role FROM public.users WHERE id = auth.uid();

  SELECT * INTO v_family
    FROM public.family_units
   WHERE family_code = p_family_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CODE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_family.created_by_user_id = auth.uid() THEN
    RAISE EXCEPTION 'CANNOT_JOIN_OWN_FAMILY' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.family_members
     WHERE family_unit_id = v_family.id AND user_id = auth.uid()
  ) THEN
    RETURN QUERY SELECT v_family.id, v_family.family_name, true;
    RETURN;
  END IF;

  INSERT INTO public.family_members (family_unit_id, user_id, role)
  VALUES (v_family.id, auth.uid(), COALESCE(v_role, 'player'));

  INSERT INTO public.family_code_usage_log (family_unit_id, user_id, code_used, action)
  VALUES (v_family.id, auth.uid(), p_family_code, 'joined');

  RETURN QUERY SELECT v_family.id, v_family.family_name, false;
END;
$$;

REVOKE ALL ON FUNCTION "public"."join_family_by_code"("text") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."join_family_by_code"("text") TO "authenticated";

CREATE OR REPLACE FUNCTION "public"."regenerate_family_code"("p_family_id" "uuid")
RETURNS "text"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" = "public"
AS $$
DECLARE
  v_family public.family_units%ROWTYPE;
  v_new_code text;
BEGIN
  SELECT * INTO v_family FROM public.family_units WHERE id = p_family_id;

  IF NOT FOUND OR v_family.created_by_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'NOT_FAMILY_OWNER' USING ERRCODE = '42501';
  END IF;

  v_new_code := public.generate_unique_family_code();

  UPDATE public.family_units
     SET family_code = v_new_code, code_generated_at = now()
   WHERE id = p_family_id;

  INSERT INTO public.family_code_usage_log (family_unit_id, user_id, code_used, action)
  VALUES (p_family_id, auth.uid(), v_new_code, 'regenerated');

  RETURN v_new_code;
END;
$$;

REVOKE ALL ON FUNCTION "public"."regenerate_family_code"("uuid") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."regenerate_family_code"("uuid") TO "authenticated";
