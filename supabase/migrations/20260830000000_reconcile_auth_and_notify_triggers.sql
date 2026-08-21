-- Reconcile triggers that existed on prod (dashboard/live-applied) but were
-- never captured as repo migrations. Discovered when the E2E test project,
-- rebuilt from repo migrations, was missing them:
--
--   1. on_auth_user_created (auth.users) — the big one. Without it, new auth
--      users get no public.users row, so test-account provisioning + the seed
--      (player -> family_members chain) + signup/auth E2E all break.
--   2. notify_on_inbound_interaction / notify_on_offer — insert notification
--      rows on inbound interactions / new offers.
--
-- handle_new_user() already exists (baseline). Creating a trigger on the
-- auth schema needs elevated privileges; run this with the service role.

-- 1. Auth user -> public.users profile row.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Notification triggers.
CREATE OR REPLACE FUNCTION public.notify_on_inbound_interaction()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE coach_name text;
BEGIN
  IF NEW.family_unit_id IS NULL THEN RETURN NEW; END IF;
  SELECT trim(COALESCE(first_name,'')||' '||COALESCE(last_name,'')) INTO coach_name FROM coaches WHERE id = NEW.coach_id;
  INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id, priority)
  SELECT fm.user_id, 'inbound_interaction', 'Coach reached out',
         COALESCE(NULLIF(coach_name,''),'A coach')||' had an inbound '||replace(NEW.type::text,'_',' ')||'.',
         'interaction', NEW.id, 'high'
  FROM family_members fm WHERE fm.family_unit_id = NEW.family_unit_id AND fm.user_id IS DISTINCT FROM NEW.logged_by;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.notify_on_offer()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE school_name text; recipients uuid[];
BEGIN
  SELECT name INTO school_name FROM schools WHERE id = NEW.school_id;
  SELECT COALESCE(array_agg(fm.user_id), ARRAY[NEW.user_id]) INTO recipients FROM family_members fm WHERE fm.family_unit_id = NEW.family_unit_id;
  INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id, priority)
  SELECT uid, 'offer', 'New offer 🎉',
         'New '||COALESCE(NEW.offer_type,'scholarship')||' offer'||COALESCE(' from '||school_name,'')||'.',
         'offer', NEW.id, 'high'
  FROM unnest(recipients) AS uid WHERE uid IS NOT NULL;
  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS notify_on_inbound_interaction_insert ON public.interactions;
CREATE TRIGGER notify_on_inbound_interaction_insert
  AFTER INSERT ON public.interactions
  FOR EACH ROW WHEN (new.direction = 'inbound'::interaction_direction)
  EXECUTE FUNCTION notify_on_inbound_interaction();

DROP TRIGGER IF EXISTS notify_on_offer_insert ON public.offers;
CREATE TRIGGER notify_on_offer_insert
  AFTER INSERT ON public.offers
  FOR EACH ROW EXECUTE FUNCTION notify_on_offer();
