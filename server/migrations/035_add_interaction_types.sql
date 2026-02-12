-- Add missing interaction types to the interaction_type enum
-- This enables tracking of game attendance, visits, and other interaction types

-- Add 'game' type for tracking game attendance
ALTER TYPE interaction_type ADD VALUE IF NOT EXISTS 'game';

-- Add 'unofficial_visit' type for unofficial campus visits
ALTER TYPE interaction_type ADD VALUE IF NOT EXISTS 'unofficial_visit';

-- Add 'official_visit' type for official campus visits
ALTER TYPE interaction_type ADD VALUE IF NOT EXISTS 'official_visit';

-- Add 'other' type for miscellaneous interactions
ALTER TYPE interaction_type ADD VALUE IF NOT EXISTS 'other';
