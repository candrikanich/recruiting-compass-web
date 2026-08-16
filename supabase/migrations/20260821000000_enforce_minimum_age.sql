-- COPPA: enforce a minimum age of 13 for player accounts at the database layer.
--
-- All client-side age gates (web signup, family-invite signup, profile edit, iOS
-- signup) are bypassable because signup writes go browser -> Supabase directly with
-- no server endpoint. This trigger is the authoritative gate: it rejects any player
-- row whose date_of_birth resolves to an age under 13, regardless of client.
--
-- Fails OPEN when date_of_birth is NULL (DOB is optional for some flows and is never
-- collected for parents) so the trigger never blocks legitimate rows that simply lack
-- a birthdate.

create or replace function public.enforce_minimum_age()
returns trigger
language plpgsql
as $$
begin
  if new.role = 'player'
     and new.date_of_birth is not null
     and new.date_of_birth > (current_date - interval '13 years') then
    raise exception 'Users must be at least 13 years old to use Recruiting Compass (COPPA).'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_minimum_age on public.users;

create trigger trg_enforce_minimum_age
  before insert or update on public.users
  for each row
  execute function public.enforce_minimum_age();
