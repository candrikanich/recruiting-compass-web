-- Migration: Create Positions Table
-- Purpose: Standard positions for each sport (for sports with fixed position lists)
-- Date: 2026-02-03
-- Dependencies: 028_create_sports_table.sql

-- ============================================================================
-- 1. CREATE positions TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure position names are unique per sport (no duplicate positions in same sport)
  UNIQUE(sport_id, name)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_positions_sport_id ON positions(sport_id);
CREATE INDEX IF NOT EXISTS idx_positions_display_order ON positions(sport_id, display_order);

-- Add comments for documentation
COMMENT ON TABLE positions IS 'Standard positions for sports with fixed position lists';
COMMENT ON COLUMN positions.sport_id IS 'Foreign key to sports table';
COMMENT ON COLUMN positions.name IS 'Position name (e.g., "Pitcher", "Goalkeeper")';
COMMENT ON COLUMN positions.display_order IS 'Order for display in UI dropdowns (ascending)';

-- ============================================================================
-- 2. SEED POSITION DATA
-- ============================================================================

-- Baseball positions
INSERT INTO positions (sport_id, name, display_order)
SELECT (SELECT id FROM sports WHERE name = 'Baseball'), position, row_num
FROM (
  SELECT 'Pitcher' as position, 1 as row_num UNION ALL
  SELECT 'Catcher', 2 UNION ALL
  SELECT 'First Base', 3 UNION ALL
  SELECT 'Second Base', 4 UNION ALL
  SELECT 'Third Base', 5 UNION ALL
  SELECT 'Shortstop', 6 UNION ALL
  SELECT 'Left Field', 7 UNION ALL
  SELECT 'Center Field', 8 UNION ALL
  SELECT 'Right Field', 9 UNION ALL
  SELECT 'Designated Hitter', 10
) positions_data
ON CONFLICT (sport_id, name) DO NOTHING;

-- Basketball positions
INSERT INTO positions (sport_id, name, display_order)
SELECT (SELECT id FROM sports WHERE name = 'Basketball'), position, row_num
FROM (
  SELECT 'Point Guard' as position, 1 as row_num UNION ALL
  SELECT 'Shooting Guard', 2 UNION ALL
  SELECT 'Small Forward', 3 UNION ALL
  SELECT 'Power Forward', 4 UNION ALL
  SELECT 'Center', 5
) positions_data
ON CONFLICT (sport_id, name) DO NOTHING;

-- Field Hockey positions
INSERT INTO positions (sport_id, name, display_order)
SELECT (SELECT id FROM sports WHERE name = 'Field Hockey'), position, row_num
FROM (
  SELECT 'Goalkeeper' as position, 1 as row_num UNION ALL
  SELECT 'Forward', 2 UNION ALL
  SELECT 'Midfielder', 3 UNION ALL
  SELECT 'Defender', 4
) positions_data
ON CONFLICT (sport_id, name) DO NOTHING;

-- Football positions
INSERT INTO positions (sport_id, name, display_order)
SELECT (SELECT id FROM sports WHERE name = 'Football'), position, row_num
FROM (
  SELECT 'Quarterback' as position, 1 as row_num UNION ALL
  SELECT 'Running Back', 2 UNION ALL
  SELECT 'Wide Receiver', 3 UNION ALL
  SELECT 'Tight End', 4 UNION ALL
  SELECT 'Left Tackle', 5 UNION ALL
  SELECT 'Left Guard', 6 UNION ALL
  SELECT 'Center', 7 UNION ALL
  SELECT 'Right Guard', 8 UNION ALL
  SELECT 'Right Tackle', 9 UNION ALL
  SELECT 'Left End', 10 UNION ALL
  SELECT 'Defensive End', 11 UNION ALL
  SELECT 'Tackle', 12 UNION ALL
  SELECT 'Middle Linebacker', 13 UNION ALL
  SELECT 'Outside Linebacker', 14 UNION ALL
  SELECT 'Cornerback', 15 UNION ALL
  SELECT 'Safety', 16 UNION ALL
  SELECT 'Kicker', 17 UNION ALL
  SELECT 'Punter', 18 UNION ALL
  SELECT 'Long Snapper', 19
) positions_data
ON CONFLICT (sport_id, name) DO NOTHING;

-- Hockey positions
INSERT INTO positions (sport_id, name, display_order)
SELECT (SELECT id FROM sports WHERE name = 'Hockey'), position, row_num
FROM (
  SELECT 'Goaltender' as position, 1 as row_num UNION ALL
  SELECT 'Left Wing', 2 UNION ALL
  SELECT 'Center', 3 UNION ALL
  SELECT 'Right Wing', 4 UNION ALL
  SELECT 'Defenseman', 5
) positions_data
ON CONFLICT (sport_id, name) DO NOTHING;

-- Lacrosse positions
INSERT INTO positions (sport_id, name, display_order)
SELECT (SELECT id FROM sports WHERE name = 'Lacrosse'), position, row_num
FROM (
  SELECT 'Attack' as position, 1 as row_num UNION ALL
  SELECT 'Midfield', 2 UNION ALL
  SELECT 'Defense', 3 UNION ALL
  SELECT 'Goalkeeper', 4
) positions_data
ON CONFLICT (sport_id, name) DO NOTHING;

-- Soccer positions
INSERT INTO positions (sport_id, name, display_order)
SELECT (SELECT id FROM sports WHERE name = 'Soccer'), position, row_num
FROM (
  SELECT 'Goalkeeper' as position, 1 as row_num UNION ALL
  SELECT 'Left Back', 2 UNION ALL
  SELECT 'Center Back', 3 UNION ALL
  SELECT 'Right Back', 4 UNION ALL
  SELECT 'Left Midfielder', 5 UNION ALL
  SELECT 'Center Midfielder', 6 UNION ALL
  SELECT 'Right Midfielder', 7 UNION ALL
  SELECT 'Left Winger', 8 UNION ALL
  SELECT 'Right Winger', 9 UNION ALL
  SELECT 'Forward', 10
) positions_data
ON CONFLICT (sport_id, name) DO NOTHING;

-- Tennis positions
INSERT INTO positions (sport_id, name, display_order)
SELECT (SELECT id FROM sports WHERE name = 'Tennis'), position, row_num
FROM (
  SELECT 'Singles' as position, 1 as row_num UNION ALL
  SELECT 'Doubles', 2
) positions_data
ON CONFLICT (sport_id, name) DO NOTHING;

-- Volleyball positions
INSERT INTO positions (sport_id, name, display_order)
SELECT (SELECT id FROM sports WHERE name = 'Volleyball'), position, row_num
FROM (
  SELECT 'Outside Hitter' as position, 1 as row_num UNION ALL
  SELECT 'Middle Blocker', 2 UNION ALL
  SELECT 'Opposite Hitter', 3 UNION ALL
  SELECT 'Setter', 4 UNION ALL
  SELECT 'Libero', 5
) positions_data
ON CONFLICT (sport_id, name) DO NOTHING;

-- Water Polo positions
INSERT INTO positions (sport_id, name, display_order)
SELECT (SELECT id FROM sports WHERE name = 'Water Polo'), position, row_num
FROM (
  SELECT 'Goalkeeper' as position, 1 as row_num UNION ALL
  SELECT 'Utility', 2 UNION ALL
  SELECT 'Driver', 3 UNION ALL
  SELECT 'Hole Set', 4
) positions_data
ON CONFLICT (sport_id, name) DO NOTHING;

-- Enable RLS (no policies needed - public read, admin write)
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

-- Public read access to positions
CREATE POLICY "Public can read positions" ON positions
  FOR SELECT
  USING (true);

-- Admin-only write access
CREATE POLICY "Only admins can manage positions" ON positions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update positions" ON positions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );
