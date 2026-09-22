-- #912: family/invite/[token].get.ts and guardian/claim/[token]/index.get.ts
-- are both deliberately unauthenticated -- the caller arrives from an
-- emailed link and may have no account yet, or isn't the account the
-- token belongs to. Neither route's session (there isn't one) can be
-- scoped by RLS: family_invitations_select requires either family
-- membership or a matching auth.email(), and guardian_claims has no anon
-- SELECT policy at all -- both correctly deny an anonymous caller
-- everything. The token itself is the bearer credential (a crypto-random
-- UUID for invitations; guardian_claims already has its own
-- REVOKE SELECT(token) column lockdown from 20260929000010).
--
-- A plain anon RLS policy can't express "found by token" safely --
-- RLS is row-scoped, not query-parameter-scoped, so a permissive-enough
-- policy to let `WHERE token = $1` through would also let an anon caller
-- list the whole table with no token at all. SECURITY DEFINER RPCs that
-- take the token as an argument and look it up internally close that gap:
-- the function decides what's returned, not a policy an unfiltered query
-- could exploit.
--
-- Both return an error_code column instead of raising, matching the
-- join_family_by_code pattern (#951/#957) -- these are expected outcomes
-- (not found / wrong state / expired), not exceptional ones.

CREATE OR REPLACE FUNCTION "public"."get_family_invitation_by_token"("p_token" "text")
RETURNS TABLE(
  "invitation_id" "uuid",
  "role" "text",
  "family_name" "text",
  "invited_email" "text",
  "error_code" "text"
)
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" = "public"
AS $$
DECLARE
  v_invitation public.family_invitations%ROWTYPE;
  v_family_name text;
BEGIN
  SELECT * INTO v_invitation
    FROM public.family_invitations
   WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, NULL::text, 'NOT_FOUND'::text;
    RETURN;
  END IF;

  IF v_invitation.status <> 'pending' THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, NULL::text, 'INVALID_STATUS'::text;
    RETURN;
  END IF;

  IF v_invitation.expires_at < now() THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, NULL::text, 'EXPIRED'::text;
    RETURN;
  END IF;

  SELECT family_name INTO v_family_name
    FROM public.family_units
   WHERE id = v_invitation.family_unit_id;

  RETURN QUERY SELECT
    v_invitation.id,
    v_invitation.role,
    COALESCE(v_family_name, 'My Family'),
    v_invitation.invited_email,
    NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION "public"."get_family_invitation_by_token"("text") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."get_family_invitation_by_token"("text") TO "anon", "authenticated";

CREATE OR REPLACE FUNCTION "public"."get_guardian_claim_by_token"("p_token" "text")
RETURNS TABLE(
  "guardian_email" "text",
  "player_name" "text",
  "player_date_of_birth" "date",
  "player_graduation_year" integer,
  "expires_at" timestamp with time zone,
  "error_code" "text"
)
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" = "public"
AS $$
DECLARE
  v_claim public.guardian_claims%ROWTYPE;
  v_player record;
BEGIN
  SELECT * INTO v_claim
    FROM public.guardian_claims
   WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::text, NULL::text, NULL::date, NULL::integer, NULL::timestamptz, 'NOT_FOUND'::text;
    RETURN;
  END IF;

  IF v_claim.status = 'claimed' THEN
    RETURN QUERY SELECT NULL::text, NULL::text, NULL::date, NULL::integer, NULL::timestamptz, 'ALREADY_CLAIMED'::text;
    RETURN;
  END IF;

  IF v_claim.status <> 'pending' THEN
    RETURN QUERY SELECT NULL::text, NULL::text, NULL::date, NULL::integer, NULL::timestamptz, 'INVALID_STATUS'::text;
    RETURN;
  END IF;

  IF v_claim.expires_at < now() THEN
    RETURN QUERY SELECT NULL::text, NULL::text, NULL::date, NULL::integer, NULL::timestamptz, 'EXPIRED'::text;
    RETURN;
  END IF;

  SELECT full_name, date_of_birth, graduation_year INTO v_player
    FROM public.users
   WHERE id = v_claim.player_user_id;

  RETURN QUERY SELECT
    v_claim.guardian_email,
    COALESCE(v_player.full_name, 'Your athlete'),
    v_player.date_of_birth,
    v_player.graduation_year,
    v_claim.expires_at,
    NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION "public"."get_guardian_claim_by_token"("text") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."get_guardian_claim_by_token"("text") TO "anon", "authenticated";

-- accept_guardian_claim (20260928000005) trusted p_guardian_id as a raw
-- parameter with no verification it matched the caller -- combined with
-- the missing PUBLIC revoke fixed via emergency live REVOKE earlier this
-- session, this was callable by anon with an arbitrary guardian id. Now
-- that this route is being migrated off the service-role client
-- (widening EXECUTE to authenticated is required for that), the function
-- itself must enforce p_guardian_id = auth.uid() rather than trusting the
-- route to have done so -- the same fix already applied to
-- reactivate_school for the identical trust gap.
--
-- Review fix (PR #979): p_guardian_email had the identical trust gap --
-- it was compared against the claim's stored guardian_email, but never
-- checked against the caller's OWN authenticated email. Since
-- get_guardian_claim_by_token (this same migration) makes that email
-- readable to any token holder, and p_guardian_id = auth.uid() alone only
-- proves the caller is signed in as themselves, any signed-in token
-- holder could pass the claim's real guardian_email as p_guardian_email
-- and pass the check despite it not being their own account's email --
-- becoming the player's guardian of record. Dropped the parameter
-- entirely and compare against auth.email() (the verified JWT claim)
-- instead of anything client-supplied.
DROP FUNCTION IF EXISTS "public"."accept_guardian_claim"("text", "uuid", "text", "text");

CREATE OR REPLACE FUNCTION "public"."accept_guardian_claim"(
  "p_token" "text",
  "p_guardian_id" "uuid",
  "p_terms_version" "text"
)
RETURNS "uuid"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public'
AS $function$
declare
  v_claim record;
  v_guardian_family_unit_id uuid;
  v_player_membership record;
  v_family_unit_id uuid;
  v_family_code text;
  v_inbound_token text;
  v_race_winner_id uuid;
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_inbound_chars text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  v_candidate text;
  v_i int;
  v_attempt int;
begin
  if p_guardian_id is distinct from auth.uid() then
    raise exception 'not authorized to act as another user' using errcode = '42501';
  end if;

  select id, player_user_id, guardian_email, status, expires_at
    into v_claim
    from public.guardian_claims
   where token = p_token
     for update;

  if not found then
    raise exception 'CLAIM_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_claim.status = 'claimed' then
    raise exception 'CLAIM_ALREADY_CLAIMED' using errcode = 'P0001';
  end if;

  if v_claim.status != 'pending' then
    raise exception 'CLAIM_INVALID' using errcode = 'P0001';
  end if;

  if v_claim.expires_at < now() then
    raise exception 'CLAIM_EXPIRED' using errcode = 'P0001';
  end if;

  if lower(trim(auth.email())) is distinct from lower(trim(v_claim.guardian_email)) then
    raise exception 'CLAIM_EMAIL_MISMATCH' using errcode = 'P0001';
  end if;

  select family_unit_id into v_guardian_family_unit_id
    from public.family_members
   where user_id = p_guardian_id
   limit 1;

  select id, family_unit_id into v_player_membership
    from public.family_members
   where user_id = v_claim.player_user_id
     and role = 'player'
   limit 1;

  v_family_unit_id := coalesce(v_guardian_family_unit_id, v_player_membership.family_unit_id);

  if v_family_unit_id is null then
    for v_attempt in 1..5 loop
      v_candidate := 'FAM-';
      for v_i in 1..6 loop
        v_candidate := v_candidate || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
      end loop;
      if not exists (select 1 from public.family_units where family_code = v_candidate) then
        v_family_code := v_candidate;
        exit;
      end if;
    end loop;

    if v_family_code is null then
      raise exception 'FAMILY_CODE_GENERATION_FAILED' using errcode = 'P0001';
    end if;

    for v_attempt in 1..5 loop
      v_candidate := '';
      for v_i in 1..8 loop
        v_candidate := v_candidate || substr(v_inbound_chars, 1 + floor(random() * length(v_inbound_chars))::int, 1);
      end loop;
      if not exists (select 1 from public.family_units where inbound_token = v_candidate) then
        v_inbound_token := v_candidate;
        exit;
      end if;
    end loop;

    if v_inbound_token is null then
      raise exception 'INBOUND_TOKEN_GENERATION_FAILED' using errcode = 'P0001';
    end if;

    begin
      insert into public.family_units (
        created_by_user_id, family_name, family_code, code_generated_at, inbound_token
      ) values (
        p_guardian_id, 'My Family', v_family_code, now(), v_inbound_token
      )
      returning id into v_family_unit_id;
    exception when unique_violation then
      select id into v_race_winner_id
        from public.family_units
       where created_by_user_id = p_guardian_id
       limit 1;

      if v_race_winner_id is null then
        raise exception 'FAMILY_CREATE_FAILED' using errcode = 'P0001';
      end if;

      v_family_unit_id := v_race_winner_id;
    end;
  end if;

  if v_guardian_family_unit_id is null or v_guardian_family_unit_id != v_family_unit_id then
    insert into public.family_members (family_unit_id, user_id, role)
    values (v_family_unit_id, p_guardian_id, 'parent')
    on conflict (family_unit_id, user_id) do nothing;
  end if;

  if v_player_membership.id is null then
    insert into public.family_members (family_unit_id, user_id, role)
    values (v_family_unit_id, v_claim.player_user_id, 'player');
  elsif v_player_membership.family_unit_id != v_family_unit_id then
    update public.family_members
       set family_unit_id = v_family_unit_id
     where id = v_player_membership.id;
  end if;

  update public.users
     set email_verified_at = now()
   where id = p_guardian_id
     and email_verified_at is null;

  update public.users
     set guardian_consent_at = now(),
         guardian_consent_by = p_guardian_id,
         guardian_consent_terms_version = p_terms_version
   where id = v_claim.player_user_id;

  update public.guardian_claims
     set status = 'claimed',
         claimed_at = now(),
         claimed_by = p_guardian_id
   where id = v_claim.id;

  return v_family_unit_id;
end;
$function$;

comment on function public.accept_guardian_claim is
  'Atomic guardian-claim acceptance: locks the pending claim, validates it, establishes family membership, and records guardian_consent_* in one transaction. See accept.post.ts. p_guardian_id must equal auth.uid(); guardian email match is checked against auth.email(), never a client-supplied value (#912/#979 review).';

revoke all on function public.accept_guardian_claim(text, uuid, text) from public, anon;
grant execute on function public.accept_guardian_claim(text, uuid, text) to authenticated, service_role;
