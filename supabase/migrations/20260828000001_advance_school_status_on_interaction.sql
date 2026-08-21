-- Auto-advance a school from the initial 'researching' stage to 'contacted'
-- the first time an interaction is logged against it.
--
-- Why: the Schools "Contacted" stat (iOS SchoolsListViewModel + web
-- useSchoolStats) counts schools whose status == 'contacted'. Logging an
-- interaction never touched school.status, so a school you'd clearly reached
-- out to still showed as 'researching' and never counted as contacted.
--
-- Rule: advance ONLY from 'researching' (or NULL). Any later stage
-- (interested/committed/offer_received/etc.) is left untouched — 'interested'
-- and beyond sit *after* 'contacted' in the funnel, so moving them would be a
-- backward step. This keeps the pipeline monotonic and avoids double-counting.
--
-- Runs at the DB layer so iOS and web get identical behavior with no app code.

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

  -- Only the initial stage (researching / NULL) auto-advances.
  if current_status is not null
     and current_status <> 'researching'::public.school_status then
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

drop trigger if exists trg_advance_school_status_on_interaction on public.interactions;

create trigger trg_advance_school_status_on_interaction
after insert on public.interactions
for each row
execute function public.advance_school_status_on_interaction();

-- One-time backfill: schools that already have interactions but are still at
-- the initial stage. Uses the earliest interaction's logger as changed_by.
with to_advance as (
  select s.id as school_id,
         s.status::text as previous_status,
         (array_agg(i.logged_by order by i.created_at asc))[1] as first_logged_by
  from public.schools s
  join public.interactions i on i.school_id = s.id
  where s.status is null
     or s.status = 'researching'::public.school_status
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
