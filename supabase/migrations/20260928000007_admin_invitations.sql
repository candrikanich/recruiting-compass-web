-- Issue #854: admin promotion was gated by one static, permanent shared
-- secret (server/utils/adminToken.ts) — anyone who ever saw it could
-- self-promote any existing account to admin, forever. Replaces it with
-- per-invitation, email-bound, single-use, expiring tokens, mirroring
-- email_verification_tokens (20260928000001) + its atomic-consume RPC
-- (20260928000006).
create table if not exists public.admin_invitations (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  invited_email text not null,
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists admin_invitations_token_idx
  on public.admin_invitations (token);

alter table public.admin_invitations enable row level security;
-- No client-visible policies — service role only (server/utils/supabase.ts
-- useSupabaseAdmin()), matching email_verification_tokens.

-- Atomic validate+consume+grant, mirroring consume_email_verification_token.
-- Checks not_found / already_used / expired / email_mismatch before
-- marking consumed and applying the admin grant to p_user_id, all inside
-- one function call — if the users update fails or matches zero rows, the
-- whole call raises and rolls back, INCLUDING the consumed_at write, so a
-- failed grant never permanently burns a valid invitation (review finding
-- on the two-phase version: a separate later update meant a failure there
-- left the token consumed but the account never actually promoted, with
-- no way to retry).
--
-- p_user_id/p_email are the caller's own authenticated identity, not
-- client-supplied — the review also caught that consuming with a
-- client-supplied email while granting to a different authenticated user
-- let any token holder promote an unrelated account. Binding both to the
-- same row inside the function closes that: the invitation's email must
-- match the account being promoted, in the same statement.
create or replace function public.consume_admin_invitation(
  p_token text, p_user_id uuid, p_email text, p_full_name text
)
returns table(status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.admin_invitations%rowtype;
  v_updated_id uuid;
begin
  select * into v_row
  from public.admin_invitations
  where token = p_token
  for update;

  if not found then
    return query select 'not_found'::text;
    return;
  end if;

  if v_row.consumed_at is not null then
    return query select 'already_used'::text;
    return;
  end if;

  if v_row.expires_at < now() then
    return query select 'expired'::text;
    return;
  end if;

  if lower(v_row.invited_email) != lower(p_email) then
    return query select 'email_mismatch'::text;
    return;
  end if;

  update public.admin_invitations
  set consumed_at = now()
  where token = p_token;

  update public.users
  set full_name = p_full_name,
      role = 'parent',
      is_admin = true
  where id = p_user_id
  returning id into v_updated_id;

  if v_updated_id is null then
    raise exception 'consume_admin_invitation: no users row for %', p_user_id;
  end if;

  return query select 'consumed'::text;
end;
$$;

revoke all on function public.consume_admin_invitation(text, uuid, text, text) from public;
grant execute on function public.consume_admin_invitation(text, uuid, text, text) to service_role;
