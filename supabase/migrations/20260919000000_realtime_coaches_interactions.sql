-- Enable Supabase Realtime on coaches and interactions tables.
-- Allows coach detail page to receive live updates via postgres_changes
-- when a family member logs an interaction or edits coach data from
-- another device/session.
--
-- Applied live to prod DB (xpxzhqghxecsjhvklsqg) on 2026-09-04.

ALTER PUBLICATION supabase_realtime ADD TABLE public.coaches, public.interactions;
