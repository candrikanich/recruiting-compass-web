-- Stamp coaches.last_contact_date when an interaction is logged.
--
-- Background: coaches.last_contact_date was only written by the old inline
-- coach-composer path. Interactions logged through /interactions/add (or iOS)
-- never advanced it, so coach-list "days since contact", sorting, and filters
-- went stale. This AFTER INSERT trigger stamps it for every write path.
--
-- Forward-only: uses GREATEST so a backdated older interaction never regresses
-- a coach that already has more recent contact. SECURITY DEFINER so it can
-- update coaches regardless of the caller's RLS (the trigger only ever touches
-- the coach the interaction already references).
--
-- Scope: INSERT only, matching "stamp on interaction create". Edits/deletes of
-- interactions do not recompute the field (rare; a follow-up could recompute).

create or replace function public.stamp_coach_last_contact()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.coach_id is not null and new.occurred_at is not null then
    update public.coaches
       set last_contact_date = greatest(
             coalesce(last_contact_date, new.occurred_at),
             new.occurred_at
           )
     where id = new.coach_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stamp_coach_last_contact on public.interactions;

create trigger trg_stamp_coach_last_contact
  after insert on public.interactions
  for each row
  execute function public.stamp_coach_last_contact();

-- Backfill existing coaches from their interaction history (forward-only).
update public.coaches c
   set last_contact_date = greatest(coalesce(c.last_contact_date, sub.mx), sub.mx)
  from (
    select coach_id, max(occurred_at) as mx
      from public.interactions
     where coach_id is not null
       and occurred_at is not null
     group by coach_id
  ) sub
 where c.id = sub.coach_id;
