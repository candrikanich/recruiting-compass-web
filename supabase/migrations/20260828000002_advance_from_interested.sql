-- Patch: also auto-advance schools at the 'interested' stage to 'contacted'
-- when an interaction is logged (previously only 'researching'/NULL advanced).
--
-- Rationale: pending the full pipeline formalization (see
-- planning/2026-08-21-school-status-pipeline-spec.md), 'interested' is an
-- affinity signal that currently lives on the progress axis and sits *before*
-- 'contacted' in the iOS ordering. A school you've logged interactions against
-- should read as contacted regardless of whether it was tagged 'interested'.
--
-- Superseded design note: the long-term fix moves 'interested' off the status
-- axis onto the favorite flag. This patch is the interim behavior.

create or replace function public.advance_school_status_on_interaction()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_status public.school_status;
begin
  select status into current_status
  from public.schools
  where id = new.school_id;

  -- Pre-contact stages that auto-advance: NULL, researching, interested.
  if current_status is not null
     and current_status not in (
       'researching'::public.school_status,
       'interested'::public.school_status
     ) then
    return new;
  end if;

  update public.schools
  set status = 'contacted'::public.school_status,
      status_changed_at = now(),
      updated_by = new.logged_by,
      updated_at = now()
  where id = new.school_id;

  insert into public.school_status_history
    (school_id, previous_status, new_status, changed_by, changed_at, notes)
  values
    (new.school_id, current_status::text, 'contacted', new.logged_by, now(),
     'Auto-advanced: interaction logged');

  return new;
end;
$$;

-- Backfill schools now covered by the widened rule (interested + any
-- researching missed earlier) that already have interactions.
with to_advance as (
  select s.id as school_id,
         s.status::text as previous_status,
         (array_agg(i.logged_by order by i.created_at asc))[1] as first_logged_by
  from public.schools s
  join public.interactions i on i.school_id = s.id
  where s.status is null
     or s.status in (
       'researching'::public.school_status,
       'interested'::public.school_status
     )
  group by s.id, s.status
),
updated as (
  update public.schools s
  set status = 'contacted'::public.school_status,
      status_changed_at = now(),
      updated_by = ta.first_logged_by,
      updated_at = now()
  from to_advance ta
  where s.id = ta.school_id
  returning s.id
)
insert into public.school_status_history
  (school_id, previous_status, new_status, changed_by, changed_at, notes)
select ta.school_id, ta.previous_status, 'contacted', ta.first_logged_by, now(),
       'Auto-advanced (backfill): existing interaction'
from to_advance ta;
