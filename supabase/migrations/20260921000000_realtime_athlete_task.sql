-- Enable Supabase Realtime on athlete_task table.
-- Allows tasks page to receive live updates via postgres_changes
-- when a family member completes/uncompletes a task from another device/session.
--
-- schools, coaches, and interactions already added in prior migrations.

ALTER PUBLICATION supabase_realtime ADD TABLE public.athlete_task;
