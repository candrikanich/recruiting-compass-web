-- Throwaway migration to fire-test the gated prod migration pipeline
-- (.github/workflows/migrate-prod.yml, issue #118 Task 6 Step 4).
-- Genuinely a no-op against the schema.
select 1;
