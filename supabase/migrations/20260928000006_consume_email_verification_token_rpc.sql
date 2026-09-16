-- Atomic replacement for the two-step (token consume + profile verify)
-- update sequence in consumeVerificationToken(). Both writes now happen
-- inside one function call: if the profile update matches zero rows
-- (missing/mismatched users row), the whole call raises and rolls back —
-- including the token consumed_at write — instead of silently reporting
-- "verified"/"already_verified" while email_verified_at stays null.
-- Closes the gap PR #841 only partially fixed (client-side .select() +
-- row-count check on the first-consume path only; the already-consumed
-- retry path stayed unguarded).

create or replace function public.consume_email_verification_token(p_token text)
returns table(status text, user_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.email_verification_tokens%rowtype;
  v_updated_id uuid;
begin
  select * into v_row
  from public.email_verification_tokens
  where token = p_token
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid;
    return;
  end if;

  if v_row.invalidated_at is not null then
    -- Superseded by a resend before it was ever used — the stale email's
    -- link must not report success or touch email_verified_at.
    return query select 'invalidated'::text, v_row.user_id;
    return;
  end if;

  if v_row.consumed_at is not null then
    -- consumed_at is also set when a token is invalidated by a resend
    -- (issueVerificationToken) — that's not the same as having verified,
    -- so backfill email_verified_at here too rather than trusting the
    -- consumed flag alone. A missing profile row is a hard failure, not
    -- an idempotent no-op.
    if not exists (select 1 from public.users where id = v_row.user_id) then
      raise exception 'consume_email_verification_token: no users row for %', v_row.user_id;
    end if;

    update public.users
    set email_verified_at = now()
    where id = v_row.user_id
      and email_verified_at is null;

    return query select 'already_verified'::text, v_row.user_id;
    return;
  end if;

  if v_row.expires_at < now() then
    return query select 'expired'::text, null::uuid;
    return;
  end if;

  update public.email_verification_tokens
  set consumed_at = now()
  where token = p_token;

  update public.users
  set email_verified_at = now()
  where id = v_row.user_id
  returning id into v_updated_id;

  if v_updated_id is null then
    raise exception 'consume_email_verification_token: no users row for %', v_row.user_id;
  end if;

  return query select 'verified'::text, v_row.user_id;
end;
$$;

revoke all on function public.consume_email_verification_token(text) from public;
grant execute on function public.consume_email_verification_token(text) to service_role;
