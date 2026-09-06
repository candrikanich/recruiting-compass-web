-- Run this against PROD before the data dump/restore.
-- Closes the last schema mismatch (another session's in-flight feature,
-- schema only — table is empty, schools.mascot/school_colors are new
-- nullable columns) so a full pg_dump/restore needs zero exclusions.

alter table public.schools
  add column if not exists mascot text,
  add column if not exists school_colors text[];

create table if not exists public.scholarship_limits (
  id uuid primary key default gen_random_uuid(),
  sport text not null,
  division text not null,
  total numeric,
  head_count integer,
  equivalency numeric,
  notes text
);
