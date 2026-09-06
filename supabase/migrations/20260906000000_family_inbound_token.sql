-- Per-family unique inbound-email token. Embedded in a Resend-managed
-- address (family-<token>@inbound.therecruitingcompass.com) that a player
-- forwards coach emails to. Nullable + backfilled lazily is not viable here
-- (the webhook must resolve a family on first-ever forward), so this
-- migration backfills every existing family_unit in the same pass.
ALTER TABLE family_units
  ADD COLUMN IF NOT EXISTS inbound_token text
    CHECK (inbound_token ~ '^[a-z0-9]{8}$');

CREATE UNIQUE INDEX IF NOT EXISTS idx_family_units_inbound_token
  ON family_units (inbound_token)
  WHERE inbound_token IS NOT NULL;

-- Backfill: generate a random 8-char token for every family lacking one.
-- gen_random_uuid() collision odds at this row count are negligible; a
-- runtime collision (new family created concurrently) is handled by the
-- unique index + app-level retry in generateInboundToken().
UPDATE family_units
SET inbound_token = lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE inbound_token IS NULL;

ALTER TABLE family_units
  ALTER COLUMN inbound_token SET NOT NULL;
