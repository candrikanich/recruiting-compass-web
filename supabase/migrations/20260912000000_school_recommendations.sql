-- School recommendations MVP.
--
-- response_cache: durable L3 for serverless cache-aside when Upstash Redis is
-- missing. Service-role only — Nitro writes via useSupabaseAdmin().
--
-- school_recommendation_dismissals: family-scoped "not this school" feedback
-- so the empty-state grid does not keep resurfacing a dismissed catalog row.

create table if not exists public.response_cache (
  cache_key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists response_cache_expires_at_idx
  on public.response_cache (expires_at);

alter table public.response_cache enable row level security;
alter table public.response_cache force row level security;

revoke all on table public.response_cache from anon, authenticated;
grant select, insert, update, delete on table public.response_cache to service_role;

create table if not exists public.school_recommendation_dismissals (
  id uuid primary key default gen_random_uuid(),
  family_unit_id uuid not null references public.family_units(id) on delete cascade,
  athlete_user_id uuid not null references public.users(id) on delete cascade,
  catalog_key text not null check (char_length(catalog_key) between 1 and 255),
  created_at timestamptz not null default now(),
  unique (family_unit_id, catalog_key)
);

create index if not exists school_recommendation_dismissals_athlete_idx
  on public.school_recommendation_dismissals (athlete_user_id);

create index if not exists school_recommendation_dismissals_family_idx
  on public.school_recommendation_dismissals (family_unit_id, created_at desc);

alter table public.school_recommendation_dismissals enable row level security;
alter table public.school_recommendation_dismissals force row level security;

-- Family members read/write dismissals for athletes in their unit.
-- Writes from the Nitro dismiss endpoint use the service role (bypasses RLS);
-- these policies keep a future client-side path from leaking across families.
create policy "school_recommendation_dismissals_family_select"
  on public.school_recommendation_dismissals
  for select
  using (
    family_unit_id in (
      select family_unit_id
      from public.family_members
      where user_id = auth.uid()
    )
  );

create policy "school_recommendation_dismissals_family_insert"
  on public.school_recommendation_dismissals
  for insert
  with check (
    family_unit_id in (
      select family_unit_id
      from public.family_members
      where user_id = auth.uid()
    )
  );

create policy "school_recommendation_dismissals_family_delete"
  on public.school_recommendation_dismissals
  for delete
  using (
    family_unit_id in (
      select family_unit_id
      from public.family_members
      where user_id = auth.uid()
    )
  );
