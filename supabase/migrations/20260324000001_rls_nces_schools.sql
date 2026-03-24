-- Enable RLS on nces_schools.
-- This is read-only reference data — anyone (including anon) can SELECT rows
-- to power the high-school search autocomplete.
-- All writes are done via service role (migrations / seeding); no user-facing
-- INSERT/UPDATE/DELETE policies are needed.

ALTER TABLE nces_schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nces_schools_public_select" ON nces_schools
  FOR SELECT USING (true);
