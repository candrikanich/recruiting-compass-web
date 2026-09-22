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
--
-- Review fixes (PR #951):
-- 1. join_family_by_code is reachable directly via PostgREST's Data API by
--    any authenticated client, bypassing join.post.ts's in-memory per-IP
--    checkRateLimit. Added a durable per-user attempt table so the RPC
--    itself enforces the same 5-per-5-minutes window regardless of caller
--    (route-level IP limiter stays as defense in depth).
-- 2. generate_unique_family_code/generate_unique_inbound_token used
--    Postgres random() (not cryptographically unpredictable) for values
--    that function as bearer credentials -- family_code authorizes join,
--    inbound_token routes raw inbound email to a family. Switched to
--    pgcrypto's gen_random_bytes via _crypto_random_char, with unbiased
--    rejection sampling for alphabets that don't evenly divide 256.
-- 3. family_code_usage_log inserts ran in the same transaction as the
--    primary operation, so a log failure rolled back family
--    creation/join/regeneration -- the JS code they replaced treated
--    logging as fire-and-forget (.catch()-swallowed). Wrapped each insert
--    in a nested block that only suppresses the logging failure.
--
-- Review fixes (PR #957):
-- 4. join_family_by_code's expected failures (code not found, own family,
--    rate limited) were RAISE EXCEPTION, which rolled back the attempt row
--    just inserted along with everything else in the same transaction --
--    every non-existent-code guess evaded the limiter entirely. Switched
--    the function to RETURN an error_code column instead of raising for
--    any expected outcome, so the attempt insert always commits.
-- 5. The count-then-insert rate-limit check wasn't atomic: concurrent
--    calls from the same user could all read the same below-limit count
--    before any of them inserted an attempt. Lock the caller's own users
--    row (SELECT ... FOR UPDATE) for the rest of the transaction so
--    same-user calls serialize through the check.

CREATE TABLE IF NOT EXISTS "public"."family_code_join_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "attempted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "family_code_join_attempts_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."family_code_join_attempts" OWNER TO "postgres";

ALTER TABLE ONLY "public"."family_code_join_attempts"
    ADD CONSTRAINT "family_code_join_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

CREATE INDEX "idx_family_code_join_attempts_user_time" ON "public"."family_code_join_attempts" USING "btree" ("user_id", "attempted_at");

-- No policies: only the SECURITY DEFINER join_family_by_code RPC (which
-- bypasses RLS as the table owner) ever reads or writes this table.
ALTER TABLE "public"."family_code_join_attempts" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."family_code_join_attempts" FROM PUBLIC, "anon", "authenticated";

-- Unbiased single-character draw from pgcrypto randomness for any alphabet,
-- shared by both generator functions below. Rejection sampling avoids the
-- modulo bias a plain `byte % length` would introduce whenever 256 isn't a
-- multiple of the alphabet length (e.g. the 36-char inbound-token alphabet).
CREATE OR REPLACE FUNCTION "public"."_crypto_random_char"("p_chars" "text")
RETURNS "text"
LANGUAGE "plpgsql"
SET "search_path" = "public"
AS $$
DECLARE
  v_len int := length(p_chars);
  v_threshold int := 256 - (256 % v_len);
  v_byte int;
BEGIN
  LOOP
    v_byte := get_byte(extensions.gen_random_bytes(1), 0);
    IF v_byte < v_threshold THEN
      RETURN substr(p_chars, 1 + (v_byte % v_len), 1);
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION "public"."_crypto_random_char"("text") FROM PUBLIC, "anon", "authenticated";

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
      v_candidate := v_candidate || public._crypto_random_char(v_chars);
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
      v_candidate := v_candidate || public._crypto_random_char(v_chars);
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

  BEGIN
    INSERT INTO public.family_code_usage_log (family_unit_id, user_id, code_used, action)
    VALUES (v_new_family.id, auth.uid(), v_new_code, 'generated');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'family_code_usage_log insert failed (create): %', SQLERRM;
  END;

  RETURN QUERY SELECT v_new_family.id, v_new_family.family_code, v_new_family.family_name, false;
END;
$$;

REVOKE ALL ON FUNCTION "public"."create_family_for_user"() FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."create_family_for_user"() TO "authenticated";

-- Return type changed (added error_code) to fix two review findings on
-- PR #957 -- DROP is required since CREATE OR REPLACE can't change a
-- function's RETURNS TABLE column list.
DROP FUNCTION IF EXISTS "public"."join_family_by_code"("text");

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

  -- Lock the caller's own users row for the rest of this transaction so
  -- concurrent join calls from the same user serialize through the
  -- count-then-insert below instead of all reading the same below-limit
  -- count before any of them commits an attempt row (review finding #2 on
  -- PR #957). Other users' rows are untouched, so this doesn't serialize
  -- across different callers.
  SELECT role INTO v_role FROM public.users WHERE id = auth.uid() FOR UPDATE;

  -- Durable per-user rate limit: this RPC is reachable directly via
  -- PostgREST, bypassing join.post.ts's in-memory per-IP checkRateLimit, so
  -- the same 5-per-5-minutes window has to be enforced here too. Opportunistic
  -- cleanup keeps the table bounded without needing a separate cron.
  DELETE FROM public.family_code_join_attempts
   WHERE user_id = auth.uid() AND attempted_at < now() - interval '1 hour';

  SELECT count(*) INTO v_recent_attempts
    FROM public.family_code_join_attempts
   WHERE user_id = auth.uid() AND attempted_at > now() - interval '5 minutes';

  IF v_recent_attempts >= 5 THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, false, 'RATE_LIMITED'::text;
    RETURN;
  END IF;

  -- Record this attempt before resolving the code, and return (rather than
  -- raise) every expected failure below, so a nonexistent-code or
  -- own-family guess still commits this insert instead of rolling it back
  -- with the rest of the transaction (review finding #1 on PR #957).
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
    RETURN QUERY SELECT v_family.id, v_family.family_name, true, NULL::text;
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

  RETURN QUERY SELECT v_family.id, v_family.family_name, false, NULL::text;
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

  BEGIN
    INSERT INTO public.family_code_usage_log (family_unit_id, user_id, code_used, action)
    VALUES (p_family_id, auth.uid(), v_new_code, 'regenerated');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'family_code_usage_log insert failed (regenerate): %', SQLERRM;
  END;

  RETURN v_new_code;
END;
$$;

REVOKE ALL ON FUNCTION "public"."regenerate_family_code"("uuid") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."regenerate_family_code"("uuid") TO "authenticated";
