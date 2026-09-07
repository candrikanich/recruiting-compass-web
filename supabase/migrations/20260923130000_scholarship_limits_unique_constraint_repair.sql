-- Repair: prod's scholarship_limits table (20260923120000) exists without the
-- unique(sport, division) constraint that migration defines — the `create
-- table if not exists` no-op'd against an earlier partial-apply state of the
-- table, so the constraint was silently never added. This blocked
-- 20260924000000_seed_scholarship_limits.sql's ON CONFLICT (sport, division)
-- with SQLSTATE 42P10 (no unique/exclusion constraint matching).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.scholarship_limits'::regclass
      AND contype = 'u'
  ) THEN
    ALTER TABLE public.scholarship_limits
      ADD CONSTRAINT scholarship_limits_sport_division_key UNIQUE (sport, division);
  END IF;
END $$;
