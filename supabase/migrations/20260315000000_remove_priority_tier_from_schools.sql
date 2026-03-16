-- Remove priority_tier from schools table
DROP INDEX IF EXISTS idx_schools_priority_tier;
ALTER TABLE schools DROP CONSTRAINT IF EXISTS schools_priority_tier_check;
ALTER TABLE schools DROP COLUMN IF EXISTS priority_tier;
