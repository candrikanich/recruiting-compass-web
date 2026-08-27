-- Resolution state for inbound leads. status gates the inbox pending queue;
-- interaction_id ties a lead to the interaction it produced (match or assign).
ALTER TABLE profile_contacts
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'resolved', 'dismissed')),
  ADD COLUMN IF NOT EXISTS interaction_id uuid
    REFERENCES interactions(id) ON DELETE SET NULL;

-- Backfill: rows that already matched a coach are effectively resolved
-- (the interaction will be minted going forward; historic ones have none),
-- everything else is a pending lead awaiting assignment.
UPDATE profile_contacts
  SET status = 'resolved'
  WHERE matched_coach_id IS NOT NULL AND status = 'pending';
