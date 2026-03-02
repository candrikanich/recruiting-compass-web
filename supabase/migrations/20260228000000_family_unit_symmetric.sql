-- Family Unit Symmetric Redesign
-- Goal: Either player or parent can create a family unit.
-- Remove player_user_id (player-as-owner model), add created_by_user_id (audit anchor).
-- Add family_invitations table for email-based invites.

-- 1. Add created_by_user_id (nullable during transition)
ALTER TABLE family_units
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES users(id);

-- 2. Backfill created_by_user_id from player_user_id for existing rows
UPDATE family_units
  SET created_by_user_id = player_user_id
  WHERE created_by_user_id IS NULL AND player_user_id IS NOT NULL;

-- 3. Make created_by_user_id NOT NULL now that it's backfilled
ALTER TABLE family_units
  ALTER COLUMN created_by_user_id SET NOT NULL;

-- 4. Drop player_user_id (RLS policies that reference it will be rebuilt below)
ALTER TABLE family_units
  DROP COLUMN IF EXISTS player_user_id;

-- 5. Add pending_player_details for parent-entered pre-fill data
ALTER TABLE family_units
  ADD COLUMN IF NOT EXISTS pending_player_details jsonb;

-- 6. Create family_invitations table
CREATE TABLE IF NOT EXISTS family_invitations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_unit_id   uuid NOT NULL REFERENCES family_units(id) ON DELETE CASCADE,
  invited_by       uuid NOT NULL REFERENCES users(id),
  invited_email    text NOT NULL,
  role             text NOT NULL CHECK (role IN ('player', 'parent')),
  token            text NOT NULL UNIQUE,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at       timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at       timestamptz NOT NULL DEFAULT now(),
  accepted_at      timestamptz
);

-- Index for token lookups (used on every /join page load)
CREATE INDEX IF NOT EXISTS idx_family_invitations_token ON family_invitations(token);
-- Index for listing pending invites by family
CREATE INDEX IF NOT EXISTS idx_family_invitations_family ON family_invitations(family_unit_id, status);

-- 7. RLS: family_units
-- Anyone who is a member of a family can read it
-- The creator (or any member) can update it
-- Only the creator can delete it

DROP POLICY IF EXISTS "family_units_select" ON family_units;
DROP POLICY IF EXISTS "family_units_insert" ON family_units;
DROP POLICY IF EXISTS "family_units_update" ON family_units;
DROP POLICY IF EXISTS "family_units_delete" ON family_units;

ALTER TABLE family_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_units_select" ON family_units
  FOR SELECT USING (
    id IN (
      SELECT family_unit_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "family_units_insert" ON family_units
  FOR INSERT WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "family_units_update" ON family_units
  FOR UPDATE USING (
    id IN (
      SELECT family_unit_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "family_units_delete" ON family_units
  FOR DELETE USING (created_by_user_id = auth.uid());

-- 8. RLS: family_invitations
ALTER TABLE family_invitations ENABLE ROW LEVEL SECURITY;

-- Any family member can view invitations for their family
CREATE POLICY "family_invitations_select" ON family_invitations
  FOR SELECT USING (
    family_unit_id IN (
      SELECT family_unit_id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- Any family member can create invitations
CREATE POLICY "family_invitations_insert" ON family_invitations
  FOR INSERT WITH CHECK (
    family_unit_id IN (
      SELECT family_unit_id FROM family_members WHERE user_id = auth.uid()
    )
    AND invited_by = auth.uid()
  );

-- Only the inviter can update (e.g., revoke/resend)
CREATE POLICY "family_invitations_update" ON family_invitations
  FOR UPDATE USING (invited_by = auth.uid());

-- Only the inviter can delete
CREATE POLICY "family_invitations_delete" ON family_invitations
  FOR DELETE USING (invited_by = auth.uid());

-- Public reads of a specific invitation by token are handled via service role key in API routes.
