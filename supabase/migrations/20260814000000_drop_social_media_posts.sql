-- Drop the social-media tracking feature.
--
-- The coach/program social-post monitoring feature was removed from the app
-- (X API pricing + Instagram Graph API gating made it non-viable). All code
-- references to `social_media_posts` and the `social_platform` enum are gone
-- as of this migration — see planning/remove-social-tracking.md.
--
-- CASCADE drops the table's RLS policies and any remaining dependent objects.
-- No other table has a foreign key TO social_media_posts (it referenced
-- schools/coaches/family_units, not the reverse), so nothing else is affected.

DROP TABLE IF EXISTS public.social_media_posts CASCADE;

-- The social_platform enum was used only by the dropped table.
DROP TYPE IF EXISTS public.social_platform;
