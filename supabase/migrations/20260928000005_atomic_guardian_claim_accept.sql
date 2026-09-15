-- accept.post.ts previously did claim validation, family membership, and consent
-- recording as separate sequential writes. A failure partway through (e.g. the
-- consent UPDATE erroring after family_members was already inserted) left the player
-- in a family alongside a parent with no guardian_consent_at stamped -- which
-- hasParentInFamily() in guardianGate.ts then reads as "a real guardian is already
-- present" and independently unlocks the account, with no consent ever recorded.
--
-- Folding the whole accept into one plpgsql function makes it atomic: a single RPC
-- call is one transaction, so any failure (including the exceptions this function
-- raises for invalid/expired/mismatched claims) rolls back every write -- partial
-- family membership without consent becomes impossible instead of merely unlikely.
--
-- FOR UPDATE on the claim row also closes a concurrent-accept race: two callers
-- racing the same token now serialize on the row lock instead of both reading
-- status = 'pending' and both proceeding.
create or replace function public.accept_guardian_claim(
  p_token text,
  p_guardian_id uuid,
  p_guardian_email text,
  p_terms_version text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
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
  -- Lock the claim row first: nothing below may proceed against a claim another
  -- concurrent accept is also mid-processing.
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

  if lower(trim(p_guardian_email)) != lower(trim(v_claim.guardian_email)) then
    raise exception 'CLAIM_EMAIL_MISMATCH' using errcode = 'P0001';
  end if;

  -- Same family-resolution order as the endpoint previously used: prefer the
  -- guardian's existing family, then the player's own solo family, else create one.
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
      -- Lost the create race to a concurrent caller (e.g. the SIGNED_IN listener's
      -- automatic /api/family/create). idx_family_units_one_per_creator turned it
      -- into a conflict instead of a silent duplicate -- reuse the winner's row.
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

  -- Clicking the emailed link already proves ownership of guardian_email, which
  -- matched p_guardian_email above.
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
  'Atomic guardian-claim acceptance: locks the pending claim, validates it, establishes family membership, and records guardian_consent_* in one transaction. See accept.post.ts.';

revoke all on function public.accept_guardian_claim(text, uuid, text, text) from anon, authenticated;
grant execute on function public.accept_guardian_claim(text, uuid, text, text) to service_role;
