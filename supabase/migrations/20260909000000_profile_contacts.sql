-- Inbound recruiting-lead sink for the public player profile (Phase 3 Contact
-- Player, Phase 4 Express Interest). A coach/visitor submits a lightweight form
-- on the public page; the server inserts a row here (service-role) and notifies
-- the player. No coach/school rows are created from unauthenticated input, so
-- matched_coach_id/school_id are nullable and school_name carries free text.
create table if not exists public.profile_contacts (
  id uuid primary key default gen_random_uuid(),
  family_unit_id uuid not null references public.family_units(id) on delete cascade,
  player_user_id uuid references auth.users(id) on delete set null,
  type text not null default 'contact' check (type in ('contact', 'interest')),
  coach_name text not null,
  coach_email text,
  coach_title text,
  matched_coach_id uuid references public.coaches(id) on delete set null,
  school_id uuid references public.schools(id) on delete set null,
  school_name text,
  note text,
  program text,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.profile_contacts enable row level security;

-- Family members read their own inbound leads (Phase 4 inbox). No INSERT/UPDATE/
-- DELETE policy: writes happen only via the service-role client in the hardened
-- public endpoint, never from an authenticated browser session.
create policy "profile_contacts family read"
  on public.profile_contacts
  for select
  using (
    family_unit_id in (
      select family_unit_id
      from public.family_members
      where user_id = auth.uid()
    )
  );

create index if not exists idx_profile_contacts_family
  on public.profile_contacts (family_unit_id, created_at desc);
