-- Coach Outreach — Phase 5: per-sport / per-division contact-window config.
--
-- Drives the silent swap between the `intro-standard` and `intro-pre-window`
-- templates. Dates are CONFIG, never hardcoded in app code — they move yearly.
-- NOTE: seed values below are per docs/coach-outreach/migration-build-plan.md
-- and are UNVERIFIED against ncaa.org — confirm current dates before launch.
--
-- Selection at compose time: (sport, division) -> exact rule, else ("*", division)
-- default. rule_kind = how window_date anchors to `reference` grade:
--   date_before_grade : the window opens the given date BEFORE that grade begins
--   date_after_grade  : the window opens the given date the year that grade ends
--   unrestricted      : no NCAA restriction (electronic contact always allowed)

create table if not exists contact_window_rules (
  id          uuid primary key default gen_random_uuid(),
  sport       text not null,   -- lowercase sport name, or '*' for division default
  division    text not null,   -- 'D1','D2','D3','NAIA','JUCO'
  rule_kind   text not null,
  reference   text,            -- 'junior' | 'sophomore' | ...
  window_date text,            -- e.g. 'Aug 1' — display; computed per athlete gradYear
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint contact_window_rules_kind_check
    check (rule_kind in ('date_before_grade', 'date_after_grade', 'unrestricted')),
  constraint contact_window_rules_sport_division_uniq unique (sport, division)
);

-- Read-only config: any authenticated user may read; no client writes.
alter table contact_window_rules enable row level security;

drop policy if exists contact_window_rules_select on contact_window_rules;
create policy contact_window_rules_select
  on contact_window_rules for select
  to authenticated
  using (true);

insert into contact_window_rules (sport, division, rule_kind, reference, window_date, notes)
values
  ('baseball', 'D1', 'date_before_grade', 'junior',    'Aug 1',  'Coaches may contact starting Aug 1 before junior year.'),
  ('softball', 'D1', 'date_after_grade',  'sophomore', 'Sept 1', 'Sept 1 of junior year.'),
  ('football', 'D1', 'date_after_grade',  'sophomore', 'Sept 1', 'Sept 1 of junior year (recruiting materials Jun 15 after sophomore).'),
  ('*',        'D1', 'date_after_grade',  'sophomore', 'Jun 15', 'Default D1: Jun 15 after sophomore year (text/email/social).'),
  ('*',        'D2', 'unrestricted',      null,        null,     'D2 electronic contact effectively unrestricted.'),
  ('*',        'D3', 'unrestricted',      null,        null,     'No NCAA D3 contact-date restriction.'),
  ('*',        'NAIA', 'unrestricted',    null,        null,     'No NAIA contact-date restriction.'),
  ('*',        'JUCO', 'unrestricted',    null,        null,     'No NJCAA/JUCO contact-date restriction.')
on conflict (sport, division) do update set
  rule_kind   = excluded.rule_kind,
  reference   = excluded.reference,
  window_date = excluded.window_date,
  notes       = excluded.notes,
  updated_at  = now();
