-- No-op migration to verify migrate-qa-e2e.yml fires and pushes cleanly
-- to both the QA (xpxzhqghxecsjhvklsqg) and e2e (ahpethltxopkjxxzwmmb)
-- projects. Safe to leave in migration history; changes nothing.
-- Re-touched 2026-09-09 to force a fresh push event after adding
-- --include-all to the workflow (PR #731) -- a rerun of a prior failed
-- run replays that run's original commit's workflow file, not develop's
-- current one, so a genuinely new push was needed to pick it up.
DO $$ BEGIN END $$;
