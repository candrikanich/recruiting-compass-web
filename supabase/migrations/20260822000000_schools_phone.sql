-- Add a first-class phone column to schools for the Contact & Social section.
-- Phone is user-entered recruiting contact data, kept alongside website/twitter/
-- instagram (all top-level columns) rather than in the academic_info lookup blob.

alter table public.schools
  add column if not exists phone text;

comment on column public.schools.phone is
  'School recruiting/main phone number (user-entered). Contact & Social field.';
