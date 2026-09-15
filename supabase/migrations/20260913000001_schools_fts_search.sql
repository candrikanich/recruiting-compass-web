-- 20260913000001_schools_fts_search.sql
-- Issue #606: Postgres full-text search for schools, replacing the
-- ILIKE + Fuse.js client-side fuzzy re-rank in useSearchConsolidated.ts.
--
-- Two signals, combined:
--   1. tsvector/ts_rank over name/location/city/state/conference —
--      relevance ranking, handles stemming ("Wildcats" ~ "Wildcat") but
--      NOT typos. `schools.location` is the street-address column — there
--      is no `address` column on this table.
--   2. pg_trgm similarity() on name — typo tolerance ("Michgan" ~ "Michigan").
--      pg_trgm is already installed in the `extensions` schema (see
--      claude/database.md 2026-08-01 entry), reused here, no new extension.
--      location typo tolerance is NOT covered here (name-only trgm index) —
--      location matches still require FTS token overlap.

ALTER TABLE public.schools
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(location, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(city, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(state, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(conference, '')), 'C')
  ) STORED;

CREATE INDEX idx_schools_search_vector ON public.schools
  USING GIN (search_vector);

CREATE INDEX idx_schools_name_trgm ON public.schools
  USING GIN (name extensions.gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.search_schools_fts(
  p_search_term text,
  p_division text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_limit int DEFAULT 20
)
RETURNS SETOF public.schools
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
SET pg_trgm.word_similarity_threshold = 0.3
AS $$
  SELECT s.*
  FROM public.schools s
  WHERE
    (
      s.search_vector @@ websearch_to_tsquery('english', p_search_term)
      OR s.name %> p_search_term
    )
    AND (p_division IS NULL OR s.division::text = p_division)
    AND (p_state IS NULL OR s.state = p_state)
  ORDER BY
    ts_rank(s.search_vector, websearch_to_tsquery('english', p_search_term)) DESC,
    word_similarity(p_search_term, s.name) DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.search_schools_fts(text, text, text, int) TO authenticated;

COMMENT ON FUNCTION public.search_schools_fts IS
  'Issue #606: ranked schools search combining tsvector/ts_rank relevance with pg_trgm similarity for typo tolerance. SECURITY INVOKER — relies on the existing family-model RLS SELECT policy on schools for scoping.';
