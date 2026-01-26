-- Migration: Add deadline_date column to task table
-- Purpose: Enable deadline tracking for recruiting timeline tasks
-- Version: 1.0

-- Add deadline_date column to task table
ALTER TABLE task ADD COLUMN deadline_date TIMESTAMPTZ NULL;

-- Add index for efficient deadline queries
CREATE INDEX idx_task_deadline_date ON task(deadline_date);

-- Seed suggested deadlines for critical NCAA tasks (junior year, grade 11)
-- NCAA Eligibility Center registration: August 1st of junior year
UPDATE task
SET deadline_date = make_timestamptz(
  EXTRACT(YEAR FROM make_date(EXTRACT(YEAR FROM NOW())::int, 9, 1))::int,
  8, 1, 0, 0, 0, 'America/New_York'
)
WHERE title ILIKE '%NCAA%' AND title ILIKE '%regist%' AND grade_level = 11;

-- NLI signing date: February 1st of senior year (typical early signing period)
UPDATE task
SET deadline_date = make_timestamptz(
  EXTRACT(YEAR FROM NOW())::int + (12 - 10),
  2, 1, 0, 0, 0, 'America/New_York'
)
WHERE title ILIKE '%NLI%' AND grade_level = 12;

-- Official visit deadlines: January 31st of senior year (typically last official visit)
UPDATE task
SET deadline_date = make_timestamptz(
  EXTRACT(YEAR FROM NOW())::int + (12 - 10),
  1, 31, 0, 0, 0, 'America/New_York'
)
WHERE title ILIKE '%official visit%' AND grade_level = 12;

-- SAT/ACT test deadlines: December 31st of junior year (last attempt for senior deadlines)
UPDATE task
SET deadline_date = make_timestamptz(
  EXTRACT(YEAR FROM NOW())::int + (11 - 10),
  12, 31, 0, 0, 0, 'America/New_York'
)
WHERE (title ILIKE '%SAT%' OR title ILIKE '%ACT%') AND grade_level = 11;

-- Highlight video for junior year: January 31st (ready before recruiting camps)
UPDATE task
SET deadline_date = make_timestamptz(
  EXTRACT(YEAR FROM NOW())::int + (11 - 10),
  1, 31, 0, 0, 0, 'America/New_York'
)
WHERE title ILIKE '%highlight%' AND grade_level = 11;

-- Verify migration completed
SELECT COUNT(*) as total_tasks,
       COUNT(CASE WHEN deadline_date IS NOT NULL THEN 1 END) as tasks_with_deadlines
FROM task;
