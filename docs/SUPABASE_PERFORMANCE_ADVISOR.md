# Supabase Performance Advisor – Summary and Plan

Run the Performance Advisor in the [Supabase Dashboard](https://supabase.com/dashboard/project/_/database/performance-advisor) (Database → Performance Advisor). Below is a snapshot and suggested fix order.

## Snapshot (as of last run)

| Check                            | Count | Level | Notes                                                                 |
| -------------------------------- | ----- | ----- | --------------------------------------------------------------------- |
| **multiple_permissive_policies** | 114   | WARN  | Tables with multiple permissive RLS policies; can complicate planning |
| **auth_rls_initplan**            | 106   | WARN  | RLS policies that trigger initplan; can affect query performance      |
| **unused_index**                 | 67    | INFO  | Indexes never used; slow down writes, safe to drop after verification |
| **unindexed_foreign_keys**       | 8     | INFO  | FK columns without indexes; can hurt join/delete performance          |
| **no_primary_key**               | 6     | WARN  | All 6 are `*_backup_pre_family` tables (backups from migration)       |
| **duplicate_index**              | 2     | INFO  | Redundant indexes                                                     |

**Total:** 303 findings (81 INFO, 222 WARN).

## Should we plan to fix them?

**Yes, but in order of impact and effort.**

1. **High value, low risk – do first**
   - **Unindexed foreign keys (8).** Add indexes on FK columns that are used in JOINs or cascades. Improves query and CASCADE performance.
   - **Duplicate index (2).** Identify and drop the redundant index (keep one). Reduces write cost and storage.

2. **Medium value – plan when touching RLS**
   - **auth_rls_initplan (106)** and **multiple_permissive_policies (114).** Often require RLS policy refactors (e.g. consolidating policies, avoiding volatile functions in policies). Tackle when you’re already changing RLS or if you see slow authenticated queries.

3. **Low priority**
   - **no_primary_key (6).** All are backup tables. Only add PKs if you start querying those tables; otherwise leave as-is.
   - **unused_index (67).** Drop only after confirming with `pg_stat_user_indexes` (or Supabase stats) that they’re unused in production; otherwise low priority.

## Quick wins applied (migration 027)

**Done:** `027_performance_advisor_quick_wins.sql` adds the 8 FK indexes and drops the duplicate index on `coaches` (`coaches_user_id_idx`, keeping `idx_coaches_user_id`).

**Skipped:** The duplicate on `users` (`users_email_key`, `users_email_unique`) is constraint-backed; both indexes are required by their constraints. To remove the redundancy you’d need to drop one UNIQUE constraint and keep the other (schema change, not done here).

Re-run the Performance Advisor after applying migrations to confirm findings are resolved.

## References

- [Database Linter (Performance Advisor)](https://supabase.com/docs/guides/database/database-linter)
- Dashboard: **Database** → **Performance Advisor**
