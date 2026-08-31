-- Reference table for NCAA sport sponsorship per school.
-- Populated separately (data sourcing is a follow-up effort); the ranker
-- falls back to unfiltered recommendations when this table is empty.
CREATE TABLE IF NOT EXISTS public.college_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_catalog_key text NOT NULL,
  sport text NOT NULL,
  division text NOT NULL,
  conference text,
  gender text NOT NULL CHECK (gender IN ('men', 'women', 'coed')),
  scorecard_id integer,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (school_catalog_key, sport, gender)
);

CREATE INDEX IF NOT EXISTS idx_college_programs_sport_gender
  ON public.college_programs (sport, gender);
CREATE INDEX IF NOT EXISTS idx_college_programs_school
  ON public.college_programs (school_catalog_key);

-- RLS: read-only reference data, open to any authenticated user.
ALTER TABLE public.college_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read programs" ON public.college_programs
  FOR SELECT USING (true);
