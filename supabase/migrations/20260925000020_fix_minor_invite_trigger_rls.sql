-- enforce_minor_requires_invite runs as SECURITY INVOKER (the default), so its
-- EXISTS(SELECT ... FROM family_invitations) check is filtered by the caller's
-- own RLS — family_invitations_select only lets a caller see invitations for a
-- family they're already a member of. A player accepting their first invite is
-- NOT a family_members row yet (that insert happens later, in the accept
-- endpoint), so the check always sees zero rows and always raises "Players
-- under 18 must join through a parent or guardian family invitation" — even
-- when a real, matching, pending invitation exists. This blocks every minor
-- player signup via invite.
--
-- Fix: SECURITY DEFINER so the integrity check sees all rows regardless of the
-- caller's own visibility, matching its intent as a server-side guard rather
-- than a user-facing query. search_path pinned per Postgres security guidance
-- for SECURITY DEFINER functions.
create or replace function public.enforce_minor_requires_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if new.role = 'player'
     and new.date_of_birth is not null
     and new.date_of_birth > (current_date - interval '18 years') then

    if not exists (
         select 1
         from public.family_members fm
         where fm.user_id = new.id
       )
       and not exists (
         select 1
         from public.family_invitations fi
         where lower(fi.invited_email) = lower(new.email)
           and fi.role = 'player'
           and fi.status in ('pending', 'accepted')
           and fi.expires_at > now()
       ) then
      raise exception
        'Players under 18 must join through a parent or guardian family invitation.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$function$;
