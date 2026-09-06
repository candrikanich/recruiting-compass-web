-- Closes a migration-history gap: the `documents` and `profile-photos`
-- storage buckets (and their RLS policies) were created outside migration
-- history (dashboard or ad hoc SQL, never committed). This reproduces them
-- exactly so a fresh project (prod) gets them via the standard migration
-- replay instead of manual bucket creation.
--
-- Idempotent by design: `on conflict do nothing` for buckets, and
-- `drop policy if exists` before each `create policy` for RLS. Verified
-- as a no-op against the existing staging project (see plan Task 2 Step 3).

insert into storage.buckets (id, name, public)
values
  ('documents', 'documents', true),
  ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

-- documents: 2 policies

drop policy if exists "Allow users to download their own files flreew_0" on storage.objects;
create policy "Allow users to download their own files flreew_0"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documents' and (auth.uid())::text = (storage.foldername(name))[1]);

drop policy if exists "Allow users to upload their own files flreew_0" on storage.objects;
create policy "Allow users to upload their own files flreew_0"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'documents' and (auth.uid())::text = (storage.foldername(name))[1]);

-- profile-photos: 7 policies

drop policy if exists "Family can delete athlete profile photos" on storage.objects;
create policy "Family can delete athlete profile photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and can_access_family_player_prefs(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Family can update athlete profile photos" on storage.objects;
create policy "Family can update athlete profile photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and can_access_family_player_prefs(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Family can upload athlete profile photos" on storage.objects;
create policy "Family can upload athlete profile photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and can_access_family_player_prefs(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Public profile photos are viewable by everyone" on storage.objects;
create policy "Public profile photos are viewable by everyone"
  on storage.objects for select
  to public
  using (bucket_id = 'profile-photos');

drop policy if exists "Users can delete their own profile photos" on storage.objects;
create policy "Users can delete their own profile photos"
  on storage.objects for delete
  to public
  using (bucket_id = 'profile-photos' and (auth.uid())::text = (storage.foldername(name))[1]);

drop policy if exists "Users can update their own profile photos" on storage.objects;
create policy "Users can update their own profile photos"
  on storage.objects for update
  to public
  using (bucket_id = 'profile-photos' and (auth.uid())::text = (storage.foldername(name))[1]);

drop policy if exists "Users can upload their own profile photos" on storage.objects;
create policy "Users can upload their own profile photos"
  on storage.objects for insert
  to public
  with check (bucket_id = 'profile-photos' and (auth.uid())::text = (storage.foldername(name))[1]);
