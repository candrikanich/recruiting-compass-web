-- Closes a race found live on QA: a guardian confirming a player's claim
-- (server/api/guardian/claim/[token]/accept.post.ts) landed in TWO separate
-- family_units. Two independent "check family_units.created_by_user_id, else
-- create one" callers -- plugins/auth.client.ts's SIGNED_IN listener (fires
-- automatically on every new session, calls /api/family/create) and this same
-- accept endpoint's own family-creation branch, both firing within the same
-- signup-then-confirm request -- both passed the SELECT before either INSERT
-- committed, so both created a family. The player only ended up in the accept
-- endpoint's family; the dashboard picked the OTHER (player-less) one as active.
--
-- Deliberately scoped to `created_by_user_id`, not a general one-family-per-user
-- constraint: parents legitimately belong to multiple family_units in this app
-- (dashboard.vue's parentAccessibleFamilies / activeFamily context-switch is
-- built for that). What must never happen twice is a single user being recorded
-- as the CREATOR of a family -- every "check existing, else create" caller reads
-- this same column, so a duplicate creator row is what let the race produce two
-- families for one guardian in the first place. idx_player_one_family (a
-- pre-existing, role-scoped constraint) is the nearest analogue and untouched.
--
-- The race that motivates this index has already fired live, so every
-- environment that hit it is carrying the exact duplicate rows this index is
-- meant to forbid -- the bare CREATE UNIQUE INDEX below fails on first apply.
-- Data repair (this block) must run first, in the same transaction, so no new
-- duplicate can sneak in between repair and constraint.
begin;

-- Canonical pick per duplicated created_by_user_id: earliest created_at,
-- ties broken by id (this repo's uuid-min idiom, see
-- 20260727000004_phase10a_preflight_data_repair.sql / 20260805000000).
create temporary table family_units_merge_map on commit drop as
with ranked as (
  select
    id,
    created_by_user_id,
    row_number() over (
      partition by created_by_user_id
      order by created_at asc, id::text asc
    ) as rn
  from public.family_units
  where created_by_user_id is not null
),
canonical as (
  select created_by_user_id, id as canonical_id
  from ranked
  where rn = 1
)
select r.id as dup_id, c.canonical_id
from ranked r
join canonical c using (created_by_user_id)
where r.rn > 1;

-- Nullable family_unit_id FKs with no uniqueness in play: repoint straight.
update public.schools t set family_unit_id = m.canonical_id
  from family_units_merge_map m where t.family_unit_id = m.dup_id;
update public.coaches t set family_unit_id = m.canonical_id
  from family_units_merge_map m where t.family_unit_id = m.dup_id;
update public.documents t set family_unit_id = m.canonical_id
  from family_units_merge_map m where t.family_unit_id = m.dup_id;
update public.events t set family_unit_id = m.canonical_id
  from family_units_merge_map m where t.family_unit_id = m.dup_id;
update public.interactions t set family_unit_id = m.canonical_id
  from family_units_merge_map m where t.family_unit_id = m.dup_id;
update public.offers t set family_unit_id = m.canonical_id
  from family_units_merge_map m where t.family_unit_id = m.dup_id;
update public.performance_metrics t set family_unit_id = m.canonical_id
  from family_units_merge_map m where t.family_unit_id = m.dup_id;
update public.social_media_posts t set family_unit_id = m.canonical_id
  from family_units_merge_map m where t.family_unit_id = m.dup_id;
update public.recommendation_letters t set family_unit_id = m.canonical_id
  from family_units_merge_map m where t.family_unit_id = m.dup_id;
update public.user_deadlines t set family_unit_id = m.canonical_id
  from family_units_merge_map m where t.family_unit_id = m.dup_id;
update public.communication_templates t set family_unit_id = m.canonical_id
  from family_units_merge_map m where t.family_unit_id = m.dup_id;
update public.athlete_messages t set family_unit_id = m.canonical_id
  from family_units_merge_map m where t.family_unit_id = m.dup_id;
update public.video_links t set family_unit_id = m.canonical_id
  from family_units_merge_map m where t.family_unit_id = m.dup_id;

-- NOT NULL family_unit_id FKs with no uniqueness in play: same, straight repoint.
update public.player_profiles t set family_unit_id = m.canonical_id
  from family_units_merge_map m where t.family_unit_id = m.dup_id;
update public.family_invitations t set family_unit_id = m.canonical_id
  from family_units_merge_map m where t.family_unit_id = m.dup_id;
update public.family_code_usage_log t set family_unit_id = m.canonical_id
  from family_units_merge_map m where t.family_unit_id = m.dup_id;
update public.profile_contacts t set family_unit_id = m.canonical_id
  from family_units_merge_map m where t.family_unit_id = m.dup_id;

-- school_recommendation_dismissals: unique(family_unit_id, catalog_key).
-- Repointing a dup's dismissal could collide with one the canonical family
-- already recorded for the same school -- keep the canonical's, drop the
-- dup's redundant one. A creator can have more than 2 duplicate family_units
-- (the race isn't strictly pairwise), so dismissals from separate dup rows
-- can also collide with EACH OTHER once repointed onto the same canonical_id
-- -- dedupe those against each other too before the final repoint (set-based
-- UPDATE has no ON CONFLICT to fall back on).
delete from public.school_recommendation_dismissals t
  using family_units_merge_map m
  where t.family_unit_id = m.dup_id
    and exists (
      select 1 from public.school_recommendation_dismissals keep
      where keep.family_unit_id = m.canonical_id
        and keep.catalog_key = t.catalog_key
    );
with ranked_dups as (
  select
    t.id,
    row_number() over (
      partition by m.canonical_id, t.catalog_key
      order by t.created_at asc, t.id::text asc
    ) as rn
  from public.school_recommendation_dismissals t
  join family_units_merge_map m on t.family_unit_id = m.dup_id
)
delete from public.school_recommendation_dismissals t
  using ranked_dups r
  where t.id = r.id and r.rn > 1;
update public.school_recommendation_dismissals t set family_unit_id = m.canonical_id
  from family_units_merge_map m where t.family_unit_id = m.dup_id;

-- family_members: unique(family_unit_id, user_id). A member (usually the
-- duplicate-creating user, sometimes a parent already added to both) may
-- already have a row on the canonical family -- keep that one, drop the
-- dup's redundant membership. Same N-way hazard as above: dedupe remaining
-- dup rows against each other (same user_id across 3+ duplicate families)
-- before the final repoint.
delete from public.family_members t
  using family_units_merge_map m
  where t.family_unit_id = m.dup_id
    and exists (
      select 1 from public.family_members keep
      where keep.family_unit_id = m.canonical_id
        and keep.user_id = t.user_id
    );
with ranked_dups as (
  select
    t.id,
    row_number() over (
      partition by m.canonical_id, t.user_id
      order by t.added_at asc, t.id::text asc
    ) as rn
  from public.family_members t
  join family_units_merge_map m on t.family_unit_id = m.dup_id
)
delete from public.family_members t
  using ranked_dups r
  where t.id = r.id and r.rn > 1;
update public.family_members t set family_unit_id = m.canonical_id
  from family_units_merge_map m where t.family_unit_id = m.dup_id;

-- family_subscriptions: family_unit_id IS the primary key (one row per
-- family), so multiple duplicate families can each be carrying real billing
-- state. Prefer an existing canonical row untouched; otherwise adopt exactly
-- one dup's row (earliest created_at, this repo's uuid-min tiebreak) onto
-- the canonical id, so real active/trialing state is never silently dropped
-- in favor of an empty one -- and never risk a PK collision if 3+ duplicate
-- families each had their own subscription row.
with adopt as (
  select
    t.family_unit_id as dup_id,
    m.canonical_id,
    row_number() over (
      partition by m.canonical_id
      order by t.created_at asc, t.family_unit_id::text asc
    ) as rn
  from public.family_subscriptions t
  join family_units_merge_map m on t.family_unit_id = m.dup_id
  where not exists (
    select 1 from public.family_subscriptions keep
    where keep.family_unit_id = m.canonical_id
  )
)
update public.family_subscriptions t
set family_unit_id = a.canonical_id
from adopt a
where t.family_unit_id = a.dup_id and a.rn = 1;
delete from public.family_subscriptions t
  using family_units_merge_map m
  where t.family_unit_id = m.dup_id;

-- All dependents repointed or explicitly resolved -- safe to drop the
-- duplicate family_units rows themselves (not relying on cascade, since
-- cascade would have raced ahead of the repoints above).
delete from public.family_units fu
  using family_units_merge_map m
  where fu.id = m.dup_id;

do $$
declare
  remaining int;
begin
  select count(*) into remaining
  from (
    select created_by_user_id
    from public.family_units
    where created_by_user_id is not null
    group by created_by_user_id
    having count(*) > 1
  ) dupes;

  if remaining > 0 then
    raise exception
      'family_units_one_per_creator repair incomplete: % duplicate creator(s) remain',
      remaining;
  end if;
end $$;

create unique index if not exists idx_family_units_one_per_creator
  on public.family_units (created_by_user_id)
  where created_by_user_id is not null;

commit;
