-- Create system_calendar table for tracking recruiting calendar events
CREATE TABLE IF NOT EXISTS system_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  season_year INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('dead_period', 'quiet_period', 'contact_period', 'evaluation_period', 'sat_date', 'act_date', 'signing_day', 'nli_period')),
  sport TEXT,
  division TEXT CHECK (division IN ('d1', 'd2', 'd3') OR division IS NULL),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint to prevent duplicate entries
ALTER TABLE system_calendar
ADD CONSTRAINT system_calendar_unique_label_start_season
UNIQUE (label, start_date, season_year);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_system_calendar_season_year ON system_calendar(season_year);
CREATE INDEX IF NOT EXISTS idx_system_calendar_category ON system_calendar(category);
CREATE INDEX IF NOT EXISTS idx_system_calendar_start_date ON system_calendar(start_date);

-- Enable RLS
ALTER TABLE system_calendar ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "system_calendar_read" ON system_calendar
FOR SELECT USING (auth.role() = 'authenticated');