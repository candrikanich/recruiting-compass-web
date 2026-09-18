-- Issue #898: pending_player_details was stored once per family unit, so a
-- second pending player-role invite clobbered the first. Move it to the
-- invitation row so each invite's snapshot is independent.
ALTER TABLE family_invitations
  ADD COLUMN IF NOT EXISTS pending_player_details jsonb;
