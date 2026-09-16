-- Missing DELETE policy on family_units let orphan-cleanup failures pass
-- silently (try? masked the RLS denial) in the family-create race-recovery
-- path. Applied live via MCP 2026-09-15; iOS PR #145 shipped the Swift side.
-- Policy name matches the one already live on QA/E2E exactly (reconstructed
-- from pg_policy) so this reconciles as a no-op rather than adding a
-- second, differently-named duplicate.
DROP POLICY IF EXISTS family_units_delete ON family_units;

CREATE POLICY family_units_delete
ON family_units
FOR DELETE
USING (created_by_user_id = auth.uid());
