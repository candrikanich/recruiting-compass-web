-- Drop the unused coaches.availability jsonb column.
--
-- The column backed a standalone "Coach Availability" page (weekly schedule,
-- timezone, blackout dates) reachable only from the coach detail header.
-- The feature had zero consumers: nothing read the value, isAvailableAt() was
-- never called, and the entry UI drove no other behavior. The page, composable
-- (useCoachAvailability), and types (CoachAvailability/DayAvailability) were
-- removed; this drops the orphaned storage.
--
-- Data loss is intentional and nil in practice (values were never surfaced).

ALTER TABLE public.coaches DROP COLUMN IF EXISTS availability;
