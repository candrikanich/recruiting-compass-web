-- Phase 10a pre-flight data repair (found 2026-07-30 running the
-- 20260728000000 pre-flight checks read-only against the live DB, which
-- was at migration head 20260603000000 — see claude/database.md,
-- "Phase 10a prod pre-flight").
--
-- Timestamped 20260727000004 deliberately: it must sort after the four
-- existing 20260727* migrations and BEFORE 20260728000000, whose DO-block
-- pre-flight aborts on the data this file repairs. Both statements are
-- idempotent no-ops on databases that were already clean (local/QA).
--
-- 1. Backfill schools.family_unit_id from the owner's family_members row.
--    482 of 645 live rows (2 owners) predate family-unit writes. Only
--    owners in exactly one family unit are backfilled — ambiguous owners
--    (none exist today) are left NULL for the pre-flight to re-flag
--    rather than guessed at.
UPDATE public.schools s
SET family_unit_id = owner.family_unit_id
FROM (
  SELECT user_id, min(family_unit_id::text)::uuid AS family_unit_id
  FROM public.family_members
  GROUP BY user_id
  HAVING count(DISTINCT family_unit_id) = 1
) owner
WHERE s.family_unit_id IS NULL
  AND s.user_id = owner.user_id;

-- 2. Delete dead self-links: one live account_links row (created
--    2025-12-10) is status 'accepted' with player_user_id NULL and
--    initiator_user_id = parent_user_id — a parent-initiated link no
--    player ever attached to. It grants nothing (get_linked_user_ids()
--    yields only NULL from it) and can never satisfy the Phase 10a
--    co-residency check, so it is corruption, not state.
DELETE FROM public.account_links
WHERE status = 'accepted'
  AND player_user_id IS NULL
  AND initiator_user_id = parent_user_id;
