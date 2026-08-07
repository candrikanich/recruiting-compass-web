-- Coach Outreach — Phase 2: metric text value + provenance on performance_metrics.
--
-- Honors product rule #2 (metric values must hold non-numeric forms like 1:52.4,
-- 6'2", 92.1 mph) and rule #3 (render source + date) WITHOUT breaking the existing
-- numeric `value` column or its rows. See docs/coach-outreach/migration-build-plan.md
-- (Phase 2) and schema-reconciliation.md §4.
--
--   display_value — text render surface ("1:52.4", "6'2\"", "92.1 mph"). Numeric-only
--                   metrics leave it NULL; the resolver falls back to value+unit.
--   source        — provenance ("HitTrax", "Perfect Game") for the rendered "(source, date)".
--   is_primary    — the carrying tool: the single best number that leads the subject
--                   line. At most one per athlete (partial unique index below).
--   value         — kept numeric, now nullable so a text-only metric can omit it while
--                   still feeding division-fit math where it parses.
--
-- Additive + nullable + idempotent. No RLS change (performance_metrics already carries
-- family_unit_id + the family-model policies from the RLS consolidation plan).

ALTER TABLE public.performance_metrics
  ADD COLUMN IF NOT EXISTS display_value text,
  ADD COLUMN IF NOT EXISTS source        text,
  ADD COLUMN IF NOT EXISTS is_primary    boolean NOT NULL DEFAULT false;

-- value was NOT NULL; text-only metrics have no numeric reading.
ALTER TABLE public.performance_metrics ALTER COLUMN value DROP NOT NULL;

-- Backfill a render string for existing numeric rows (idempotent — only fills NULLs).
UPDATE public.performance_metrics
SET display_value = NULLIF(TRIM(CONCAT(value::text, ' ', unit)), '')
WHERE display_value IS NULL AND value IS NOT NULL;

-- At most one carrying tool per athlete.
CREATE UNIQUE INDEX IF NOT EXISTS performance_metrics_one_primary_per_user
  ON public.performance_metrics (user_id) WHERE is_primary;
