-- Remove responsiveness_score column from coaches table
-- This metric was removed from the MVP as it was derived from incomplete
-- interaction data and produced misleading scores. The column was initialized
-- to 0 on new coaches and never updated server-side.
ALTER TABLE coaches DROP COLUMN IF EXISTS responsiveness_score;
