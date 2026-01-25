-- Migration: Add status change tracking
-- Purpose: Enable Story 3.4 status change timestamps and history
-- Date: 2026-01-25

-- Add status_changed_at column to schools table
ALTER TABLE schools
ADD COLUMN status_changed_at TIMESTAMP WITH TIME ZONE NULL;

-- Update existing rows to set status_changed_at to updated_at (fallback)
UPDATE schools
SET status_changed_at = COALESCE(updated_at, created_at, NOW())
WHERE status_changed_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN schools.status_changed_at IS 'Timestamp of when the current status was set';

-- Create school_status_history table for audit trail
CREATE TABLE school_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  previous_status VARCHAR(50) NULL,
  new_status VARCHAR(50) NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX idx_school_status_history_school_id ON school_status_history(school_id);
CREATE INDEX idx_school_status_history_changed_at ON school_status_history(changed_at DESC);
CREATE INDEX idx_school_status_history_new_status ON school_status_history(new_status);

-- Add table comment
COMMENT ON TABLE school_status_history IS 'Audit trail of school status changes for Story 3.4';
COMMENT ON COLUMN school_status_history.previous_status IS 'Previous status value (nullable for first entry)';
COMMENT ON COLUMN school_status_history.new_status IS 'New status value after change';
COMMENT ON COLUMN school_status_history.changed_by IS 'User ID who made the status change';
COMMENT ON COLUMN school_status_history.changed_at IS 'When the status change occurred';
COMMENT ON COLUMN school_status_history.notes IS 'Optional notes explaining the status change';
