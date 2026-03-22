-- Backfill V1 preference data into V2 for users who have V1 data but no V2 row.
--
-- Background: On 2026-01-27 (commit eac0e54) preferences were migrated from a flat
-- user_preferences table (now user_preferences_v1_backup) to a category-based
-- user_preferences table. The one-time data migration was applied live but the SQL
-- was never committed, so any user whose V2 row was lost or who predates that run
-- will see empty preferences. This migration backfills the gaps idempotently.
--
-- Column mapping (V1 → V2 category):
--   home_location          → location
--   notification_settings  → notifications
--   player_details         → player
--   school_preferences     → school
--   dashboard_layout       → dashboard

-- location
INSERT INTO public.user_preferences (user_id, category, data, created_at, updated_at)
SELECT
    v1.user_id,
    'location',
    v1.home_location,
    NOW(),
    NOW()
FROM public.user_preferences_v1_backup v1
WHERE v1.home_location IS NOT NULL
  AND v1.home_location != '{}'::jsonb
  AND NOT EXISTS (
      SELECT 1 FROM public.user_preferences v2
      WHERE v2.user_id = v1.user_id
        AND v2.category = 'location'
  );

-- notifications
INSERT INTO public.user_preferences (user_id, category, data, created_at, updated_at)
SELECT
    v1.user_id,
    'notifications',
    v1.notification_settings,
    NOW(),
    NOW()
FROM public.user_preferences_v1_backup v1
WHERE v1.notification_settings IS NOT NULL
  AND v1.notification_settings != '{}'::jsonb
  AND NOT EXISTS (
      SELECT 1 FROM public.user_preferences v2
      WHERE v2.user_id = v1.user_id
        AND v2.category = 'notifications'
  );

-- player
INSERT INTO public.user_preferences (user_id, category, data, created_at, updated_at)
SELECT
    v1.user_id,
    'player',
    v1.player_details,
    NOW(),
    NOW()
FROM public.user_preferences_v1_backup v1
WHERE v1.player_details IS NOT NULL
  AND v1.player_details != '{}'::jsonb
  AND NOT EXISTS (
      SELECT 1 FROM public.user_preferences v2
      WHERE v2.user_id = v1.user_id
        AND v2.category = 'player'
  );

-- school
INSERT INTO public.user_preferences (user_id, category, data, created_at, updated_at)
SELECT
    v1.user_id,
    'school',
    v1.school_preferences,
    NOW(),
    NOW()
FROM public.user_preferences_v1_backup v1
WHERE v1.school_preferences IS NOT NULL
  AND v1.school_preferences != '{}'::jsonb
  AND NOT EXISTS (
      SELECT 1 FROM public.user_preferences v2
      WHERE v2.user_id = v1.user_id
        AND v2.category = 'school'
  );

-- dashboard
INSERT INTO public.user_preferences (user_id, category, data, created_at, updated_at)
SELECT
    v1.user_id,
    'dashboard',
    v1.dashboard_layout,
    NOW(),
    NOW()
FROM public.user_preferences_v1_backup v1
WHERE v1.dashboard_layout IS NOT NULL
  AND v1.dashboard_layout != '{}'::jsonb
  AND NOT EXISTS (
      SELECT 1 FROM public.user_preferences v2
      WHERE v2.user_id = v1.user_id
        AND v2.category = 'dashboard'
  );
