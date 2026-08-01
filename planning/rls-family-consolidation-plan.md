# RLS Deferrals — Family-Model Consolidation Plan

## Context

Phase 10a (2026-07-28) consolidated family-model RLS only where proven safe (schools SELECT/INSERT/UPDATE, users SELECT, interactions UPDATE/DELETE, events). Everywhere else, legacy `account_links`-era policies remain load-bearing — **not a vulnerability today**, but pre-req work blocks the audit exit criterion (`plans/audit-remediation.md:186-191`): exactly one permissive policy set (family model) per verb per table.

Three deferrals (`claude/database.md:27-35`):
- **A**: coaches, documents, performance_metrics, social_media_posts, recommendation_letters — write paths never set `family_unit_id`; social_media_posts + recommendation_letters lack the column entirely; recommendation_letters has zero family policies.
- **B**: interactions SELECT/INSERT — app stamps `family_unit_id` (`composables/useInteractions.ts:286`) but DB doesn't enforce; PG requires `INSERT…RETURNING` rows to pass SELECT policy.
- **C**: no family-model DELETE policy on schools, coaches, documents, performance_metrics (nor social_media_posts, recommendation_letters).

**Hard constraint**: one Supabase DB (`xpxzhqghxecsjhvklsqg`) serves prod AND non-prod; every migration is a manual prod apply; E2E runs against it. Therefore: additive-first, all migrations idempotent (`DROP POLICY IF EXISTS`, re-runnable backfills), legacy drops only after soak + verification.

## Decisions (made with Chris 2026-08-01)

1. **Stamping = belt + suspenders**: app-level stamp (clear UX errors) + generic `BEFORE INSERT OR UPDATE` trigger that **silently derives** `family_unit_id` when NULL (never RAISEs — service-role writers must not break; enforcement comes from RLS `WITH CHECK` at cutover). Derivation order: `school_id → schools.family_unit_id` → `coach_id → coaches` → `document_id → documents` → `user_id → family_members` only when user in exactly one family.
2. **Add `family_unit_id` column** to social_media_posts + recommendation_letters (no join-through policies). Verified: `social_media_posts.school_id` NOT NULL, no user_id → trigger derivation fully deterministic, service-role sync endpoints need zero changes. `recommendation_letters.user_id` NOT NULL, `document_id` nullable.
3. **Interactions UPDATE/DELETE stay author-only** (`logged_by = auth.uid()`) — product decision, out of scope.
4. **Pacing: bundle Phases 1–3** (zero access change) in one push → soak days verifying non-NULL stamping in prod → Phase 4 cutover → soak → Phase 5 cutover.
5. **Fit-score endpoint fix in scope** (Phase 2): `server/api/schools/[id]/fit-score.get.ts:20-47` authz via account_links only — family-model parents 404 today.
6. **Keep**: `account_links` table + its policies + `get_linked_user_ids()` (invite flow, `athlete_task` SELECT still depend). **Deferred to separate tickets**: athlete_task family migration (no family_unit_id column on task/athlete_task), family_members missing UPDATE/DELETE policies.
7. **Keep the derivation trigger permanently** as defense-in-depth; `NOT NULL` on `family_unit_id` explicitly deferred (trigger user-fallback can legitimately leave NULL).

Note: exploration claim "E2E seeds recreate NULL family_unit_id" is **stale** — `tests/e2e/seed/seed.ts:143,162` already stamps schools + coaches. Backfills stay idempotent anyway.

## Phase 1 — Foundation: columns, trigger, backfill (DB-only, additive)

Migration `supabase/migrations/20260805000000_family_unit_id_columns_trigger_backfill.sql`:

1. `ALTER TABLE ... ADD COLUMN IF NOT EXISTS family_unit_id uuid REFERENCES public.family_units(id) ON DELETE CASCADE` on `social_media_posts`, `recommendation_letters` + `CREATE INDEX IF NOT EXISTS idx_<table>_family_unit_id`.
2. `CREATE OR REPLACE FUNCTION public.derive_family_unit_id() RETURNS trigger` — SECURITY DEFINER, `SET search_path = public, pg_temp`. Early-return if `NEW.family_unit_id IS NOT NULL`; else `r := to_jsonb(NEW)` (one function serves tables with differing columns); try `r->>'school_id'` → schools, `r->>'coach_id'` → coaches, `r->>'document_id'` → documents, then unambiguous user fallback (`min(family_unit_id::text)::uuid ... HAVING count(DISTINCT family_unit_id) = 1` — pattern from `20260727000004:16-25`); may stay NULL; RETURN NEW. `REVOKE ALL FROM PUBLIC, anon` (grant style: `20260727000000:75-77`, `20260730000000`).
3. `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER trg_<table>_derive_family_unit_id BEFORE INSERT OR UPDATE ... FOR EACH ROW` on 7 tables: coaches, documents, performance_metrics, interactions, schools, social_media_posts, recommendation_letters. (Shape: `validate_document_schools` baseline:814/:3167.)
4. Idempotent backfills (`WHERE family_unit_id IS NULL`): school-chain first (coaches/documents/interactions/social_media_posts via school_id; recommendation_letters via document_id), then unambiguous-user fallback for all.

Tests: new `tests/integration/rls/rls-family-deferrals.integration.spec.ts` modeled on `rls-phase10a-consolidation.integration.spec.ts` (live-PG, `vi.unmock`, `describe.skipIf(!hasLiveSupabase)`, RUN_ID fixtures, Family Alpha family-model-only / Family Beta negative control). Phase-1 block: service-role insert without family_unit_id → row comes back stamped.

Gate: NULL-count query per table (school-linked expect 0; record user-fallback residue); insert-probe green; full E2E green (no policy touched).
Rollback: drop 7 triggers + function; columns stay (inert).

## Phase 2 — App-level stamping (code-only)

Pattern: `composables/useSchools.ts:117-133` (guard `"Family context not loaded"` + stamp from active family; `inject("activeFamily") ?? useFamilyContext()` fallback). References: `useInteractions.ts:281-290`, `stores/offers.ts:177`, `stores/coaches.ts:320-341` (lazy-import inside store).

| File | Change |
|---|---|
| `stores/coaches.ts:232-250` | `createCoach`: stamp family_unit_id (reuse deleteCoach lazy-import pattern) |
| `composables/useDocumentsConsolidated.ts:375-392, 466-482` | `uploadDocument` + `uploadNewVersion` (override spread `...originalDoc` — inherits NULL) |
| `composables/useDocumentUpload.ts:165-176, 228-242` | stamp both insert payloads |
| `composables/usePerformanceConsolidated.ts:192-199` + `composables/usePerformance.ts:112-119` | stamp `createMetric` (both, incl. legacy duplicate) |
| `composables/useSocialMedia.ts:121-122` | stamp client insert |
| `composables/useRecommendationLetters.ts:78-82` | stamp insert |
| `server/api/social/sync.post.ts`, `sync-all.post.ts` | no functional change — comment: service-role, trigger derives from NOT NULL school_id |
| `server/api/schools/[id]/fit-score.get.ts:20-47` | extend authz: accept family membership (school's family_unit_id ∈ caller's families), keep account_links path during transition |

Tests: unit specs asserting payload contains family_unit_id + guard throws without family context; fit-score family-parent access test.
Gate: unit + E2E green; live SQL spot-check post-deploy rows non-NULL.
Rollback: revert commits.

## Phase 3 — Additive family policies

Migration `supabase/migrations/20260808000000_family_policies_additive.sql` — every statement `DROP POLICY IF EXISTS` + `CREATE POLICY`, canonical shape from baseline:3665 (`family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())`); **no legacy drops**:

- DELETE (Deferral C): schools, coaches, documents, performance_metrics.
- social_media_posts: family SELECT/INSERT/UPDATE/DELETE on new column (leave `social_media_posts_select_family` coach-join in place for now).
- recommendation_letters: family SELECT/INSERT/UPDATE/DELETE (currently zero).

Gate: integration spec — Alpha positive per verb per table, Beta negative; E2E green.
Rollback: drop new policies (legacy still covers everything).

**Ship 1–3 together** (single push + one migration apply session). **Soak** a few days: verify all new prod rows non-NULL, no Sentry/PostgREST 42501s.

## Phase 4 — Small cutover: interactions (B) + schools DELETE

Migration `supabase/migrations/20260812000000_cutover_interactions_schools_delete.sql`:
0. **WITH CHECK hardening (added by ruling 2026-08-01, Task 5 review; corrected 2026-08-01 final review):** recreate ALL family UPDATE policies (schools, coaches, documents, events, performance_metrics, social_media_posts, recommendation_letters — every baseline + Phase 3 family UPDATE policy) with explicit `WITH CHECK` matching their `USING` predicate. Per CREATE POLICY semantics, a USING-only UPDATE policy already applies USING as WITH CHECK against the post-update row, so each family policy in isolation already blocks a member moving a row's `family_unit_id` into another family — this step is documentation/consistency hardening, not the fix for a hole the family policies leave open. The actual row-move exposure today comes from legacy PERMISSIVE policies whose predicates don't reference `family_unit_id` (e.g. plain `user_id = auth.uid()` ownership checks) — PERMISSIVE policies OR together, so a legacy policy's check can independently pass a row-moving update regardless of the family policy's WITH CHECK. That exposure closes automatically when the legacy policies are dropped (this phase and Phase 5), not by this step. Still land explicit WITH CHECK before or with any legacy-policy drop, for clarity and to avoid relying on implicit USING-as-WITH-CHECK behavior going forward.
1. Re-run idempotent backfills (interactions, schools).
2. Pre-flight `DO $$ RAISE EXCEPTION` NULL-count guard (copy `20260728000000:35-67`) — aborts before drops.
3. Drops — interactions: `"Users can insert interactions"` (20260727000000:101 version), `"Users can view interactions for own and linked schools"` (baseline:4316); family SELECT (:3653) + `"Only players can create interactions"` (:3751) become sole set; Phase-1 trigger satisfies INSERT…RETURNING-passes-SELECT. Keep logged_by UPDATE/DELETE (:4173/:3914). schools: `"Users can delete own and linked schools"`, `"Users can delete own schools"`, `"Linked users can delete schools"`.

Keep exact dropped-policy definitions in a comment block inside the migration for copy-paste rollback.
Gate: Alpha interaction insert+readback (proves trigger+RETURNING), Beta denied; Alpha school delete, Beta denied; full E2E; watch Sentry a day.

## Phase 5 — Big cutover: Deferral A legacy drops

Migration `supabase/migrations/20260815000000_cutover_deferral_a_drop_legacy.sql` — same structure: backfill → guard (5 tables) → drops.

**MANDATORY first step**: reconcile drop list against live catalog — `SELECT tablename, cmd, policyname FROM pg_policies WHERE tablename IN ('coaches','documents','performance_metrics','social_media_posts','recommendation_letters') ORDER BY 1,2;` — baseline.sql may lag live. Then drop all `get_linked_user_ids()`/ownership legacy policies per table (coaches ~17 policies; documents/performance_metrics/recommendation_letters own-and-linked + own-row sets; social_media_posts school-chain set **plus** `social_media_posts_select_family` — superseded by Phase 3 direct policy). Optionally split per-table sub-migrations — each table's drop set independent.

Gate: exit-criterion audit query — exactly one permissive policy per verb per table (7 tables); full integration spec all verbs; full E2E; social sync smoke-run (service role, must be unaffected).
Rollback: restore from definitions comment block, per table.

## Phase 6 — Audit + docs (no schema change)

- Re-run exit-criterion query; record in `claude/database.md` (mark deferral section :27-35 resolved) + `plans/audit-remediation.md`.
- File deferred tickets: athlete_task family migration; family_members UPDATE/DELETE policies; future NOT NULL consideration.
- Copy this plan to `planning/` per repo convention.

## Verification summary

- Per-phase gates above; test harness = live-Postgres Vitest (`tests/integration/rls/*`), template `rls-phase10a-consolidation.integration.spec.ts`.
- `npm run type-check`, `npm run lint`, `npm test` per code phase; full `npm run test:e2e` before + after each cutover.
- Migration applies are manual (`npx supabase db push` / dashboard) — Chris confirms each apply per workflow rule.

## Unresolved questions

1. Ambiguous multi-family owners: user-fallback leaves their legacy rows NULL → invisible post-cutover. Phase 4/5 guards surface counts; if >0, manual triage before dropping (decide then).
2. `performance_metrics` has no school_id — user-fallback only; guard query will tell if any multi-family users own metrics.
3. Live pg_policies inventory may differ from baseline — Phase 5 reconciliation step is mandatory, drop lists finalized then.
