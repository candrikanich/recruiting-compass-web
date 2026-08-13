-- Add an athletics-specific website column to schools for the Contact & Social
-- section. Some schools run a separate athletics site (e.g. goashlandeagles.com)
-- distinct from the general school website. User-entered, top-level column
-- alongside website/phone/twitter/instagram.

alter table public.schools
  add column if not exists athletics_url text;

comment on column public.schools.athletics_url is
  'School athletics-specific website (user-entered). Contact & Social field, separate from the general website column.';
