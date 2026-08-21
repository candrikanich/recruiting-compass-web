-- Reopen a school from the `not_pursuing` off-ramp, restoring the stage it was
-- at BEFORE it was marked not_pursuing (from school_status_history) instead of
-- resetting to researching and losing funnel progress. Falls back to
-- researching when there is no usable prior stage.
--
-- See planning/2026-08-21-school-status-pipeline-spec.md (open question 4).

create or replace function public.reactivate_school(
  p_school_id uuid,
  p_actor uuid
)
returns public.school_status
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  prev text;
  restore_status public.school_status;
begin
  -- Prior stage = previous_status of the most recent move INTO not_pursuing.
  select previous_status into prev
  from public.school_status_history
  where school_id = p_school_id
    and new_status = 'not_pursuing'
  order by changed_at desc
  limit 1;

  -- Cast the stored text back to the enum; tolerate anything unexpected.
  begin
    restore_status := prev::public.school_status;
  exception when others then
    restore_status := 'researching'::public.school_status;
  end;

  -- Only restore into a live progress stage; never a deprecated/off-ramp value.
  if restore_status is null
     or restore_status not in (
       'researching'::public.school_status,
       'contacted'::public.school_status,
       'visiting'::public.school_status,
       'offer_received'::public.school_status,
       'committed'::public.school_status
     ) then
    restore_status := 'researching'::public.school_status;
  end if;

  update public.schools
  set status = restore_status,
      status_changed_at = now(),
      updated_by = p_actor,
      updated_at = now()
  where id = p_school_id;

  insert into public.school_status_history
    (school_id, previous_status, new_status, changed_by, changed_at, notes)
  values
    (p_school_id, 'not_pursuing', restore_status::text, p_actor, now(),
     'Reactivated from not_pursuing');

  return restore_status;
end;
$$;
