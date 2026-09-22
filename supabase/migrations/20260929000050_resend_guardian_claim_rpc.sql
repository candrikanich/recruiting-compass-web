-- #912: server/api/guardian/resend.post.ts is the last real migration
-- candidate left. It reads and writes guardian_claims.token (column-
-- REVOKEd from authenticated since 20260929000010) and has no INSERT/
-- UPDATE policy on guardian_claims at all -- every operation it performs
-- needs a SECURITY DEFINER RPC.
--
-- Consolidated into ONE RPC (not several) because the route's own logic
-- is a single state machine (expire stale claim -> create, or revoke
-- +reissue, or bump reminder) that has to stay atomic for the same reason
-- accept_guardian_claim does: a partial write here could leave a
-- 'revoked' old claim with no new one inserted, silently breaking the
-- player's only path to inviting a guardian.
--
-- Two things this route relied on that a direct RPC call would otherwise
-- bypass, now enforced inside the function instead of trusting the
-- caller to have gone through the route:
--
-- 1. rateLimitByUser's 3/hour cap was route-only (in-memory/Upstash,
--    invisible to a direct PostgREST call once EXECUTE is granted to
--    authenticated). Added guardian_claim_resend_attempts, the same
--    durable per-user attempt table shape as family_code_join_attempts
--    (20260929000023), enforcing the identical 3-per-hour window inside
--    the transaction so a direct RPC call can't bypass it.
--
-- 2. resolveGuardianLock()'s eligibility gate (guardianGate.ts) stays the
--    single JS source of truth for the app's own UI/enforcement paths
--    (status.get.ts, assertGuardianConfirmed) -- not reimplemented here
--    wholesale. What IS ported below is only the narrow, stable,
--    legally-fixed COPPA threshold math (age 13-17 = requiresGuardianInvite,
--    utils/age.ts) plus the same family_members join hasParentInFamily
--    already uses, both simple enough that the "two independently-built
--    copies drifting apart" risk guardianGate.ts's own comments warn
--    about is low -- unlike re-deriving a evolving business rule, this is
--    calendar arithmetic + a family-membership existence check. Any
--    future change to either threshold must update both this function and
--    utils/age.ts/guardianGate.ts -- flagged here deliberately so that's
--    visible.
--
-- Every operation is scoped to player_user_id = auth.uid(), never a
-- client-supplied actor id, mirroring every other #912 RPC.

CREATE TABLE IF NOT EXISTS "public"."guardian_claim_resend_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "attempted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "guardian_claim_resend_attempts_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."guardian_claim_resend_attempts" OWNER TO "postgres";

ALTER TABLE ONLY "public"."guardian_claim_resend_attempts"
    ADD CONSTRAINT "guardian_claim_resend_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

CREATE INDEX "idx_guardian_claim_resend_attempts_user_time" ON "public"."guardian_claim_resend_attempts" USING "btree" ("user_id", "attempted_at");

-- No policies: only the SECURITY DEFINER resend_guardian_claim RPC (which
-- bypasses RLS as the table owner) ever reads or writes this table.
ALTER TABLE "public"."guardian_claim_resend_attempts" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."guardian_claim_resend_attempts" FROM "anon", "authenticated";

CREATE OR REPLACE FUNCTION "public"."resend_guardian_claim"("p_requested_email" "text")
RETURNS TABLE(
  "token" "text",
  "guardian_email" "text",
  "player_name" "text",
  "error_code" "text"
)
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" = "public"
AS $$
DECLARE
  v_user record;
  v_claim public.guardian_claims%ROWTYPE;
  v_caller_email text;
  v_age int;
  v_eligible boolean;
  v_has_parent boolean;
  v_recent_attempts int;
  v_new_token text;
BEGIN
  -- Durable per-user rate limit: mirrors join_family_by_code's
  -- family_code_join_attempts, closing the same direct-RPC bypass class
  -- (route-level rateLimitByUser is invisible to a call that skips the
  -- route entirely).
  DELETE FROM public.guardian_claim_resend_attempts
   WHERE user_id = auth.uid() AND attempted_at < now() - interval '2 hours';

  SELECT count(*) INTO v_recent_attempts
    FROM public.guardian_claim_resend_attempts
   WHERE user_id = auth.uid() AND attempted_at > now() - interval '1 hour';

  IF v_recent_attempts >= 3 THEN
    RETURN QUERY SELECT NULL::text, NULL::text, NULL::text, 'RATE_LIMITED'::text;
    RETURN;
  END IF;

  INSERT INTO public.guardian_claim_resend_attempts (user_id) VALUES (auth.uid());

  SELECT role, date_of_birth, guardian_consent_at, full_name, email
    INTO v_user
    FROM public.users
   WHERE id = auth.uid();

  v_caller_email := lower(trim(v_user.email));

  SELECT * INTO v_claim
    FROM public.guardian_claims
   WHERE player_user_id = auth.uid()
     AND status = 'pending';

  -- A pending row past its expiry is dead weight, not a live claim -- the
  -- partial unique index (idx_guardian_claims_one_pending_per_player) only
  -- excludes 'pending' rows, so leaving its status alone would collide
  -- with the fresh insert below. Expire it and fall through to the same
  -- "no claim" path a player who never had one takes.
  IF FOUND AND v_claim.expires_at < now() THEN
    UPDATE public.guardian_claims SET status = 'expired' WHERE id = v_claim.id;
    v_claim := NULL;
  END IF;

  IF v_claim.id IS NULL THEN
    -- No pending claim -- the "invite a parent" path. Gated on eligibility
    -- (see file header) rather than "authenticated at all": otherwise any
    -- adult, parent, or already-consented player could insert a row and
    -- send mail to an arbitrary address.
    v_age := extract(year from age(v_user.date_of_birth))::int;
    v_eligible := v_user.role = 'player'
      AND v_user.date_of_birth IS NOT NULL
      AND v_age >= 13 AND v_age < 18
      AND v_user.guardian_consent_at IS NULL;

    IF v_eligible THEN
      SELECT EXISTS (
        SELECT 1
          FROM public.family_members fm1
          JOIN public.family_members fm2 ON fm1.family_unit_id = fm2.family_unit_id
         WHERE fm1.user_id = auth.uid() AND fm2.role = 'parent'
      ) INTO v_has_parent;
      IF v_has_parent THEN
        v_eligible := false;
      END IF;
    END IF;

    IF NOT v_eligible THEN
      RETURN QUERY SELECT NULL::text, NULL::text, NULL::text, 'NOT_ELIGIBLE'::text;
      RETURN;
    END IF;

    IF p_requested_email IS NULL OR p_requested_email = '' THEN
      RETURN QUERY SELECT NULL::text, NULL::text, NULL::text, 'EMAIL_REQUIRED'::text;
      RETURN;
    END IF;

    IF lower(trim(p_requested_email)) = v_caller_email THEN
      RETURN QUERY SELECT NULL::text, NULL::text, NULL::text, 'SAME_EMAIL'::text;
      RETURN;
    END IF;

    v_new_token := gen_random_uuid()::text;

    INSERT INTO public.guardian_claims (player_user_id, guardian_email, token)
    VALUES (auth.uid(), lower(trim(p_requested_email)), v_new_token);

    RETURN QUERY SELECT
      v_new_token,
      lower(trim(p_requested_email)),
      COALESCE(v_user.full_name, split_part(v_user.email, '@', 1)),
      NULL::text;
    RETURN;
  END IF;

  -- Existing pending claim: either revoke+reissue to a new address, or
  -- just bump the reminder counter for the same address.
  IF p_requested_email IS NOT NULL AND p_requested_email <> ''
     AND lower(trim(p_requested_email)) <> v_claim.guardian_email THEN
    IF lower(trim(p_requested_email)) = v_caller_email THEN
      RETURN QUERY SELECT NULL::text, NULL::text, NULL::text, 'SAME_EMAIL'::text;
      RETURN;
    END IF;

    -- Revoke then reissue, rather than mutating in place: the old token
    -- may already be in an inbox, and it must stop working the moment the
    -- address changes. Deliberately carries the original expires_at
    -- forward -- letting the clock restart would make the retention
    -- deadline indefinitely extendable by re-entering an address.
    UPDATE public.guardian_claims SET status = 'revoked' WHERE id = v_claim.id;

    v_new_token := gen_random_uuid()::text;

    INSERT INTO public.guardian_claims (player_user_id, guardian_email, token, expires_at)
    VALUES (auth.uid(), lower(trim(p_requested_email)), v_new_token, v_claim.expires_at);

    RETURN QUERY SELECT
      v_new_token,
      lower(trim(p_requested_email)),
      COALESCE(v_user.full_name, split_part(v_user.email, '@', 1)),
      NULL::text;
    RETURN;
  END IF;

  UPDATE public.guardian_claims
     SET last_reminder_at = now(),
         reminder_count = coalesce(reminder_count, 0) + 1
   WHERE id = v_claim.id;

  RETURN QUERY SELECT
    v_claim.token,
    v_claim.guardian_email,
    COALESCE(v_user.full_name, split_part(v_user.email, '@', 1)),
    NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION "public"."resend_guardian_claim"("text") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."resend_guardian_claim"("text") TO "authenticated";
