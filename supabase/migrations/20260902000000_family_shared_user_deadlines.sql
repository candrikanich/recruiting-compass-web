-- Family-share user_deadlines.
--
-- user_deadlines predates the family model and shipped user-scoped
-- (user_id owner only). Every other domain table (schools, interactions,
-- documents, coaches, performance, athlete_messages, communication_templates)
-- carries family_unit_id and a single permissive family policy per verb.
-- This brings deadlines to the same shape so any family member can see and
-- manage the shared recruiting deadlines.
--
-- Reuses the generic BEFORE INSERT OR UPDATE derive_family_unit_id() trigger
-- (Phase-1, 20260805000000) — it resolves family_unit_id from the row's
-- user_id when the owner belongs to exactly one family unit, and never raises.
--
-- Orphan check (live, 2026-09-02): 0 user_deadlines rows with no matching
-- family_members row. No NULL family_unit_id rows expected post-backfill.

-- 1. Column + index (matches communication_templates: FK to family_units, cascade).
ALTER TABLE public.user_deadlines
  ADD COLUMN IF NOT EXISTS family_unit_id uuid
  REFERENCES public.family_units(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_deadlines_family_unit_id
  ON public.user_deadlines (family_unit_id);

-- 2. Derive family_unit_id on write (reuses the generic Phase-1 trigger).
DROP TRIGGER IF EXISTS trg_user_deadlines_derive_family_unit_id
  ON public.user_deadlines;
CREATE TRIGGER trg_user_deadlines_derive_family_unit_id
  BEFORE INSERT OR UPDATE ON public.user_deadlines
  FOR EACH ROW EXECUTE FUNCTION public.derive_family_unit_id();

-- 3. Backfill existing rows (unambiguous single-family owners only; any
--    ambiguous/orphan owners stay NULL). Verified live 2026-09-02: 0 orphans.
UPDATE public.user_deadlines ud
SET family_unit_id = fm.family_unit_id
FROM (
  -- HAVING guarantees a single distinct value; min(text)::uuid picks it
  -- (uuid has no native max/min aggregate).
  SELECT user_id, min(family_unit_id::text)::uuid AS family_unit_id
  FROM public.family_members
  GROUP BY user_id
  HAVING count(DISTINCT family_unit_id) = 1
) fm
WHERE ud.user_id = fm.user_id
  AND ud.family_unit_id IS NULL;

-- 4. Cut RLS over to family scope (single permissive policy per verb).
--    Drop the legacy per-verb owner-only policies plus the standalone
--    "manage own" ALL-command policy (live query 2026-09-02 confirmed this
--    fifth policy also exists on user_deadlines, redundant with the four
--    per-verb ones but must be dropped too or it stays additive under RLS).
DROP POLICY IF EXISTS user_deadlines_select ON public.user_deadlines;
DROP POLICY IF EXISTS user_deadlines_insert ON public.user_deadlines;
DROP POLICY IF EXISTS user_deadlines_update ON public.user_deadlines;
DROP POLICY IF EXISTS user_deadlines_delete ON public.user_deadlines;
DROP POLICY IF EXISTS "user_deadlines: users manage own" ON public.user_deadlines;

-- SELECT: any member of the row's family.
CREATE POLICY user_deadlines_select_family
  ON public.user_deadlines FOR SELECT TO authenticated
  USING (
    family_unit_id IN (
      SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

-- INSERT: only into a family the writer belongs to.
CREATE POLICY user_deadlines_insert_family
  ON public.user_deadlines FOR INSERT TO authenticated
  WITH CHECK (
    family_unit_id IN (
      SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

-- UPDATE: any family member may edit a family deadline; cannot retarget it
-- to another family.
CREATE POLICY user_deadlines_update_family
  ON public.user_deadlines FOR UPDATE TO authenticated
  USING (
    family_unit_id IN (
      SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    family_unit_id IN (
      SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

-- DELETE: any family member may delete a family deadline.
CREATE POLICY user_deadlines_delete_family
  ON public.user_deadlines FOR DELETE TO authenticated
  USING (
    family_unit_id IN (
      SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );
