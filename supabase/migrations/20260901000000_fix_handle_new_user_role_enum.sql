-- handle_new_user() defaulted any non-parent role to 'student', which is NOT a
-- user_role enum value (the enum is admin|parent|player). The cast therefore
-- threw for every player/student signup, and the function's own EXCEPTION
-- handler swallowed it — so new players got NO public.users row from the
-- trigger. The app masked this by upserting the profile on first login, but the
-- trigger itself was inert for players. Surfaced when E2E signup flows created
-- new users and never landed on a profile-backed page.
--
-- Map valid roles through and default to 'player' (the common signup role).

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  BEGIN
    BEGIN
      INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        CASE
          WHEN (NEW.raw_user_meta_data ->> 'role') IN ('parent', 'player', 'admin') THEN
            (NEW.raw_user_meta_data ->> 'role')::user_role
          ELSE
            'player'::user_role
        END,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Error creating user profile: %', SQLERRM;
    END;
    RETURN NEW;
  END;
  $function$;
