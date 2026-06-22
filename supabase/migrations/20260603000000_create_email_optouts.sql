-- Email opt-out suppression list for recurring (marketing-class) emails.
-- Transactional mail (invites, auth) is exempt and never consults this table.
-- One row per opted-out address; presence = suppressed.

create table if not exists email_optouts (
  email      text primary key,
  created_at timestamptz not null default now()
);

-- Primary key already indexes `email`, the only filter column (suppression .eq).

-- Service-role only: written by the unsubscribe endpoint, read by the send path.
-- Never queried from the client. RLS enabled with no policy => deny-all to anon/auth,
-- which is the intended posture (service role bypasses RLS).
alter table email_optouts enable row level security;
