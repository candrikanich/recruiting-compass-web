ALTER TABLE family_units
  ADD COLUMN IF NOT EXISTS pending_player_details jsonb;
