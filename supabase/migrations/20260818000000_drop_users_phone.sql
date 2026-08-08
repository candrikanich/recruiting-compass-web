-- Remove users.phone (app credentials stay separate from recruiting contact).
--
-- The athlete's recruiting phone now lives in the player-profile jsonb
-- (user_preferences category='player' data.phone) and drives the coach-outreach
-- {{playerPhone}} var (pref:player.phone). users.email (login) is unaffected.
--
-- Backfill any existing users.phone into the player jsonb first (only where the
-- player row exists and has no phone yet), then drop the column. Idempotent.

UPDATE public.user_preferences p
SET data = jsonb_set(COALESCE(p.data, '{}'::jsonb), '{phone}', to_jsonb(u.phone))
FROM public.users u
WHERE p.user_id = u.id
  AND p.category = 'player'
  AND u.phone IS NOT NULL
  AND u.phone <> ''
  AND (p.data->>'phone') IS NULL;

ALTER TABLE public.users DROP COLUMN IF EXISTS phone;
