-- One-time backfill for player invitations created before 20260928000007
-- moved snapshotting from family_units to family_invitations (issue #898).
-- accept.post.ts now reads exclusively from the invitation row, so any
-- still-pending pre-migration invite would otherwise skip prefill/hydration/
-- onboarding-complete even though the parent already staged the draft.
--
-- Only backfill where it's unambiguous: exactly one pending player-role
-- invitation per family with no snapshot yet. A family with two or more such
-- invitations is exactly the clobbering scenario 20260928000007 fixed --
-- there's no way to know which invitation the family draft belonged to, so
-- those are left NULL rather than guessed. Intentionally not a runtime
-- fallback (would reintroduce cross-invitation clobbering for new invites).
WITH unambiguous_families AS (
  SELECT family_unit_id
  FROM "public"."family_invitations"
  WHERE role = 'player'
    AND status = 'pending'
    AND pending_player_details IS NULL
  GROUP BY family_unit_id
  HAVING COUNT(*) = 1
)
UPDATE "public"."family_invitations" fi
SET pending_player_details = fu.pending_player_details
FROM "public"."family_units" fu
JOIN unambiguous_families uf ON uf.family_unit_id = fu.id
WHERE fi.family_unit_id = fu.id
  AND fi.family_unit_id = uf.family_unit_id
  AND fi.role = 'player'
  AND fi.status = 'pending'
  AND fi.pending_player_details IS NULL
  AND fu.pending_player_details IS NOT NULL;
