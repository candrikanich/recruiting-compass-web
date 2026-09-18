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

-- Atomic validate+consume, mirroring consume_email_verification_token.
-- Checks not_found / already_used / expired / email_mismatch before
-- marking consumed, so a race between two acceptance attempts can't both
-- succeed and the invited email is verified server-side, not just trusted
-- from the client.
create or replace function public.consume_admin_invitation(
  p_token text, p_email text
)
returns table(status text, invited_by uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.admin_invitations%rowtype;
begin
  select * into v_row
  from public.admin_invitations
  where token = p_token
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid;
    return;
  end if;

  if v_row.consumed_at is not null then
    return query select 'already_used'::text, null::uuid;
    return;
  end if;

  if v_row.expires_at < now() then
    return query select 'expired'::text, null::uuid;
    return;
  end if;

  if lower(v_row.invited_email) != lower(p_email) then
    return query select 'email_mismatch'::text, null::uuid;
    return;
  end if;

  update public.admin_invitations
  set consumed_at = now()
  where token = p_token;

  return query select 'consumed'::text, v_row.invited_by;
end;
$$;

revoke all on function public.consume_admin_invitation(text, text) from public;
grant execute on function public.consume_admin_invitation(text, text) to service_role;
