-- Enable Supabase Realtime on schools table.
-- Allows school detail page to receive live updates via postgres_changes
-- when a family member edits school data from another device/session.
--
-- coaches and interactions already added in 20260919000000.

ALTER PUBLICATION supabase_realtime ADD TABLE public.schools;
