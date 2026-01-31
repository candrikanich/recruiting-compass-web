-- Drop the account_links table (removed in favor of family code system)
-- This table was used for the old 3-step account linking workflow
-- which has been completely replaced by the simpler family code approach

DROP TABLE IF EXISTS account_links CASCADE;
