-- Migration: Create Sports Table
-- Purpose: Master list of sports for player profiles (onboarding feature)
-- Date: 2026-02-03
-- Dependencies: None

-- ============================================================================
-- 1. CREATE sports TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS sports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  -- has_position_list: true if sport uses standard positions (e.g., soccer, baseball)
  --                   false if position is free-text (e.g., track and field, swimming)
  has_position_list BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_sports_display_order ON sports(display_order);
CREATE INDEX IF NOT EXISTS idx_sports_has_position_list ON sports(has_position_list);

-- Add comments for documentation
COMMENT ON TABLE sports IS 'Master list of sports available for player profiles';
COMMENT ON COLUMN sports.name IS 'Sport name (e.g., "Baseball", "Soccer")';
COMMENT ON COLUMN sports.has_position_list IS 'Whether sport uses standard position list (true) or free-text positions (false)';
COMMENT ON COLUMN sports.display_order IS 'Order for display in UI dropdowns (ascending)';

-- ============================================================================
-- 2. SEED SPORTS DATA
-- ============================================================================
-- Standard HS sports with appropriate position list settings
-- Sports with fixed positions: Baseball, Basketball, Football, Soccer, Hockey, Lacrosse, Volleyball, Tennis, Field Hockey, Water Polo
-- Sports with free-text positions: Track & Field, Swimming, Cross Country, Wrestling, Rowing, Golf, Softball

INSERT INTO sports (name, has_position_list, display_order) VALUES
  ('Baseball', true, 1),
  ('Basketball', true, 2),
  ('Cross Country', false, 3),
  ('Field Hockey', true, 4),
  ('Football', true, 5),
  ('Golf', false, 6),
  ('Hockey', true, 7),
  ('Lacrosse', true, 8),
  ('Rowing', false, 9),
  ('Soccer', true, 10),
  ('Softball', false, 11),
  ('Swimming', false, 12),
  ('Tennis', true, 13),
  ('Track & Field', false, 14),
  ('Volleyball', true, 15),
  ('Water Polo', true, 16),
  ('Wrestling', false, 17)
ON CONFLICT (name) DO NOTHING;

-- Enable RLS (no policies needed - public read, admin write)
ALTER TABLE sports ENABLE ROW LEVEL SECURITY;

-- Public read access to sports list
CREATE POLICY "Public can read sports" ON sports
  FOR SELECT
  USING (true);

-- Admin-only write access
CREATE POLICY "Only admins can manage sports" ON sports
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update sports" ON sports
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );
