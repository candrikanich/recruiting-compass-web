-- Missing DELETE policy on family_units let orphan-cleanup failures pass
-- silently (try? masked the RLS denial) in the family-create race-recovery
-- path. Applied live via MCP 2026-09-15; iOS PR #145 shipped the Swift side.
CREATE POLICY "Users can delete family units they created"
ON family_units
FOR DELETE
USING (created_by_user_id = auth.uid());
