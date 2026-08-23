-- Prevent duplicate schools within a family unit.
--
-- The app's duplicate gate is a client-side, in-memory name check
-- (useSchools.findDuplicate); it can miss when the school list is not fully
-- loaded, and it does not protect any non-UI write path. This adds a hard,
-- case/whitespace-insensitive guarantee at the database level.
--
-- Scoped to rows with a family_unit_id (all app-created schools). Verified 0
-- existing collisions before creation.
create unique index if not exists schools_family_unit_name_unique
  on public.schools (family_unit_id, lower(btrim(name)))
  where family_unit_id is not null;
