-- Migration: Map old school status values to new ones
-- Purpose: Migrate existing schools to new 9-value status enum
-- Date: 2026-01-25

-- Map old status values to new ones:
-- 'researching' → 'interested' (initial exploration phase)
-- 'contacted' → 'contacted' (no change, already in new enum)
-- 'interested' → 'interested' (no change, already in new enum)
-- 'offer_received' → 'offer_received' (no change, already in new enum)
-- 'declined' → 'not_pursuing' (no longer pursuing)
-- 'committed' → 'committed' (no change, already in new enum)

UPDATE schools
SET status = 'interested'
WHERE status = 'researching';

UPDATE schools
SET status = 'not_pursuing'
WHERE status = 'declined';

-- Update status_changed_at for any schools that didn't have it set during migration 009
UPDATE schools
SET status_changed_at = COALESCE(status_changed_at, updated_at, created_at, NOW())
WHERE status_changed_at IS NULL;

-- Log the migration
COMMENT ON TABLE schools IS 'Schools table - status values migrated to new 9-value enum on 2026-01-25';
