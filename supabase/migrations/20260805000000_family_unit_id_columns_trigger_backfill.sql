-- RLS family-model consolidation, Phase 1: additive foundation only.
--
-- Adds family_unit_id to the two tables that don't yet have it, installs a
-- generic BEFORE INSERT/UPDATE derivation trigger on all 7 deferred tables
-- (coaches, documents, performance_metrics, interactions, schools,
-- social_media_posts, recommendation_letters), and backfills existing NULL
-- rows. This migration makes ZERO access-control change — no RLS policy is
-- added, dropped, or modified here. It exists purely to satisfy the
-- preconditions listed in claude/database.md:27-35 ("RLS: account_links-era
-- policies still load-bearing") so a later phase can safely add family-model
-- policies and drop the legacy account_links-era ones. Fully idempotent —
-- every statement is safe to re-run end to end against a database already at
-- this migration's target state.

-- 1. Columns + indexes on the two tables that don't yet carry family_unit_id.
--    (coaches, documents, performance_metrics, interactions, schools already
--    have it from earlier migrations.)

ALTER TABLE public.social_media_posts
  ADD COLUMN IF NOT EXISTS family_unit_id uuid REFERENCES public.family_units(id) ON DELETE CASCADE;

ALTER TABLE public.recommendation_letters
  ADD COLUMN IF NOT EXISTS family_unit_id uuid REFERENCES public.family_units(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_social_media_posts_family_unit_id
  ON public.social_media_posts(family_unit_id);

CREATE INDEX IF NOT EXISTS idx_recommendation_letters_family_unit_id
  ON public.recommendation_letters(family_unit_id);

-- 2. Generic derivation trigger function. One function serves all 7 tables
--    despite their differing column sets — it inspects NEW via to_jsonb and
--    only touches keys that exist on the firing table's row. Never raises:
--    service-role writers (E2E seeds, social sync jobs) must keep working
--    unchanged even if derivation yields NULL. Enforcement that family_unit_id
--    is actually set comes later, from RLS WITH CHECK at cutover — not from
--    this trigger.

CREATE OR REPLACE FUNCTION public.derive_family_unit_id() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  r jsonb;
  v_family_unit_id uuid;
BEGIN
  IF NEW.family_unit_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  r := to_jsonb(NEW);

  -- Derivation order, stopping at the first source that yields a non-NULL
  -- result: school_id -> coach_id -> document_id -> user_id (unambiguous
  -- owner fallback, pattern from
  -- supabase/migrations/20260727000004_phase10a_preflight_data_repair.sql:16-25).
  IF v_family_unit_id IS NULL AND r->>'school_id' IS NOT NULL THEN
    SELECT s.family_unit_id INTO v_family_unit_id
    FROM public.schools s
    WHERE s.id = (r->>'school_id')::uuid;
  END IF;

  IF v_family_unit_id IS NULL AND r->>'coach_id' IS NOT NULL THEN
    SELECT c.family_unit_id INTO v_family_unit_id
    FROM public.coaches c
    WHERE c.id = (r->>'coach_id')::uuid;
  END IF;

  IF v_family_unit_id IS NULL AND r->>'document_id' IS NOT NULL THEN
    SELECT d.family_unit_id INTO v_family_unit_id
    FROM public.documents d
    WHERE d.id = (r->>'document_id')::uuid;
  END IF;

  IF v_family_unit_id IS NULL AND r->>'user_id' IS NOT NULL THEN
    SELECT min(fm.family_unit_id::text)::uuid INTO v_family_unit_id
    FROM public.family_members fm
    WHERE fm.user_id = (r->>'user_id')::uuid
    HAVING count(DISTINCT fm.family_unit_id) = 1;
  END IF;

  -- v_family_unit_id may still be NULL here (no matching source column, no
  -- resolvable parent, or an ambiguous multi-family owner) — that's fine,
  -- assign whatever was derived (including NULL) and let the row through.
  NEW.family_unit_id := v_family_unit_id;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.derive_family_unit_id() OWNER TO postgres;

-- PUBLIC grants EXECUTE by default at CREATE time and anon/authenticated
-- inherit through PUBLIC membership regardless of a direct-role REVOKE (same
-- gotcha documented in claude/database.md's security-advisor-hardening
-- section) — revoke from PUBLIC explicitly, not just the named roles. This
-- function is only ever invoked as a trigger, which runs with the table
-- owner's privileges independent of EXECUTE grants, so no client-facing role
-- needs a grant restored.
REVOKE ALL ON FUNCTION public.derive_family_unit_id() FROM PUBLIC, anon;

-- 3. Install the trigger on all 7 deferred tables.

DROP TRIGGER IF EXISTS trg_coaches_derive_family_unit_id ON public.coaches;
CREATE TRIGGER trg_coaches_derive_family_unit_id
  BEFORE INSERT OR UPDATE ON public.coaches
  FOR EACH ROW EXECUTE FUNCTION public.derive_family_unit_id();

DROP TRIGGER IF EXISTS trg_documents_derive_family_unit_id ON public.documents;
CREATE TRIGGER trg_documents_derive_family_unit_id
  BEFORE INSERT OR UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.derive_family_unit_id();

DROP TRIGGER IF EXISTS trg_performance_metrics_derive_family_unit_id ON public.performance_metrics;
CREATE TRIGGER trg_performance_metrics_derive_family_unit_id
  BEFORE INSERT OR UPDATE ON public.performance_metrics
  FOR EACH ROW EXECUTE FUNCTION public.derive_family_unit_id();

DROP TRIGGER IF EXISTS trg_interactions_derive_family_unit_id ON public.interactions;
CREATE TRIGGER trg_interactions_derive_family_unit_id
  BEFORE INSERT OR UPDATE ON public.interactions
  FOR EACH ROW EXECUTE FUNCTION public.derive_family_unit_id();

DROP TRIGGER IF EXISTS trg_schools_derive_family_unit_id ON public.schools;
CREATE TRIGGER trg_schools_derive_family_unit_id
  BEFORE INSERT OR UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.derive_family_unit_id();

DROP TRIGGER IF EXISTS trg_social_media_posts_derive_family_unit_id ON public.social_media_posts;
CREATE TRIGGER trg_social_media_posts_derive_family_unit_id
  BEFORE INSERT OR UPDATE ON public.social_media_posts
  FOR EACH ROW EXECUTE FUNCTION public.derive_family_unit_id();

DROP TRIGGER IF EXISTS trg_recommendation_letters_derive_family_unit_id ON public.recommendation_letters;
CREATE TRIGGER trg_recommendation_letters_derive_family_unit_id
  BEFORE INSERT OR UPDATE ON public.recommendation_letters
  FOR EACH ROW EXECUTE FUNCTION public.derive_family_unit_id();

-- 4. Idempotent backfill of existing NULL rows, guarded WHERE family_unit_id
--    IS NULL throughout so re-running this migration is a no-op once caught up.

-- 4a. School-chain first: coaches, documents (via school_id — it's nullable
--     on documents), interactions, social_media_posts all hang off school_id.
UPDATE public.coaches c
SET family_unit_id = s.family_unit_id
FROM public.schools s
WHERE c.family_unit_id IS NULL
  AND c.school_id = s.id
  AND s.family_unit_id IS NOT NULL;

UPDATE public.documents d
SET family_unit_id = s.family_unit_id
FROM public.schools s
WHERE d.family_unit_id IS NULL
  AND d.school_id IS NOT NULL
  AND d.school_id = s.id
  AND s.family_unit_id IS NOT NULL;

UPDATE public.interactions i
SET family_unit_id = s.family_unit_id
FROM public.schools s
WHERE i.family_unit_id IS NULL
  AND i.school_id = s.id
  AND s.family_unit_id IS NOT NULL;

UPDATE public.social_media_posts smp
SET family_unit_id = s.family_unit_id
FROM public.schools s
WHERE smp.family_unit_id IS NULL
  AND smp.school_id = s.id
  AND s.family_unit_id IS NOT NULL;

-- 4b. recommendation_letters via document_id -> documents.family_unit_id
--     (document_id is nullable — only rows where it resolves get backfilled
--     here; the rest fall to the user-fallback pass below).
UPDATE public.recommendation_letters rl
SET family_unit_id = d.family_unit_id
FROM public.documents d
WHERE rl.family_unit_id IS NULL
  AND rl.document_id IS NOT NULL
  AND rl.document_id = d.id
  AND d.family_unit_id IS NOT NULL;

-- 4c. Unambiguous-user fallback for every remaining NULL row on a table that
--     has a user_id column. social_media_posts and interactions have none
--     (interactions has logged_by instead) — both have school_id NOT NULL,
--     so 4a already gives them full coverage. Pattern copied from
--     20260727000004_phase10a_preflight_data_repair.sql:16-25.
UPDATE public.coaches c
SET family_unit_id = owner.family_unit_id
FROM (
  SELECT user_id, min(family_unit_id::text)::uuid AS family_unit_id
  FROM public.family_members
  GROUP BY user_id
  HAVING count(DISTINCT family_unit_id) = 1
) owner
WHERE c.family_unit_id IS NULL
  AND c.user_id = owner.user_id;

UPDATE public.documents d
SET family_unit_id = owner.family_unit_id
FROM (
  SELECT user_id, min(family_unit_id::text)::uuid AS family_unit_id
  FROM public.family_members
  GROUP BY user_id
  HAVING count(DISTINCT family_unit_id) = 1
) owner
WHERE d.family_unit_id IS NULL
  AND d.user_id = owner.user_id;

UPDATE public.performance_metrics pm
SET family_unit_id = owner.family_unit_id
FROM (
  SELECT user_id, min(family_unit_id::text)::uuid AS family_unit_id
  FROM public.family_members
  GROUP BY user_id
  HAVING count(DISTINCT family_unit_id) = 1
) owner
WHERE pm.family_unit_id IS NULL
  AND pm.user_id = owner.user_id;

-- interactions is deliberately excluded here: it has no user_id column (only
-- logged_by), which the trigger's derivation logic never inspects, and
-- school_id is NOT NULL there, so 4a already gives it full coverage.

UPDATE public.schools sc
SET family_unit_id = owner.family_unit_id
FROM (
  SELECT user_id, min(family_unit_id::text)::uuid AS family_unit_id
  FROM public.family_members
  GROUP BY user_id
  HAVING count(DISTINCT family_unit_id) = 1
) owner
WHERE sc.family_unit_id IS NULL
  AND sc.user_id = owner.user_id;

UPDATE public.recommendation_letters rl
SET family_unit_id = owner.family_unit_id
FROM (
  SELECT user_id, min(family_unit_id::text)::uuid AS family_unit_id
  FROM public.family_members
  GROUP BY user_id
  HAVING count(DISTINCT family_unit_id) = 1
) owner
WHERE rl.family_unit_id IS NULL
  AND rl.user_id = owner.user_id;
