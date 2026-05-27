-- Allow 'declined' status on family_invitations.
--
-- 20260301000003_invite_expiry_decline.sql added the declined_at column and the
-- decline endpoint writes status='declined', but the status CHECK constraint
-- still only permitted ('pending','accepted','expired'). Every decline therefore
-- violated the constraint and the endpoint returned 500. Widen the constraint to
-- include 'declined' so the decline flow works.

ALTER TABLE family_invitations
  DROP CONSTRAINT IF EXISTS family_invitations_status_check;

ALTER TABLE family_invitations
  ADD CONSTRAINT family_invitations_status_check
  CHECK (status IN ('pending', 'accepted', 'expired', 'declined'));
