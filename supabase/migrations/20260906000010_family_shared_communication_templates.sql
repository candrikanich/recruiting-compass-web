-- Family-share communication templates.
--
-- communication_templates predates the family model and shipped user-scoped
-- (user_id owner only). Every other domain table (schools, interactions,
-- documents, coaches, performance, athlete_messages) carries family_unit_id and
-- a single permissive family policy per verb. This brings templates to the same
-- shape so a parent can proofread/tweak a template the player then sends.
--
-- Predefined/global templates (is_predefined = true, user_id NULL,
-- family_unit_id NULL) remain readable by everyone and unmodifiable by users.
--
-- Reuses the generic BEFORE INSERT OR UPDATE derive_family_unit_id() trigger
-- (Phase-1, 20260805000000) — it resolves family_unit_id from the row's user_id
-- when the owner belongs to exactly one family unit, and never raises.

-- 1. Column + index (matches athlete_messages: FK to family_units, cascade).
ALTER TABLE public.communication_templates
  ADD COLUMN IF NOT EXISTS family_unit_id uuid
  REFERENCES public.family_units(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_communication_templates_family_unit_id
  ON public.communication_templates (family_unit_id);

-- 2. Derive family_unit_id on write (reuses the generic Phase-1 trigger; the app
--    also stamps it explicitly on create). Predefined rows have NULL user_id, so
--    the trigger leaves their family_unit_id NULL — intended (global scope).
DROP TRIGGER IF EXISTS trg_communication_templates_derive_family_unit_id
  ON public.communication_templates;
CREATE TRIGGER trg_communication_templates_derive_family_unit_id
  BEFORE INSERT OR UPDATE ON public.communication_templates
  FOR EACH ROW EXECUTE FUNCTION public.derive_family_unit_id();

-- 3. Backfill existing user-owned rows (unambiguous single-family owners only;
--    predefined rows and any ambiguous/orphan owners stay NULL). Verified live
--    2026-08-24: 2 user templates, 0 orphans, 0 ambiguous.
UPDATE public.communication_templates t
SET family_unit_id = fm.family_unit_id
FROM (
  -- HAVING guarantees a single distinct value; min(text)::uuid picks it
  -- (uuid has no native max/min aggregate).
  SELECT user_id, min(family_unit_id::text)::uuid AS family_unit_id
  FROM public.family_members
  GROUP BY user_id
  HAVING count(DISTINCT family_unit_id) = 1
) fm
WHERE t.user_id = fm.user_id
  AND t.family_unit_id IS NULL
  AND (t.is_predefined IS NOT TRUE);

-- 4. Cut RLS over to family scope (single permissive policy per verb).
--    Drop the legacy owner-only manage policy and the standalone predefined-view
--    policy; the new SELECT policy folds predefined visibility into its OR.
DROP POLICY IF EXISTS "Users can manage own templates" ON public.communication_templates;
DROP POLICY IF EXISTS "Users can view predefined templates" ON public.communication_templates;

-- SELECT: any member of the row's family, plus all predefined/global templates.
CREATE POLICY communication_templates_select_family
  ON public.communication_templates FOR SELECT TO authenticated
  USING (
    is_predefined = true
    OR family_unit_id IN (
      SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

-- INSERT: only into a family the writer belongs to. is_predefined stays false for
-- user writes (built-ins are seeded server-side, never via this policy).
CREATE POLICY communication_templates_insert_family
  ON public.communication_templates FOR INSERT TO authenticated
  WITH CHECK (
    is_predefined IS NOT TRUE
    AND family_unit_id IN (
      SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

-- UPDATE: any family member may edit a family template; cannot retarget it to
-- another family or flip it into a predefined built-in.
CREATE POLICY communication_templates_update_family
  ON public.communication_templates FOR UPDATE TO authenticated
  USING (
    is_predefined IS NOT TRUE
    AND family_unit_id IN (
      SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    is_predefined IS NOT TRUE
    AND family_unit_id IN (
      SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

-- DELETE: any family member may delete a family template.
CREATE POLICY communication_templates_delete_family
  ON public.communication_templates FOR DELETE TO authenticated
  USING (
    is_predefined IS NOT TRUE
    AND family_unit_id IN (
      SELECT family_unit_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );
