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
SELECT id, position, row_number OVER (ORDER BY row_number) as display_order
FROM (
  SELECT (SELECT id FROM sports WHERE name = 'Baseball') as id, unnest(ARRAY[
    'Pitcher', 'Catcher', 'First Base', 'Second Base', 'Third Base',
    'Shortstop', 'Left Field', 'Center Field', 'Right Field', 'Designated Hitter'
  ]) as position, row_number
) positions_data
ORDER BY row_number
ON CONFLICT (sport_id, name) DO NOTHING;

-- Basketball positions
INSERT INTO positions (sport_id, name, display_order)
SELECT id, position, row_number OVER (ORDER BY row_number) as display_order
FROM (
  SELECT (SELECT id FROM sports WHERE name = 'Basketball') as id, unnest(ARRAY[
    'Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'
  ]) as position, row_number
) positions_data
ORDER BY row_number
ON CONFLICT (sport_id, name) DO NOTHING;

-- Field Hockey positions
INSERT INTO positions (sport_id, name, display_order)
SELECT id, position, row_number OVER (ORDER BY row_number) as display_order
FROM (
  SELECT (SELECT id FROM sports WHERE name = 'Field Hockey') as id, unnest(ARRAY[
    'Goalkeeper', 'Forward', 'Midfielder', 'Defender'
  ]) as position, row_number
) positions_data
ORDER BY row_number
ON CONFLICT (sport_id, name) DO NOTHING;

-- Football positions
INSERT INTO positions (sport_id, name, display_order)
SELECT id, position, row_number OVER (ORDER BY row_number) as display_order
FROM (
  SELECT (SELECT id FROM sports WHERE name = 'Football') as id, unnest(ARRAY[
    'Quarterback', 'Running Back', 'Wide Receiver', 'Tight End', 'Left Tackle',
    'Left Guard', 'Center', 'Right Guard', 'Right Tackle', 'Left End',
    'Defensive End', 'Tackle', 'Middle Linebacker', 'Outside Linebacker',
    'Cornerback', 'Safety', 'Kicker', 'Punter', 'Long Snapper'
  ]) as position, row_number
) positions_data
ORDER BY row_number
ON CONFLICT (sport_id, name) DO NOTHING;

-- Hockey positions
INSERT INTO positions (sport_id, name, display_order)
SELECT id, position, row_number OVER (ORDER BY row_number) as display_order
FROM (
  SELECT (SELECT id FROM sports WHERE name = 'Hockey') as id, unnest(ARRAY[
    'Goaltender', 'Left Wing', 'Center', 'Right Wing', 'Defenseman'
  ]) as position, row_number
) positions_data
ORDER BY row_number
ON CONFLICT (sport_id, name) DO NOTHING;

-- Lacrosse positions
INSERT INTO positions (sport_id, name, display_order)
SELECT id, position, row_number OVER (ORDER BY row_number) as display_order
FROM (
  SELECT (SELECT id FROM sports WHERE name = 'Lacrosse') as id, unnest(ARRAY[
    'Attack', 'Midfield', 'Defense', 'Goalkeeper'
  ]) as position, row_number
) positions_data
ORDER BY row_number
ON CONFLICT (sport_id, name) DO NOTHING;

-- Soccer positions
INSERT INTO positions (sport_id, name, display_order)
SELECT id, position, row_number OVER (ORDER BY row_number) as display_order
FROM (
  SELECT (SELECT id FROM sports WHERE name = 'Soccer') as id, unnest(ARRAY[
    'Goalkeeper', 'Left Back', 'Center Back', 'Right Back', 'Left Midfielder',
    'Center Midfielder', 'Right Midfielder', 'Left Winger', 'Right Winger', 'Forward'
  ]) as position, row_number
) positions_data
ORDER BY row_number
ON CONFLICT (sport_id, name) DO NOTHING;

-- Tennis positions
INSERT INTO positions (sport_id, name, display_order)
SELECT id, position, row_number OVER (ORDER BY row_number) as display_order
FROM (
  SELECT (SELECT id FROM sports WHERE name = 'Tennis') as id, unnest(ARRAY[
    'Singles', 'Doubles'
  ]) as position, row_number
) positions_data
ORDER BY row_number
ON CONFLICT (sport_id, name) DO NOTHING;

-- Volleyball positions
INSERT INTO positions (sport_id, name, display_order)
SELECT id, position, row_number OVER (ORDER BY row_number) as display_order
FROM (
  SELECT (SELECT id FROM sports WHERE name = 'Volleyball') as id, unnest(ARRAY[
    'Outside Hitter', 'Middle Blocker', 'Opposite Hitter', 'Setter', 'Libero'
  ]) as position, row_number
) positions_data
ORDER BY row_number
ON CONFLICT (sport_id, name) DO NOTHING;

-- Water Polo positions
INSERT INTO positions (sport_id, name, display_order)
SELECT id, position, row_number OVER (ORDER BY row_number) as display_order
FROM (
  SELECT (SELECT id FROM sports WHERE name = 'Water Polo') as id, unnest(ARRAY[
    'Goalkeeper', 'Utility', 'Driver', 'Hole Set'
  ]) as position, row_number
) positions_data
ORDER BY row_number
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
