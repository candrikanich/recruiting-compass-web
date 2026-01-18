-- Migration: Enhance Existing Tables for Timeline Feature
-- Purpose: Add phase tracking, status scoring, and fit score fields to support recruiting timeline
-- Version: 1.0

-- Enhance users table with timeline phase tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_phase VARCHAR(20) DEFAULT 'freshman'
  CHECK (current_phase IN ('freshman', 'sophomore', 'junior', 'senior', 'committed'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS phase_milestone_data JSONB DEFAULT '{}';

ALTER TABLE users ADD COLUMN IF NOT EXISTS status_score INTEGER CHECK (status_score BETWEEN 0 AND 100);

ALTER TABLE users ADD COLUMN IF NOT EXISTS status_label VARCHAR(20)
  CHECK (status_label IN ('on_track', 'slightly_behind', 'at_risk'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_mode_active BOOLEAN DEFAULT false;

ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_plan_shown_at TIMESTAMPTZ;

-- Create index for phase queries
CREATE INDEX IF NOT EXISTS idx_users_current_phase ON users(current_phase);
CREATE INDEX IF NOT EXISTS idx_users_status_label ON users(status_label);
CREATE INDEX IF NOT EXISTS idx_users_recovery_mode ON users(recovery_mode_active) WHERE recovery_mode_active = true;

-- Enhance documents table with video health tracking
-- (Note: Used for storing highlight videos and other media)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMPTZ;

ALTER TABLE documents ADD COLUMN IF NOT EXISTS health_status VARCHAR(20) DEFAULT 'unknown'
  CHECK (health_status IN ('healthy', 'broken', 'unknown'));

-- Create index for video health queries
CREATE INDEX IF NOT EXISTS idx_documents_health_status ON documents(health_status) WHERE health_status IN ('broken', 'unknown');

-- Enhance schools table with fit score calculation fields
ALTER TABLE schools ADD COLUMN IF NOT EXISTS fit_score INTEGER CHECK (fit_score BETWEEN 0 AND 100);

ALTER TABLE schools ADD COLUMN IF NOT EXISTS fit_tier VARCHAR(20)
  CHECK (fit_tier IN ('reach', 'match', 'safety', 'unlikely'));

ALTER TABLE schools ADD COLUMN IF NOT EXISTS fit_score_data JSONB;

-- Create indexes for fit score queries
CREATE INDEX IF NOT EXISTS idx_schools_fit_score ON schools(fit_score DESC);
CREATE INDEX IF NOT EXISTS idx_schools_fit_tier ON schools(fit_tier);

-- Add comments for documentation
COMMENT ON COLUMN users.current_phase IS 'Current recruiting phase: freshman through committed';
COMMENT ON COLUMN users.phase_milestone_data IS 'JSONB tracking which phase milestones have been completed';
COMMENT ON COLUMN users.status_score IS 'Composite status score 0-100: 75+ on_track, 50-74 slightly_behind, 0-49 at_risk';
COMMENT ON COLUMN users.status_label IS 'Derived status label from score';
COMMENT ON COLUMN users.recovery_mode_active IS 'Flag indicating athlete is in recovery/catch-up mode';
COMMENT ON COLUMN documents.health_status IS 'Video link health: healthy (200 status), broken (non-200 status), unknown (not checked)';
COMMENT ON COLUMN schools.fit_score IS 'Composite fit score 0-100 based on athletic, academic, opportunity, and personal dimensions';
COMMENT ON COLUMN schools.fit_tier IS 'Tier classification: 70-100 match/safety, 50-69 reach, 0-49 unlikely';
COMMENT ON COLUMN schools.fit_score_data IS 'JSONB breakdown: {athletic: 0-40, academic: 0-25, opportunity: 0-20, personal: 0-15}';
