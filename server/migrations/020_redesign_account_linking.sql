-- Phase 1: Account Linking Workflow Redesign
-- Adds new status values and relationship_type field to account_links table

-- 1. Expand account_links.status ENUM to include new states
-- Current values: 'pending', 'accepted', 'rejected', 'expired'
-- New values: 'pending_acceptance', 'pending_confirmation'

ALTER TABLE account_links
DROP CONSTRAINT IF EXISTS account_links_status_check;

ALTER TABLE account_links
ADD CONSTRAINT account_links_status_check
CHECK (status IN ('pending', 'pending_acceptance', 'pending_confirmation', 'accepted', 'rejected', 'expired'));

-- 2. Add relationship_type field to track the nature of the link
-- Values: 'parent-player', 'parent-parent', 'player-parent'
ALTER TABLE account_links
ADD COLUMN IF NOT EXISTS relationship_type VARCHAR(20)
CHECK (relationship_type IN ('parent-player', 'parent-parent', 'player-parent'));

-- 3. Migrate existing 'pending' status to 'pending_acceptance'
UPDATE account_links
SET status = 'pending_acceptance'
WHERE status = 'pending';

-- 4. Create backup of existing records (for safety, before migration)
CREATE TABLE IF NOT EXISTS account_links_backup AS
SELECT * FROM account_links
WHERE created_at < NOW() - INTERVAL '1 day';

-- 5. Add confirmed_at timestamp to track when initiator confirms the link
ALTER TABLE account_links
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;

-- 6. Add comment for clarity
COMMENT ON COLUMN account_links.status IS
'Link status: pending_acceptance (awaiting invitee), pending_confirmation (awaiting initiator), accepted, rejected, expired';

COMMENT ON COLUMN account_links.relationship_type IS
'Type of relationship: parent-player, parent-parent, or player-parent';

COMMENT ON COLUMN account_links.confirmed_at IS
'Timestamp when initiator confirmed the link (only set when status = accepted)';
