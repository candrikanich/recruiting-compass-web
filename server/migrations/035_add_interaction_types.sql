-- Add missing interaction types to the interaction_type enum
-- This enables tracking of game attendance, visits, and other interaction types

-- Check and add 'game' type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'interaction_type' AND e.enumlabel = 'game'
  ) THEN
    ALTER TYPE interaction_type ADD VALUE 'game';
  END IF;
END $$;

-- Check and add 'unofficial_visit' type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'interaction_type' AND e.enumlabel = 'unofficial_visit'
  ) THEN
    ALTER TYPE interaction_type ADD VALUE 'unofficial_visit';
  END IF;
END $$;

-- Check and add 'official_visit' type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'interaction_type' AND e.enumlabel = 'official_visit'
  ) THEN
    ALTER TYPE interaction_type ADD VALUE 'official_visit';
  END IF;
END $$;

-- Check and add 'other' type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'interaction_type' AND e.enumlabel = 'other'
  ) THEN
    ALTER TYPE interaction_type ADD VALUE 'other';
  END IF;
END $$;
