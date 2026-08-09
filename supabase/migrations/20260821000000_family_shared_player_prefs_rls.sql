-- Family-shared player-owned preferences: let any member of a family read/write the
-- athlete's player-owned preference rows (player, location, school).
--
-- Context: user_preferences is one row per (user_id, category). The canonical player
-- profile is the player-role member's row. Parents (and the player) must all read AND
-- write that row. iOS talks to Postgres directly (RLS enforced), so RLS must permit it;
-- web uses the service-role client (RLS bypassed) and is unaffected by these policies.
--
-- Scope is limited to the three player-owned categories. Personal categories
-- (notifications, dashboard customization, etc.) stay private under the existing
-- self-scoped policies. All policies are additive and OR together with those.

-- Non-recursive membership check. SECURITY DEFINER + reuse of get_user_family_ids()
-- avoids the family_members RLS recursion trap. Returns true when the target user is a
-- player-role member of a family the caller belongs to.
create or replace function public.can_access_family_player_prefs(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from family_members them
    where them.user_id = target_user
      and them.role = 'player'
      and them.family_unit_id in (select family_unit_id from get_user_family_ids())
  );
$$;

drop policy if exists "Family can view player-owned prefs" on public.user_preferences;
create policy "Family can view player-owned prefs"
  on public.user_preferences for select
  using (
    category in ('player', 'location', 'school')
    and public.can_access_family_player_prefs(user_id)
  );

drop policy if exists "Family can update player-owned prefs" on public.user_preferences;
create policy "Family can update player-owned prefs"
  on public.user_preferences for update
  using (
    category in ('player', 'location', 'school')
    and public.can_access_family_player_prefs(user_id)
  )
  with check (
    category in ('player', 'location', 'school')
    and public.can_access_family_player_prefs(user_id)
  );

drop policy if exists "Family can insert player-owned prefs" on public.user_preferences;
create policy "Family can insert player-owned prefs"
  on public.user_preferences for insert
  with check (
    category in ('player', 'location', 'school')
    and public.can_access_family_player_prefs(user_id)
  );
