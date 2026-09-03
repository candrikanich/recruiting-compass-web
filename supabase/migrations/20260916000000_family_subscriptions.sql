-- Family entitlement plumbing (Phase 0). Spec:
-- recruiting-compass-ios/planning/2026-09-03-pricing-model-and-entitlement-plumbing-spec.md
-- Every family gets a subscription row; family_can_write() gates writes via
-- RESTRICTIVE policies. Pre-flip (app_config.pricing_flip_at IS NULL) every
-- family is 'founding' => gate is open; no behaviour change at launch.

create type public.subscription_status as enum
  ('founding', 'trialing', 'active', 'read_only', 'comp');
create type public.subscription_source as enum
  ('founding', 'comp', 'apple', 'stripe');

create table public.app_config (
  id boolean primary key default true check (id),
  pricing_flip_at timestamptz,
  trial_days integer not null default 30 check (trial_days > 0),
  updated_at timestamptz not null default now()
);
comment on table public.app_config is 'Single-row app configuration. pricing_flip_at NULL = pricing not yet launched.';
insert into public.app_config default values;

create table public.family_subscriptions (
  family_unit_id uuid primary key references public.family_units(id) on delete cascade,
  status public.subscription_status not null,
  source public.subscription_source not null,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  provider_customer_id text,
  provider_product_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.family_subscriptions is 'One entitlement row per family unit. Written only by service role (trigger, admin, billing webhooks).';

create or replace function public.touch_family_subscriptions_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger family_subscriptions_touch_updated_at
  before update on public.family_subscriptions
  for each row execute function public.touch_family_subscriptions_updated_at();

-- Stamp a subscription on every new family.
create or replace function public.create_family_subscription()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_flip_at timestamptz;
  v_trial_days integer;
begin
  select pricing_flip_at, trial_days into v_flip_at, v_trial_days
  from public.app_config where id = true;

  if v_flip_at is null or v_flip_at > now() then
    insert into public.family_subscriptions (family_unit_id, status, source)
    values (new.id, 'founding', 'founding')
    on conflict (family_unit_id) do nothing;
  else
    insert into public.family_subscriptions (family_unit_id, status, source, trial_ends_at)
    values (new.id, 'trialing', 'founding', now() + make_interval(days => coalesce(v_trial_days, 30)))
    on conflict (family_unit_id) do nothing;
  end if;
  return new;
end;
$$;
create trigger family_units_create_subscription
  after insert on public.family_units
  for each row execute function public.create_family_subscription();

-- Backfill: every existing family is a founding family.
insert into public.family_subscriptions (family_unit_id, status, source)
select id, 'founding', 'founding' from public.family_units
on conflict (family_unit_id) do nothing;

-- Gate. NULL family_unit_id => true: such rows are not family-scoped and are
-- already constrained by the permissive policies; the gate only applies to
-- family content.
create or replace function public.family_can_write(p_family_unit_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when p_family_unit_id is null then true
    else exists (
      select 1 from public.family_subscriptions s
      where s.family_unit_id = p_family_unit_id
        and (
          s.status in ('founding', 'active', 'comp')
          or (s.status = 'trialing' and s.trial_ends_at is not null and s.trial_ends_at > now())
        )
    )
  end;
$$;
revoke all on function public.family_can_write(uuid) from public;
grant execute on function public.family_can_write(uuid) to authenticated, service_role;

-- RLS on the new tables.
alter table public.family_subscriptions enable row level security;
create policy family_subscriptions_select_member on public.family_subscriptions
  for select to authenticated
  using (public.user_is_family_member(family_unit_id));
-- No insert/update/delete policies for authenticated: service role only.

alter table public.app_config enable row level security;
create policy app_config_select_authenticated on public.app_config
  for select to authenticated using (true);

-- Restrictive write gate on family content tables. ANDs with existing
-- permissive policies; no existing policy is modified.
do $$
declare
  t text;
begin
  foreach t in array array[
    'schools', 'coaches', 'interactions', 'events', 'offers',
    'performance_metrics', 'documents', 'video_links',
    'communication_templates', 'user_deadlines', 'recommendation_letters',
    'athlete_messages', 'profile_contacts', 'school_recommendation_dismissals',
    'player_profiles'
  ] loop
    execute format(
      'create policy %I on public.%I as restrictive for insert to authenticated with check (public.family_can_write(family_unit_id))',
      t || '_insert_requires_entitlement', t);
    execute format(
      'create policy %I on public.%I as restrictive for update to authenticated using (public.family_can_write(family_unit_id)) with check (public.family_can_write(family_unit_id))',
      t || '_update_requires_entitlement', t);
    execute format(
      'create policy %I on public.%I as restrictive for delete to authenticated using (public.family_can_write(family_unit_id))',
      t || '_delete_requires_entitlement', t);
  end loop;
end;
$$;
