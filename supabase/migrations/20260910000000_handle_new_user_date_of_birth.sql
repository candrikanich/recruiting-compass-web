-- Prod enforces email confirmation (signUp() returns session:null until the
-- link is clicked). signup.vue's client-side users upsert therefore fails
-- RLS on prod (no auth.uid()), so date_of_birth submitted at signup time was
-- never persisted for those users — only handle_new_user()'s trigger row
-- (full_name/role only) survives. Thread date_of_birth through the trigger
-- too, sourced from signUp()'s user_metadata, so it's session-independent
-- like full_name/role already are.
--
-- Guard the date cast inside the existing exception-swallowing block so a
-- malformed date never blocks user row creation.

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  BEGIN
    BEGIN
      INSERT INTO public.users (id, email, full_name, role, date_of_birth, created_at, updated_at)
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
        NULLIF(NEW.raw_user_meta_data ->> 'date_of_birth', '')::date,
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
