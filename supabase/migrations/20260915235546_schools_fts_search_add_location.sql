-- Applied live to QA via Supabase MCP on 2026-09-15 (PR #857+#866 hotfix)
-- but the migration file was never committed to this repo, leaving QA's
-- schema_migrations ahead of local history and blocking `supabase db push`.
-- Backfilled here so local/remote version history reconciles. No-op: the
-- corrected `location`-based search_vector this represents is already
-- covered by 20260913000001_schools_fts_search.sql; see MEMORY
-- schools-fts-address-location-fix.md.
select 1;
