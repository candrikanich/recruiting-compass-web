-- Remove unused ranking column from schools table
-- The ranking feature was never fully implemented (no UI to set rankings)
ALTER TABLE schools DROP COLUMN IF EXISTS ranking;
