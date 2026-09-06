-- Issue #584 dependency (docs/superpowers/specs/2026-09-02-school-data-enrichment-design.md,
-- breakdown items #4/#5): promote mascot to a real column and add school_colors +
-- scholarship_limits. Schema-only — enrichment triggers (#6-9) and UI (#10) are separate work.

alter table public.schools
  add column if not exists mascot text,
  add column if not exists school_colors text[];

comment on column public.schools.mascot is
  'School mascot name (e.g. "Eagles"). Promoted from academic_info.mascot JSONB; academic_info shape unchanged for backward compat.';

comment on column public.schools.school_colors is
  'Array of hex color strings, e.g. {"#660000","#FFFFFF"}. User-entered or enrichment-populated (see schoolMetadataLookup).';

-- Backfill from the existing JSONB field. academic_info is left untouched.
update public.schools
set mascot = academic_info ->> 'mascot'
where mascot is null
  and academic_info ->> 'mascot' is not null;

-- Read-only config table for NCAA scholarship limits, keyed by (sport, division).
-- Seed data pending item #3 (data/scholarshipLimits.json curation) — ships empty.
create table if not exists public.scholarship_limits (
  id uuid primary key default gen_random_uuid(),
  sport text not null,
  division text not null,
  total numeric,
  head_count integer,
  equivalency numeric,
  notes text,
  unique(sport, division)
);

alter table public.scholarship_limits enable row level security;

drop policy if exists scholarship_limits_select on public.scholarship_limits;
create policy scholarship_limits_select
  on public.scholarship_limits for select
  to authenticated
  using (true);
