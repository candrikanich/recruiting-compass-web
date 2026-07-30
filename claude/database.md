## Supabase & Database

**Client:** Use `useSupabase()` singleton — do NOT create new clients per request (wastes connections). Select specific columns, filter with `.eq()`.

**Schema:** Add columns as nullable, separate migration. Use CHECK constraints for enums (not PG enums).

**Types:** `npx supabase gen types typescript --local > types/database.ts` after migrations

## Common Patterns

- **State mutation**: Only in Pinia actions, never in components — keeps state changes auditable and devtools-visible
- **Error handling**: Always try/catch async operations, set error state explicitly — silent failures leave users on broken UI with no feedback
- **N+1 queries**: Use `.select()` with specific columns, batch fetch related data, cache in stores — unbounded queries on lists will kill performance at scale
- **Pagination on list endpoints**: Any Nitro list handler not naturally bounded by `user_id`/`family_unit_id` must accept `?limit=20&offset=0` and apply `.range(offset, offset + limit - 1)` — never return unbounded result sets
- **Index filter columns in migrations**: Every migration adding a column used in `.eq()`, `.order()`, or `.match()` must include a `CREATE INDEX` in the same migration file
- **Component auto-import**: No import needed for `/components/**`
- **Supabase connection**: Verify `.env.local`, check project isn't paused

## Cascade-Delete Pattern

1. Try simple delete (fast path) 2. Catch FK errors ("Cannot delete", "violates foreign key") 3. Fall back to `/api/[entity]/[id]/cascade-delete` (children first, `confirmDelete: true`) 4. Return `{ cascadeUsed: boolean }` for UX messaging 5. CSRF token required (ensure client uses `useAuthFetch` which auto-injects the token)

**Security:** Use `family_unit_id` for access control (not `user_id`)

**Entities:** schools, coaches, interactions

## RLS: account_links-era policies still load-bearing (product decision 2026-07-28)

Phase 10a (`supabase/migrations/20260728000000_rls_account_links_consolidation_phase10a.sql`) consolidated `family_units`/`family_members` as the sole RLS model only where proven safe: `schools` SELECT/INSERT/UPDATE, `users` SELECT, `interactions` UPDATE/DELETE, `events` SELECT/UPDATE/DELETE. Everywhere else, legacy `account_links`-era policies remain the only thing preventing an access hole and must **not** be dropped without first doing the listed prep work:

- **`coaches`, `documents`, `performance_metrics`, `social_media_posts`, `recommendation_letters` — all verbs.** Write paths (`stores/coaches.ts`, `composables/useDocumentsConsolidated.ts`, `composables/usePerformanceConsolidated.ts`) never set `family_unit_id` on insert and no trigger backfills it, so the family-model policies are non-functional on these tables today. `recommendation_letters` has no family-model policies at all yet — its `get_linked_user_ids()`-based account_links policies are the only access control it has. **Precondition to drop:** backfill `family_unit_id` on existing rows (derive from `schools.family_unit_id` via `school_id`/`user_id`) + populate it at insert time in the write paths above (and, for `recommendation_letters`, add family-model policies in the first place).
- **`interactions` SELECT/INSERT.** The family-model policies require the *inserted row's own* `family_unit_id`; Postgres requires an `INSERT ... RETURNING` row to also pass the SELECT policy. Real app code (`composables/useInteractions.ts`) always sets `family_unit_id`, but RLS itself doesn't enforce it. **Precondition to drop:** enforce/backfill `family_unit_id` at write time (ideally a `BEFORE INSERT` trigger).
- **DELETE on `schools`, `coaches`, `documents`, `performance_metrics`.** No family-model DELETE policy exists on these tables at all — this is a structural gap, not a redundant pair. **Precondition to drop the account_links policy:** first add a family-model DELETE policy; dropping without one removes delete access entirely.

Full enumeration and evidence: `tests/integration/rls/rls-phase10a-consolidation.integration.spec.ts` and `tests/integration/rls/rls-security-hotfix.integration.spec.ts` (live-Postgres regression suites, both gate every consolidation/deferral decision above).

### Phase 10a prod pre-flight: repaired + PASSING as of 2026-07-30; migration stack still pending on prod

The live DB (`xpxzhqghxecsjhvklsqg`, behind myrecruitingcompass.com — a single DB serves prod and non-prod) sat at migration head `20260603000000`, missing all five `202607*` migrations. First pre-flight run FAILED:

- **Check A: 482 of 645 schools** had NULL `family_unit_id` (2 owners, each in exactly one family unit — legacy rows predating family-unit writes).
- **Check B: 1 accepted `account_links` row** (`1ad82aac-b546-483b-ad20-1bd2b7ab7eee`, 2025-12-10) with `player_user_id` **NULL** and `initiator_user_id = parent_user_id` — a parent-initiated link no player ever attached to; grants nothing via `get_linked_user_ids()` (NULL yields no access).

Repair: `supabase/migrations/20260727000004_phase10a_preflight_data_repair.sql` (unambiguous backfill + dead-self-link delete; idempotent). Its statements were executed directly on the live DB 2026-07-30 and **both checks now return 0** — the file exists so any clean-slate or catch-up apply repairs data before `20260728000000`'s abort gate. Note: because it ran via SQL (not the migration CLI), it is NOT recorded in `supabase_migrations.schema_migrations`; a future `db push` will harmlessly re-run it.

**Still to do:** manually apply the six pending migration files (`20260727000000`→`20260728000000`) to the live DB — it is still missing `rls_security_hotfix_phase1` and the rest of the stack.
