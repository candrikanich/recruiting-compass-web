-- Adds NUX (New User Experience) progress tracking to users table.
-- Stores checklist completion, first-visit timestamps, and prompt dismissals.
-- All code handles NULL/empty gracefully — no backfill needed.

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS nux_progress jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.users.nux_progress IS
  'New User Experience progress: checklist items, first-visit tracking, prompt dismissals. Schema version in .version field.';
