-- Migration: Expand school_status enum
-- Purpose: Add all 9 recruiting status values from Story 3.4
-- Date: 2026-01-25

-- Note: school_status is a PostgreSQL ENUM type
-- Add new ENUM values (idempotent - skips if already exists)
ALTER TYPE school_status ADD VALUE IF NOT EXISTS 'interested';
ALTER TYPE school_status ADD VALUE IF NOT EXISTS 'contacted';
ALTER TYPE school_status ADD VALUE IF NOT EXISTS 'camp_invite';
ALTER TYPE school_status ADD VALUE IF NOT EXISTS 'recruited';
ALTER TYPE school_status ADD VALUE IF NOT EXISTS 'official_visit_invited';
ALTER TYPE school_status ADD VALUE IF NOT EXISTS 'official_visit_scheduled';
ALTER TYPE school_status ADD VALUE IF NOT EXISTS 'offer_received';
ALTER TYPE school_status ADD VALUE IF NOT EXISTS 'committed';
ALTER TYPE school_status ADD VALUE IF NOT EXISTS 'not_pursuing';
