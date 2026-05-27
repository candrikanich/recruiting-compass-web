-- Add deadline_offset_months to task templates.
--
-- Tasks had no deadline source: the `task` table lacked any deadline column and
-- the API never computed one, so <DeadlineBadge> never rendered. We compute a
-- per-athlete deadline server-side from the athlete's graduation_year minus this
-- offset (months before graduation the task is due). See
-- docs/superpowers/specs/2026-05-25-task-deadlines-from-graduation-year-design.md
--
-- v1 backfill: one mid-band value per grade. Earlier grades have larger offsets
-- (further from graduation). The column documents room for per-task refinement.

ALTER TABLE task
  ADD COLUMN IF NOT EXISTS deadline_offset_months INTEGER NULL;

UPDATE task SET deadline_offset_months = 6  WHERE grade_level = 12 AND deadline_offset_months IS NULL;
UPDATE task SET deadline_offset_months = 18 WHERE grade_level = 11 AND deadline_offset_months IS NULL;
UPDATE task SET deadline_offset_months = 30 WHERE grade_level = 10 AND deadline_offset_months IS NULL;
UPDATE task SET deadline_offset_months = 42 WHERE grade_level = 9  AND deadline_offset_months IS NULL;
