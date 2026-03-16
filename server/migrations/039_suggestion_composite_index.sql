-- Add composite index to suggestion table for dashboard/school-detail queries
-- Covers: (athlete_id, pending_surface, dismissed, completed) filter + (urgency DESC, surfaced_at DESC) order

CREATE INDEX IF NOT EXISTS idx_suggestion_athlete_filter
  ON suggestion(athlete_id, pending_surface, dismissed, completed, urgency DESC, surfaced_at DESC);
