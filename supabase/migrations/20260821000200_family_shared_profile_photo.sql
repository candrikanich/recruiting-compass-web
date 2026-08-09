-- Family-shared profile photo: let a family member set the athlete's profile photo.
--
-- Reads already work: the `profile-photos` bucket is public, and the users table has a
-- "view family members' profiles" SELECT policy. Only the WRITE path is blocked:
--   * storage.objects INSERT/UPDATE/DELETE require auth.uid() = <folder> (own folder only)
--   * users UPDATE is self-only (auth.uid() = id)
--
-- This migration unlocks the write path for the athlete's photo, scoped via
-- can_access_family_player_prefs (added in 20260821000000). The player editing their own
-- photo is also covered (a player is a player-role member of their own family).

-- 1. users.profile_photo_url write via SECURITY DEFINER RPC (column-scoped; avoids a broad
--    users UPDATE policy that would let a parent change email/role/etc). null clears the photo.
create or replace function public.set_athlete_profile_photo(athlete_id uuid, photo_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Allow a user to set their own photo (parity with the self-only users UPDATE policy)
  -- or a family member to set a linked athlete's photo.
  if not (athlete_id = auth.uid() or can_access_family_player_prefs(athlete_id)) then
    raise exception 'not authorized to set profile photo for %', athlete_id
      using errcode = '42501';
  end if;
  update public.users set profile_photo_url = photo_url where id = athlete_id;
end;
$$;

revoke all on function public.set_athlete_profile_photo(uuid, text) from public, anon;
grant execute on function public.set_athlete_profile_photo(uuid, text) to authenticated;

-- 2. Storage: family members may write objects under an athlete's folder
--    (profile-photos/<athleteUserId>/...). The uuid-shape guard keeps the ::uuid cast safe.
drop policy if exists "Family can upload athlete profile photos" on storage.objects;
create policy "Family can upload athlete profile photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and public.can_access_family_player_prefs(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Family can update athlete profile photos" on storage.objects;
create policy "Family can update athlete profile photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and public.can_access_family_player_prefs(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Family can delete athlete profile photos" on storage.objects;
create policy "Family can delete athlete profile photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and public.can_access_family_player_prefs(((storage.foldername(name))[1])::uuid)
  );
