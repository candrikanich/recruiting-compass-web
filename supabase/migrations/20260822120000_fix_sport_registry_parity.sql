-- Phase 2a: align the `sports` seed with the canonical sport registry
-- (utils/positions/canonical.ts SPORT_POSITIONS). Two parity bugs found in the
-- 2026-08-22 baseball-deprecation audit:
--   1. Sport seeded as "Hockey" but the registry key is "Ice Hockey" — position
--      and metric lookups keyed on the DB name missed the registry entirely.
--   2. has_position_list was false for sports whose registry gives a real
--      multi-position list. Correct rule: flag = (registry positions.length > 1).
--      Softball (10), Swimming (6), Track & Field (5) were wrongly false.
--      Single-entry individual sports (Cross Country, Golf, Rowing, Wrestling)
--      correctly stay false.
--
-- Safe on current data: primary_sport values in use are only Baseball/Basketball;
-- nothing stores "Hockey" as text, and sports.id (uuid) is the FK, not the name.

UPDATE sports
SET name = 'Ice Hockey', updated_at = now()
WHERE name = 'Hockey';

UPDATE sports
SET has_position_list = true, updated_at = now()
WHERE name IN ('Softball', 'Swimming', 'Track & Field')
  AND has_position_list = false;
