-- Move pending player details from family-scoped to invitation-scoped storage
-- (issue #898). family_units.pending_player_details is written once per family,
-- so a family with two pending player-role invitations at once (two children,
-- or a re-invite before the first is accepted) has the later write clobber the
-- earlier one -- and accept.post.ts, reading by family ID, hydrates whichever
-- invitation is accepted second with data meant for the first.
--
-- family_units.pending_player_details stays in place as the pre-invite staging
-- draft written by server/api/family/player-details.post.ts during parent
-- onboarding (before any invitation exists to attach it to). invite.post.ts now
-- snapshots that draft (merged with any wire payload) onto the new invitation's
-- own row instead of writing back to family_units, and accept.post.ts reads
-- from the invitation it's actually accepting.

ALTER TABLE "public"."family_invitations"
  ADD COLUMN "pending_player_details" jsonb;
