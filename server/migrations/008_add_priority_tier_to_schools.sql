-- Migration: Add priority_tier column to schools table
-- Purpose: Enable Story 3.4 priority tier functionality (A, B, C)
-- Date: 2026-01-24

-- Add priority_tier column to schools table
ALTER TABLE schools
ADD COLUMN priority_tier VARCHAR(1) NULL;

-- Add constraint to ensure valid values
ALTER TABLE schools
ADD CONSTRAINT schools_priority_tier_check
CHECK (priority_tier IS NULL OR priority_tier IN ('A', 'B', 'C'));

-- Create index for filtering by priority tier (performance optimization)
CREATE INDEX idx_schools_priority_tier ON schools(user_id, priority_tier)
WHERE priority_tier IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN schools.priority_tier IS 'Priority tier for school (A=Top Choice, B=Strong Interest, C=Fallback). Independent of recruiting status.';
