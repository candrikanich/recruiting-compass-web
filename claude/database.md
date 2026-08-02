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

## RLS: account_links-era policies — RESOLVED 2026-08-02 (see `planning/rls-family-consolidation-plan.md` Phases 1-5)

All three deferrals below are closed as of the 2026-08-02 Phase 5 entry further down this file: `family_units`/`family_members` is now the sole permissive policy per verb on every table listed, exactly one policy per verb per table (audit exit criterion met). Kept for historical context — do not treat as current state.

Phase 10a (`supabase/migrations/20260728000000_rls_account_links_consolidation_phase10a.sql`) consolidated `family_units`/`family_members` as the sole RLS model only where proven safe: `schools` SELECT/INSERT/UPDATE, `users` SELECT, `interactions` UPDATE/DELETE, `events` SELECT/UPDATE/DELETE. Everywhere else, legacy `account_links`-era policies remain the only thing preventing an access hole and must **not** be dropped without first doing the listed prep work:

- **`coaches`, `documents`, `performance_metrics`, `social_media_posts`, `recommendation_letters` — all verbs.** Write paths (`stores/coaches.ts`, `composables/useDocumentsConsolidated.ts`, `composables/usePerformanceConsolidated.ts`) never set `family_unit_id` on insert and no trigger backfills it, so the family-model policies are non-functional on these tables today. `recommendation_letters` has no family-model policies at all yet — its `get_linked_user_ids()`-based account_links policies are the only access control it has. **Precondition to drop:** backfill `family_unit_id` on existing rows (derive from `schools.family_unit_id` via `school_id`/`user_id`) + populate it at insert time in the write paths above (and, for `recommendation_letters`, add family-model policies in the first place).
- **`interactions` SELECT/INSERT.** The family-model policies require the *inserted row's own* `family_unit_id`; Postgres requires an `INSERT ... RETURNING` row to also pass the SELECT policy. Real app code (`composables/useInteractions.ts`) always sets `family_unit_id`, but RLS itself doesn't enforce it. **Precondition to drop:** enforce/backfill `family_unit_id` at write time (ideally a `BEFORE INSERT` trigger).
- **DELETE on `schools`, `coaches`, `documents`, `performance_metrics`.** No family-model DELETE policy exists on these tables at all — this is a structural gap, not a redundant pair. **Precondition to drop the account_links policy:** first add a family-model DELETE policy; dropping without one removes delete access entirely.

Full enumeration and evidence: `tests/integration/rls/rls-phase10a-consolidation.integration.spec.ts` and `tests/integration/rls/rls-security-hotfix.integration.spec.ts` (live-Postgres regression suites, both gate every consolidation/deferral decision above).

### 2026-08-01: deferral preconditions SATISFIED (Phases 1-3 of `planning/rls-family-consolidation-plan.md` applied live)

All three bullets above now have their prep work done — applied to the live DB 2026-08-01 via Supabase MCP, verified same day:

- `20260805000000_family_unit_id_columns_trigger_backfill.sql` — `family_unit_id` columns on `social_media_posts`/`recommendation_letters`; generic `derive_family_unit_id()` BEFORE INSERT OR UPDATE trigger on all 7 deferred tables (silently derives school_id → coach_id → document_id → unambiguous-user, never raises); idempotent backfill. Post-apply: **0 NULL `family_unit_id` on all 7 tables** (one pass, no ambiguous-owner residue).
- `20260808000000_family_policies_additive.sql` — additive family policies only: DELETE on schools/coaches/documents/performance_metrics; full family CRUD on social_media_posts + recommendation_letters. **No legacy policy dropped yet** — the deferral section above still describes which legacy policies remain load-bearing until the Phase 4/5 cutovers.
- App code (develop `7054bf0b`) stamps `family_unit_id` on every client write path; fit-score endpoint accepts family membership.
- Versions recorded twice in `schema_migrations`: MCP apply timestamps (`20260801210413`/`20260801210433`) and repo filenames (`20260805000000`/`20260808000000`) so `db push` won't re-apply.
- Evidence: `tests/integration/rls/rls-family-deferrals.integration.spec.ts` (18 live assertions, RED→GREEN across the apply); full RLS suite 39/39; full E2E passed post-apply.
- Remaining (as of 2026-08-01 entry): Phase 5 (Deferral A legacy drops) — DONE, see 2026-08-02 entry below.

### 2026-08-02: Phase 4 applied live (interactions cutover + schools DELETE)

- `20260812000000_cutover_interactions_schools_delete.sql` — recreated all 7 family UPDATE policies (schools, coaches, documents, events, performance_metrics, social_media_posts, recommendation_letters) with explicit `WITH CHECK`; re-ran interactions/schools backfills; dropped legacy `get_linked_user_ids()`-based interactions SELECT/INSERT policies and legacy schools DELETE policies (`account_links`-based + plain-ownership). Chris ruling: no soak period before this phase — pre-launch, no live users yet.
- Post-apply: 0 NULL `family_unit_id` on interactions/schools; `interactions` SELECT/INSERT and `schools` DELETE now single family-model policy each.
- `tests/integration/rls/rls-family-deferrals.integration.spec.ts` Phase 4 block: 23/23 GREEN live (18 Phase 1/3 + 5 new), including proof that INSERT...RETURNING on interactions with no explicit `family_unit_id` is satisfied by the Phase 1 trigger-derived value against the SELECT policy.
- **Deferral B (interactions) now resolved.**

### 2026-08-02: Phase 5 applied live (Deferral A legacy drops — audit exit criterion met)

- `20260815000000_cutover_deferral_a_drop_legacy.sql` — dropped all 43 remaining legacy (`get_linked_user_ids()`, plain-ownership, school/coach-join) policies across coaches (17), documents (6), performance_metrics (6), recommendation_letters (5), social_media_posts (9, including the coach-join `social_media_posts_select_family` SELECT). Family-model policies are now the sole permissive policy per verb per table.
- Live reconciliation (mandatory per plan) matched baseline.sql exactly — no drift.
- Post-apply: 0 NULL `family_unit_id` on all 5 tables; exit-criterion audit query confirms exactly 1 permissive policy per verb per table across all 5 (20/20 rows, n=1).
- New regression coverage (`rls-family-deferrals.integration.spec.ts` Phase 5 block): a user linked only via accepted `account_links` (no `family_members` row) — the exact shape the dropped legacy policies used to honor — now denied SELECT/DELETE on all 5 tables. RED confirmed pre-apply (legacy access still worked), GREEN post-apply. Full spec 25/25 live.
- **Deferral A now resolved. All three original deferrals (A, B, C) closed — `planning/rls-family-consolidation-plan.md` Phases 1-5 complete.** Phase 6 (audit + docs, no schema change) is the only remaining plan item.

### 2026-08-02: Phase 6 — audit + docs (plan complete, no schema change)

Re-ran the exit-criterion query against the full family-model table set (`coaches`, `documents`, `events`, `interactions`, `offers`, `performance_metrics`, `player_profiles`, `recommendation_letters`, `schools`, `social_media_posts`), not just this plan's 5 Deferral-A tables:

- **This plan's scope (schools DELETE, interactions all verbs, coaches/documents/performance_metrics/recommendation_letters/social_media_posts all verbs) is fully consolidated** — exactly 1 permissive policy per verb, confirmed.
- **Discovered, out of this plan's scope:** `schools` (INSERT ×2, SELECT ×2) and `events` (INSERT/SELECT/UPDATE ×2 each) still carry a redundant *non-account_links* permissive policy alongside the family-model one (e.g. `schools`: "Linked users can create schools" — plain `user_id = auth.uid()`, not account_links-based despite the name — coexists with "Users can create schools in their families"; `events`: "Users can view/update/insert their own events" coexists with the family-model equivalents). Not a security hole — the extra policy is same-or-narrower than the family one, both PERMISSIVE — but it means `plans/audit-remediation.md` Phase 10's "exactly one permissive policy set per verb per table" criterion is **not yet fully met repo-wide**. Left as-is: consolidating these was never part of Deferral A/B/C and touching them wasn't authorized in this session.
- `offers` and `player_profiles` are already single-policy-per-verb (offers via family model; player_profiles via its own `player_profiles_select_own`/`_public` split, a different and intentional model, not family_unit_id-based).

**Deferred tickets (not filed in an external tracker — no issue tracker wired to this repo; recorded here per existing convention):**
1. **`athlete_task` family migration** — no `family_unit_id` column on `task`/`athlete_task`; still on `get_linked_user_ids()`-only access. Same shape of work as this plan, not started.
2. **`family_members` UPDATE/DELETE policies** — missing entirely today (only SELECT/INSERT exist). Out of scope here.
3. **`family_unit_id` NOT NULL** — deliberately still nullable everywhere (trigger's unambiguous-user fallback can legitimately leave it NULL for multi-family owners). Revisit once/if the ambiguous-owner residue (plan "Unresolved questions" 1-2) is triaged to zero.
4. **`schools`/`events` redundant non-account_links permissive policies** (discovered above) — low priority, no access-control risk, just policy-count noise against the audit-remediation Phase 10 criterion.

Plan file: `planning/rls-family-consolidation-plan.md` (already committed there, satisfying "copy plan to planning/" convention). Phases 1-6 of this plan are now complete.

### Phase 10a prod pre-flight: repaired + PASSING as of 2026-07-30; migration stack still pending on prod

The live DB (`xpxzhqghxecsjhvklsqg`, behind myrecruitingcompass.com — a single DB serves prod and non-prod) sat at migration head `20260603000000`, missing all five `202607*` migrations. First pre-flight run FAILED:

- **Check A: 482 of 645 schools** had NULL `family_unit_id` (2 owners, each in exactly one family unit — legacy rows predating family-unit writes).
- **Check B: 1 accepted `account_links` row** (`1ad82aac-b546-483b-ad20-1bd2b7ab7eee`, 2025-12-10) with `player_user_id` **NULL** and `initiator_user_id = parent_user_id` — a parent-initiated link no player ever attached to; grants nothing via `get_linked_user_ids()` (NULL yields no access).

Repair: `supabase/migrations/20260727000004_phase10a_preflight_data_repair.sql` (unambiguous backfill + dead-self-link delete; idempotent — deliberately, because E2E suites write `player@test.com` schools without `family_unit_id` into this same DB, so NULL rows recur between repair and apply; the actual apply ran backfill + phase10a in one transaction to close that race).

**2026-07-30: all six pending migrations (`20260727000000`→`20260728000000`) were applied to the live DB** via Supabase MCP, in file order, inside transactions, after read-only pre-checks (FK orphan scan for the GDPR constraint adds, `(grade_level, title)` dupe scan for the task seed — all zero). Versions were recorded manually in `supabase_migrations.schema_migrations` (statements columns hold a stub pointing at the repo file, not the SQL). Verified after: migration head `20260728000000`, all dropped policies absent, `task.slug` NOT NULL + seeded, `notifications.action_url` + enum values present, `device_tokens` FK cascade, 0 NULL `family_unit_id`. Security advisors: no criticals; `get_athlete_status` no longer anon-executable. One live fix found during verification: Supabase default privileges had granted `anon` EXECUTE on `family_unit_created_by` despite the hotfix's `REVOKE ... FROM PUBLIC` — revoked live and patched into the hotfix migration file for fresh environments.

### Security advisor WARN pass (2026-07-30) — SECURITY DEFINER RPC exposure + mutable search_path

Applied live as two MCP migrations (`20260730193858_security_advisor_warn_hardening`, `20260730193943_security_advisor_warn_hardening_public_grant_fix`), consolidated into one repo file: `supabase/migrations/20260730000000_security_advisor_warn_hardening.sql`.

**The gotcha that needed a second migration:** the first `REVOKE EXECUTE ... FROM anon, authenticated` had **zero effect** — verified via `has_function_privilege()`, not the (cached) advisor output. Postgres grants `EXECUTE` to `PUBLIC` by default at function creation; `anon`/`authenticated` inherit through `PUBLIC` membership regardless of a direct-role `REVOKE`. Same failure mode as the `family_unit_created_by` fix above — **always `REVOKE ... FROM PUBLIC` explicitly, and verify with `has_function_privilege()` against the live catalog, never trust the advisor snapshot alone (it doesn't re-run per call).**

**3 functions kept `authenticated` EXECUTE** — confirmed live-catalog dependents via `pg_policy`, not just migration-file grep (grep alone misses anything altered outside a migration): `get_user_family_ids` (family_members SELECT policy), `is_data_owner` (athlete_task INSERT/UPDATE/DELETE policies), `user_is_family_member` (family_members SELECT policy). `anon` was still revoked on all three — nothing legitimate needs anon access to family/task data.

**9 functions fully locked down** (`anon` + `authenticated` revoked, `service_role` untouched via its own explicit baseline grant): `is_parent_viewing_athlete`, `get_accessible_athletes`, `get_primary_family_id`, `is_parent_viewing_linked_athlete`, `create_audit_log`, `delete_expired_audit_logs`, `handle_new_user`, `trigger_push_notification`, `increment_profile_link_view`. `handle_new_user`/`trigger_push_notification` are trigger functions (`on_auth_user_created`, `push_on_notification_insert`) — triggers fire on DML regardless of grants, so locking down direct RPC exposure doesn't touch their real usage. `increment_profile_link_view` is only called server-side via the service-role client (bypasses grants).

**7 functions got `search_path = public, pg_temp`** (pure hygiene, zero behavior/grant change): `is_parent_viewing_athlete`, `set_player_profiles_updated_at`, `update_follow_up_reminders_updated_at`, `increment_profile_link_view`, `get_accessible_athletes`, `trigger_push_notification`, `update_updated_at_column`.

**Deferred** (separate, higher-risk or non-SQL): `pg_trgm` extension still in `public` schema (relocating risks breaking trigram search indexes without a closer look at usage first); leaked-password-protection is a Supabase Auth config toggle, not a SQL fix.

Verified: full E2E suite post-migration, 454 passed / 1 flake (`auth.spec.ts` logout — signup-under-parallel-load timeout, reproduced 0/3 in isolation, confirmed unrelated to the grant changes).

### pg_trgm relocated out of public (2026-08-01)

`supabase/migrations/20260801000000_move_pg_trgm_to_extensions.sql` — `ALTER EXTENSION pg_trgm SET SCHEMA extensions;`, closing the `extension_in_public` advisor WARN. Safe because `extensions` is already in the database's default `search_path` (`"$user", public, extensions`) and `ALTER EXTENSION ... SET SCHEMA` preserves object identity (no drop/recreate). Only real dependent: `nces_schools_name_trgm` GIN index (`gin_trgm_ops`), backing the high-school search feature's plain `.ilike()` query in `server/api/schools/high-school-search.get.ts`. Verified post-move: index `indisvalid = true`, query still returns correct results, `smart-inputs.spec.ts` High School Search suite 4/4 pass.

**Still open, not fixable via available tooling:** `auth_leaked_password_protection` WARN — this is a GoTrue/Auth config setting (HaveIBeenPwned check on signup/password-change), not SQL, and no MCP tool exposes Auth config changes. Needs manual toggle: Supabase Dashboard → Authentication → Sign In / Providers → Password Security → "Leaked password protection."
