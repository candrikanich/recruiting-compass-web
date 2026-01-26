-- Add re-evaluation fields to suggestion table for User Story 7.2
-- These fields support dismissed suggestion re-evaluation when conditions change

ALTER TABLE suggestion
  ADD COLUMN condition_snapshot JSONB NULL,
  ADD COLUMN reappeared BOOLEAN NULL DEFAULT FALSE,
  ADD COLUMN previous_suggestion_id UUID NULL REFERENCES suggestion(id);

-- Index for efficient dismissed suggestion queries during re-evaluation
-- Supports finding dismissed suggestions that are old enough for re-evaluation
CREATE INDEX idx_dismissed_reevaluation
  ON suggestion(athlete_id, rule_type, dismissed, dismissed_at)
  WHERE dismissed = true;

-- Index for tracking re-appeared suggestions (for analytics or filtering)
CREATE INDEX idx_reappeared_suggestions
  ON suggestion(athlete_id, reappeared)
  WHERE reappeared = true;
