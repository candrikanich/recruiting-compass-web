-- One-off reconciliation: collapse parent-owned player-owned preference rows onto the
-- canonical athlete row. After this + the family-shared RLS, the player-role member's row
-- is the single source of truth for player/location/school; the whole family edits it.
--
-- Policy (decided): MERGE-THEN-DELETE.
--   * If the athlete already has a row for the category -> delete the parent's stale row.
--   * If the athlete has none -> copy the parent's data into a new athlete row, then delete.
-- Families with no player-role member are left untouched (no target).
-- Guarded to families with exactly one player to avoid ambiguous multi-athlete copies.

begin;

-- 1. MERGE: copy parent data into the athlete row for categories the athlete lacks.
with single_athlete_families as (
  select family_unit_id
  from family_members
  where role = 'player'
  group by family_unit_id
  having count(*) = 1
)
insert into public.user_preferences (user_id, category, data, updated_at)
select a.user_id, pr.category, pr.data, now()
from (
  select fm.family_unit_id, up.category, up.data
  from family_members fm
  join public.user_preferences up on up.user_id = fm.user_id
  where fm.role = 'parent' and up.category in ('player', 'location', 'school')
) pr
join single_athlete_families saf on saf.family_unit_id = pr.family_unit_id
join family_members a on a.family_unit_id = pr.family_unit_id and a.role = 'player'
where not exists (
  select 1 from public.user_preferences aup
  where aup.user_id = a.user_id and aup.category = pr.category
);

-- 2. DELETE parent rows once the family has an athlete (athlete row now guaranteed to exist).
delete from public.user_preferences up
using family_members fm
where up.user_id = fm.user_id
  and fm.role = 'parent'
  and up.category in ('player', 'location', 'school')
  and exists (
    select 1 from family_members a
    where a.family_unit_id = fm.family_unit_id and a.role = 'player'
  );

commit;
