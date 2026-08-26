-- Public Player Profile Phase 1: extend player_profiles for the redesigned
-- public page. Additive only (single DB serves prod + QA).

alter table public.player_profiles
  add column if not exists banner_url        text,
  add column if not exists looking_for       text,
  add column if not exists commitment_status text not null default 'uncommitted'
    check (commitment_status in ('uncommitted','committed')),
  add column if not exists committed_school_id uuid references public.schools(id) on delete set null,
  add column if not exists awards            jsonb  not null default '[]'::jsonb,
  add column if not exists values_tags       text[] not null default '{}',
  add column if not exists section_config    jsonb  not null default '[]'::jsonb,
  add column if not exists show_metrics      boolean not null default false;

-- Backfill section_config from the existing show_* bools so ordering/visibility
-- has a starting point. metrics defaults hidden (new); film/academics/schools
-- inherit their current flag. team_history + awards + values default visible.
update public.player_profiles
set section_config = jsonb_build_array(
  jsonb_build_object('key','metrics',      'visible', coalesce(show_metrics,false)),
  jsonb_build_object('key','film',         'visible', coalesce(show_film,false)),
  jsonb_build_object('key','academics',    'visible', coalesce(show_academics,false)),
  jsonb_build_object('key','values',       'visible', true),
  jsonb_build_object('key','team_history', 'visible', true),
  jsonb_build_object('key','awards',       'visible', true)
)
where section_config = '[]'::jsonb;
