-- Migration: Add Onboarding Fields to Users Table
-- Purpose: Support user type selection (player/parent), preview mode, and onboarding progress tracking
-- Date: 2026-02-03
-- Dependencies: None (users table already exists)

-- ============================================================================
-- 1. ADD user_type COLUMN
-- ============================================================================
-- Tracks whether user is a player or parent for role-based UI/permissions

ALTER TABLE users
ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'player'
  CHECK (user_type IN ('player', 'parent'));

-- Create index for efficient filtering by user type
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);

COMMENT ON COLUMN users.user_type IS 'User role: "player" (athlete) or "parent" (guardian)';

-- ============================================================================
-- 2. ADD is_preview_mode COLUMN
-- ============================================================================
-- Flag for parents to access demo profile without real family link
-- When true: parent sees demo data; when false: parent sees real player data

ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_preview_mode BOOLEAN NOT NULL DEFAULT false;

-- Create index for filtering preview mode users
CREATE INDEX IF NOT EXISTS idx_users_is_preview_mode ON users(is_preview_mode) WHERE is_preview_mode = true;

COMMENT ON COLUMN users.is_preview_mode IS 'True if parent is viewing demo profile; false for real player profiles';

-- ============================================================================
-- 3. ADD onboarding_completed COLUMN
-- ============================================================================
-- Tracks whether player has completed all onboarding screens
-- Used for middleware to redirect incomplete players to onboarding flow

ALTER TABLE users
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- Create index for efficient onboarding progress queries
CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed ON users(onboarding_completed)
  WHERE onboarding_completed = false;

COMMENT ON COLUMN users.onboarding_completed IS 'True when player has completed all 5 onboarding screens; false until all screens completed';

-- ============================================================================
-- 4. ADD CONSTRAINT: Players must complete onboarding before certain actions
-- ============================================================================
-- This is enforced at application level, but documented here for reference
-- Logic: Redirect to onboarding if user_type='player' AND onboarding_completed=false

COMMENT ON CONSTRAINT users_user_type_check IS 'Ensures user_type is valid enum value (player or parent)';
