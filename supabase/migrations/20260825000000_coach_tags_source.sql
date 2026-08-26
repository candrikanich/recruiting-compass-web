-- 20260825000000_coach_tags_source.sql
ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS tags   text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source text   NULL;

COMMENT ON COLUMN coaches.tags   IS 'Free-form recruiting tags (e.g. sport, division, region, source).';
COMMENT ON COLUMN coaches.source IS 'Where this coach contact originated (e.g. LinkedIn, camp, referral).';
