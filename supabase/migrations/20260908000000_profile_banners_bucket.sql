-- Public profile banner images. Public read (banners appear on the public
-- page); authenticated users write only under their own <user_id>/ prefix.
insert into storage.buckets (id, name, public)
values ('profile-banners', 'profile-banners', true)
on conflict (id) do nothing;

create policy "profile-banners public read"
  on storage.objects for select
  using (bucket_id = 'profile-banners');

create policy "profile-banners owner write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile-banners owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'profile-banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile-banners owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
