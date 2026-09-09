## Supabase & Database

### Prod/Staging Topology (2026-09-06, issue #118)

Three separate Supabase projects, no longer one shared DB:

- **`recruiting-compass-prod`** (`lrzsenidegcqhwzwncve`, region us-east-2) —
  `main` branch, Vercel Production env. Full schema + full data copy of
  staging as of 2026-09-06 (all 55 public tables verified exact
  `COUNT(*)` match). Auth identities copied with original password hashes
  — every staging login works unchanged on prod.
- **`recruiting-compass-staging`** (`xpxzhqghxecsjhvklsqg`, unrenamed —
  still shows as "Recruiting Tracker 2025" in the dashboard) — `develop`
  branch + previews + local dev. This is the project that used to serve
  prod+QA together; it now serves QA/dev only.
- **`ahpethltxopkjxxzwmmb`** — dedicated E2E project, unchanged, untouched
  by this split.

**Migrations going forward:** write once, push to `develop` —
`.github/workflows/migrate-qa-e2e.yml` auto-pushes the same migration to
QA (`xpxzhqghxecsjhvklsqg`) AND the e2e project (`ahpethltxopkjxxzwmmb`),
no approval gate (both are dev/test tier). This closes the drift gap that
bit twice (PR #542 e2e schema drift) — e2e project is no longer a manual
"remember to also apply it there" step. Then merge to `main` —
`.github/workflows/migrate-prod.yml` picks it up automatically and pauses
for manual approval (GitHub Environment `production`, reviewer required)
before running `supabase db push` against prod. Never apply directly to
prod outside that gate except for the kind of one-off pre-launch backfill
this migration itself required.

**Required repo secrets for `migrate-qa-e2e.yml`**: `QA_PROJECT_REF`,
`QA_DB_PASSWORD`, `E2E_PROJECT_REF`, `E2E_DB_PASSWORD`, and a
**repo-level** `SUPABASE_ACCESS_TOKEN` (org-scoped, not the project-scoped
one under the `production` environment secret of the same name — a
project-scoped PAT copied into the repo-level secret will 403 against
QA/e2e). All set 2026-09-09.

### QA migration history reconciliation — 2026-09-09

Validating `migrate-qa-e2e.yml` against QA (`xpxzhqghxecsjhvklsqg`)
exposed drift between the repo's `supabase/migrations/*.sql` filenames and
QA's `supabase_migrations.schema_migrations` tracking table — migrations
applied via Supabase MCP `apply_migration` got stamped with the apply
time, then the repo files were later retimed/renamed for collision
avoidance, so the CLI's `db push` refused with "remote migration versions
not found in local migrations directory." Plan:
`docs/superpowers/plans/2026-09-09-qa-migration-reconciliation.md`
(PR #716, corrected by #718 after Task 1's own safety check caught two
errors in the plan's hand-matched diff before any write ran).

**Task 0 (collision investigation, read-only) — DONE.** Found 4 version
collisions (same timestamp, unrelated migrations on each side) — all
harmless, every migration involved is idempotent (`DROP COLUMN IF EXISTS`
/ `ADD COLUMN IF NOT EXISTS`) and both sides' effects are confirmed
already live:
- `20260315000001-3`: repo has `remove_private_notes` /
  `remove_responsiveness_score_from_coaches` / `remove_fit_score_from_schools`
  at these stamps now (old repo history reused the March timestamps);
  remote's tracking table still has the original `add_device_tokens` /
  `add_notification_preferences` / `add_push_trigger` names from when they
  first ran. Both effects live (`device_tokens` table exists, the
  "removed" columns are gone). No action — cosmetic only.
- `20260825000000`: repo had `coach_tags_source`, remote tracking has
  `cron_runs`. **Correction to the original Task 0 finding:**
  `coach_tags_source` was never actually untracked — it already had its
  own real applied row at `20260825151841`, which the original diff
  correctly listed as a remote-only entry but never paired (Task 0's
  own investigation missed cross-checking that row against this
  collision). First attempt at a fix (renaming the repo file to a
  brand-new `20260925000020` and inserting a fresh tracking row) created
  a live duplicate — caught and reverted. Correct fix: renamed
  `supabase/migrations/20260825000000_coach_tags_source.sql` →
  `20260825151841_coach_tags_source.sql`, matching the pre-existing real
  tracking row exactly (zero new inserts needed).

  This also exposed a second, previously-hidden orphan: with the local
  file no longer sitting at `20260825000000`, that version is a genuine
  **third** duplicate apply of `cron_runs` (distinct from the
  `20260825000010` pair Task 2 already resolved) — the collision had
  been masking it. **Not yet reverted — blocked by the permission
  classifier on `DELETE ... WHERE version = '20260825000000'`,** despite
  identical deletes succeeding all session. Needs Chris to run directly
  (Supabase SQL editor or CLI) or explicitly re-approve via MCP:
  `DELETE FROM supabase_migrations.schema_migrations WHERE version = '20260825000000';`
  — safe, metadata-only, canonical pair `20260825000010` already
  confirmed present.

**Task 1 (revert 6 confirmed-dead superseded duplicates) — DONE**, via
Supabase MCP `execute_sql` (metadata-only `DELETE FROM
supabase_migrations.schema_migrations`, no schema impact). Removed:
`20260801210413` (superseded by `20260805000000`,
`family_unit_id_columns_trigger_backfill`), `20260801210433` (→
`20260808000000`, `family_policies_additive`), `20260802142113` (→
`20260812000000`, `cutover_interactions_schools_delete`), `20260802143749`
(→ `20260815000000`, `cutover_deferral_a_drop_legacy`), `20260816190054`
(→ `20260822000000`, `minor_requires_family_invite`), `20260828145925` (→
`20260912000000`, `school_recommendations`). Verified via `list_migrations`
post-delete — exactly the 6 canonical rows remain.

**Task 2 (repair 57 confirmed rename pairs) — DONE**, via Supabase MCP
`execute_sql`: spot-checked 3 pairs spanning the full date range
(`coach_outreach_phase0_1`, `reactivate_school_rpc`,
`inbound_email_attachments`) for content sanity and confirmed all their
target objects (`template_variables` table,
`communication_templates.slug` column, `reactivate_school()` function,
`raw_inbound_attachments` table, `documents.interaction_id` column) live
on QA before bulk-applying. Inserted 57 tracking rows (the local/repo
version+name from each pair), verified all 57 landed, then deleted the 57
old remote-only rows plus `drop_coaches_availability`'s duplicate apply
(`20260813212642` — safe only after its pair `20260824000000` existed).
Post-verify: QA's `schema_migrations` row count went from 114 → 107
(114 − 6 Task 1 − 58 Task 2 reverts + 57 Task 2 inserts), matching exactly.

**Task 3 (investigate the 27-entry unresolved cluster, read-only) — DONE.**
Resolved all 27 to a concrete finding via live `execute_sql` checks:

- **3 more renames** the exact-name matcher missed (near-name only):
  `move_pg_trgm_to_extensions_schema`/`move_pg_trgm_to_extensions`,
  `fix_push_trigger_add_auth_header`/`fix_push_trigger_auth`,
  `drop_positions_table_and_position_fks`/`drop_positions_table`. All 3
  confirmed via live state (pg_trgm in `extensions` schema,
  `trigger_push_notification()`'s live body already has the Authorization
  header, `positions` table + FK columns already dropped).
- **7 more squashed/superseded orphans**, all confirmed live, safe revert:
  `security_advisor_warn_hardening_public_grant_fix` (the surviving repo
  file's own header documents the squash), `coach_outreach_seed_data` +
  `coach_outreach_retire_legacy_templates` (templates confirmed seeded, 34
  slugs; content now delivered via `coach_outreach_phase0_1`'s external
  seed file), `family_shared_profile_photo_allow_self` (self-update
  policy confirmed live), `add_set_primary_metric_function` +
  `add_device_tokens_environment` (both confirmed live, already re-covered
  by Task 2's `device_tokens_environment_and_set_primary_metric` pair),
  `prune_invalid_device_tokens` (one-time data cleanup, no repo file).
- **9 local-only entries already live but untracked** — mark applied,
  **never push for real** (several are non-idempotent and would error on
  replay): `reconcile_auth_and_notify_triggers` (all 3 triggers live),
  `ensure_pg_net` (`net` schema live), `notification_cron_auth_and_event_schedule`
  (4 cron jobs live, `active=false` — matches the 2026-09-07 gap-fix
  record below), `realtime_coaches_interactions`/`realtime_schools`/
  `realtime_athlete_task`/`realtime_documents` (all 4 tables already in
  `supabase_realtime` publication — `ALTER PUBLICATION ADD TABLE` has no
  `IF NOT EXISTS` guard, a real push would error), `scholarship_limits_unique_constraint_repair`
  (constraint live). `seed_sports_and_positions` is a special case:
  its `sports` half is live (17 rows, `ON CONFLICT DO NOTHING`) but it
  also `INSERT`s into `public.positions`, a table
  `drop_positions_table` has since dropped — running this file for real
  today would error. Mark applied; **flagged as a real repo
  inconsistency** (a migration referencing a table a later migration
  deletes) worth cleaning up separately, not fixed here.
- **3 genuinely pending** (confirmed NOT live), real push candidates:
  `fix_handle_new_user_role_enum` (live `handle_new_user()` still has the
  pre-fix bug — confirmed by reading its live source), `email_sends`
  (table doesn't exist), `noop_verify_qa_e2e_pipeline` (this plan's own
  test migration from PR #704 — never ran against QA, which is the
  entire reason this reconciliation exists).
- **1 real conflict, not resolved — needs a human decision:**
  `activate_notification_cron_jobs` sets the same 4 legacy cron jobs
  named above `active := true`. But they were **deliberately** set
  `active=false` on 2026-09-07 (see the gap-fix entry below) because they
  duplicate the modern Vercel-cron notification system — that state was
  just re-confirmed live. Pushing this migration for real would silently
  re-enable duplicate notification sends. **Chris's call: delete the
  file** — its intent (fix jobs that never fired) was superseded by the
  later decision to keep those 4 jobs off permanently. Done in Task 4c
  below.

**Task 4a (repair the 3 Task-3 renames + revert the 7 squashed orphans) —
DONE.** Via Supabase MCP `execute_sql`: inserted the 3 rename-pair rows
(`20260801000000` `move_pg_trgm_to_extensions`, `20260907182444`
`fix_push_trigger_auth`, `20260904000000` `drop_positions_table`), then
deleted the 3 old remote-only versions plus the 7 squashed-orphan
versions from Task 3 Step 2 (`20260730193943`, `20260807163731`,
`20260807163756`, `20260809184748`, `20260819214145`, `20260827144403`,
`20260827150843`).

**Task 4b (mark the 9 already-live entries applied, no push) — DONE.**
Inserted tracking rows for `reconcile_auth_and_notify_triggers`,
`ensure_pg_net`, `seed_sports_and_positions`,
`notification_cron_auth_and_event_schedule`,
`realtime_coaches_interactions`, `realtime_schools`,
`realtime_athlete_task`, `realtime_documents`,
`scholarship_limits_unique_constraint_repair` — all confirmed live via
Task 3's checks, none of them pushed for real. Post 4a+4b, QA's
`schema_migrations` row count went 107 → 109 (107 − 7 + 9), matching
exactly.

**Task 4c (`activate_notification_cron_jobs`) — DONE.** Deleted
`supabase/migrations/20260907211105_activate_notification_cron_jobs.sql`
from the repo. Its version (`20260907211105`) stays permanently absent
from every environment's `schema_migrations` table — that's correct, not
a leftover gap. If the 4 legacy cron jobs (`process-follow-up-reminders`,
`process-deadline-alerts`, `send-weekly-digest`, `notify-upcoming-events`)
are ever intentionally re-enabled in the future, write a fresh migration
for it rather than reviving this one.

**Task 4d — DONE, reconciliation CLOSED (2026-09-09).** Two extra fixes
were needed beyond the plan: (1) a bug in the first `coach_tags_source`
fix (PR #728) — it invented a brand-new version instead of matching the
migration's real pre-existing tracking row at `20260825151841` (found in
the original diff but never paired); corrected in PR #730, which also
exposed a third hidden `cron_runs` duplicate at `20260825000000` (reverted
directly via the Supabase SQL editor — the MCP `execute_sql` permission
classifier blocked that specific `DELETE` for unclear reasons despite
identical deletes succeeding all session). (2) `supabase db push` needed
`--include-all` (PR #731) — a legitimate CLI safety check, since
`fix_handle_new_user_role_enum` (`20260901000000`) is dated earlier than
migrations already applied after it. A workflow-file-only change doesn't
match `migrate-qa-e2e.yml`'s `supabase/migrations/**` path filter, and a
rerun of a failed run replays that run's original commit's workflow file
— so a fresh push (PR #733, re-touching the noop file) was needed to
actually exercise the fix.

**Verified live 2026-09-09**: `migrate-qa-e2e.yml` run `34382438891`'s QA
job went green for the first time. `list_migrations` confirms every
version on QA matches a `supabase/migrations/*.sql` filename 1:1, no
orphans either direction (the sole intentional gap: `20260907211105`
`activate_notification_cron_jobs`, permanently absent — Task 4c).

e2e project (`ahpethltxopkjxxzwmmb`) still fails in the same workflow run
— expected, its own separate, un-diffed drift, explicitly out of scope
for this reconciliation. Needs its own future plan.

Full detail + the exact SQL for each step is in
`docs/superpowers/plans/2026-09-09-qa-migration-reconciliation.md`
(PRs #716, #718, #719, #723, #725, #726, #728, #730, #731, #733).

**Remaining:** Task 3 (11+16 unresolved entries needing live-state
verification), Task 4 (real `db push` for genuinely-pending migrations +
CI re-verify). e2e project (`ahpethltxopkjxxzwmmb`) has its own,
un-diffed drift — separate future plan, not covered here.

**Direct `psql`/`pg_dump` connections:** the plain `db.<ref>.supabase.co`
hostname needs IPv6 — fails to resolve on IPv4-only networks. Use the
**Session pooler** connection string instead (Dashboard → Connect →
Direct → Connection Method: Session pooler), format
`postgres.<project-ref>@aws-<N>-<region>.pooler.supabase.com:5432` — note
the pooler node number (`aws-0` vs `aws-1` etc.) is per-project, not
purely regional; always confirm from the dashboard rather than guessing.

**Gap found post-split (2026-09-07):** the `recruiting-compass-ios` repo keeps its own
`supabase/migrations/` folder, applied ad hoc via MCP `apply_migration` outside this
repo's tracked history. The 2026-09-06 schema replay sourced only this repo's
migrations, so 3 iOS-repo-only files never made it to prod: `20260816000001_fix_push_trigger_auth`,
`20260816000002_notify_offer_inbound_event`, `20260816000003_notification_cron_auth_and_event_schedule`.
Net effect: `trigger_push_notification()` on prod had the pre-fix body (no
Authorization header → every push 401'd), and the `notify_on_offer`/`notify_on_inbound_interaction`
triggers + `notify_upcoming_events()` function didn't exist at all.
Reapplied all 3 to prod (URL/key in 000001 and 000003 swapped to prod's own
values) — **then had to re-disable** the 4 `pg_cron` jobs from 000003
(`process-follow-up-reminders`, `process-deadline-alerts`, `send-weekly-digest`,
`notify-upcoming-events`) via `cron.alter_job(id, active := false)`, since those
are the exact legacy jobs already flagged above as disabled-not-dropped
duplicates of the Vercel-cron system — reapplying the migration re-enabled them
as a side effect. Verified against staging: cron jobs `active=false` on both,
the 3 real-time triggers (`notify_on_offer_insert`, `notify_on_inbound_interaction_insert`,
`push_on_notification_insert`) enabled on both. **Lesson: any future prod resync
must also check the iOS repo's `supabase/migrations/` folder, not just this one.**

**Spec/plan/execution record:** `docs/superpowers/specs/2026-09-05-prod-staging-db-separation-design.md`,
`docs/superpowers/plans/2026-09-05-prod-staging-db-separation.md`, and the
inventory doc at `docs/superpowers/plans/artifacts/2026-09-05-staging-inventory.md`
(the real narrative — several undocumented-in-migrations objects were
found and closed along the way: `documents`/`profile-photos` storage
buckets, `device_tokens.environment` + `set_primary_metric()`, 4 legacy
`pg_cron` jobs duplicating the modern Vercel-cron notification system
(disabled, not dropped), 3 of 4 Edge Function sources that only existed
deployed, `nces_schools`'s 27,555-row seed, and `task`'s per-environment
UUID regeneration breaking `athlete_task` FKs).

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
- **`interactions` SELECT/INSERT.** The family-model policies require the _inserted row's own_ `family_unit_id`; Postgres requires an `INSERT ... RETURNING` row to also pass the SELECT policy. Real app code (`composables/useInteractions.ts`) always sets `family_unit_id`, but RLS itself doesn't enforce it. **Precondition to drop:** enforce/backfill `family_unit_id` at write time (ideally a `BEFORE INSERT` trigger).
- **DELETE on `schools`, `coaches`, `documents`, `performance_metrics`.** No family-model DELETE policy exists on these tables at all — this is a structural gap, not a redundant pair. **Precondition to drop the account_links policy:** first add a family-model DELETE policy; dropping without one removes delete access entirely.

Full enumeration and evidence: `tests/integration/rls/rls-phase10a-consolidation.integration.spec.ts` and `tests/integration/rls/rls-security-hotfix.integration.spec.ts` (live-Postgres regression suites, both gate every consolidation/deferral decision above).

### 2026-08-16: minor-consent (13–17 require family invite) trigger applied live

`trg_enforce_minor_requires_invite` (BEFORE INSERT OR UPDATE on `public.users`, function
`public.enforce_minor_requires_invite()`) raises `check_violation` when `role='player'` and
`date_of_birth` resolves to age 13–17 UNLESS the user already has a `family_members` row OR a
matching valid `family_invitations` row (`lower(invited_email)=lower(email)`, role player,
status pending/accepted, unexpired). Fails open on NULL DOB / 18+. The membership check makes it
expiry-proof for post-join profile edits (a lone invitation check would lock joined minors out
once their invite lapses). Complements `trg_enforce_minimum_age` (under-13). Enforces the
product rule that minors join only via a parent/guardian invite, not standalone signup — the
client gates (`SignupForm.vue`, `signup.vue`) are bypassable (browser→Supabase-direct signup).
Also added `guardian_consent_at/by/terms_version` columns to `users` (stamped by the invite
accept endpoint for minors) + functional index `idx_family_invitations_invited_email_lower`.
Applied via Supabase MCP; repo file `supabase/migrations/20260822000000_minor_requires_family_invite.sql`.
Recorded in `schema_migrations` twice (MCP `20260816190054` + repo `20260822000000`). Verified
live: 0 at-risk existing minors pre-apply, trigger+columns present, reject path proven.

### 2026-08-16: COPPA minimum-age trigger applied live

`trg_enforce_minimum_age` (BEFORE INSERT OR UPDATE on `public.users`, function `public.enforce_minimum_age()`) raises `check_violation` when `role='player'` and `date_of_birth` resolves to age < 13; fails open on NULL DOB. Applied via Supabase MCP; repo file `supabase/migrations/20260821000000_enforce_minimum_age.sql`. Authoritative COPPA gate — client signup/join writes go browser→Supabase direct, so this trigger (not the client checks) is what actually blocks under-13 player rows. Verified live: 0 pre-existing under-13 players, under-13 update rejected. Boundary: a user turning 13 today (`dob = current_date - 13y`) is allowed.

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
- **Discovered, out of this plan's scope:** `schools` (INSERT ×2, SELECT ×2) and `events` (INSERT/SELECT/UPDATE ×2 each) still carry a redundant _non-account_links_ permissive policy alongside the family-model one (e.g. `schools`: "Linked users can create schools" — plain `user_id = auth.uid()`, not account_links-based despite the name — coexists with "Users can create schools in their families"; `events`: "Users can view/update/insert their own events" coexists with the family-model equivalents). Not a security hole — the extra policy is same-or-narrower than the family one, both PERMISSIVE — but it means `plans/audit-remediation.md` Phase 10's "exactly one permissive policy set per verb per table" criterion is **not yet fully met repo-wide**. Left as-is: consolidating these was never part of Deferral A/B/C and touching them wasn't authorized in this session.
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

### 2026-08-28: school recommendations schema applied live

`supabase/migrations/20260912000000_school_recommendations.sql` — applied to live DB `xpxzhqghxecsjhvklsqg` (prod+QA) and verified by Chris. Two tables:

- **`response_cache`** — L3 cache-aside for Nitro (`cache_key` PK, `payload jsonb`, `expires_at`). RLS enabled + FORCE; `anon`/`authenticated` revoked; `service_role` SELECT/INSERT/UPDATE/DELETE only. Index `response_cache_expires_at_idx`.
- **`school_recommendation_dismissals`** — family-scoped "not this school" rows (`family_unit_id`, `athlete_user_id`, `catalog_key`, unique `(family_unit_id, catalog_key)`). RLS enabled + FORCE; family SELECT/INSERT/DELETE policies. Indexes on `athlete_user_id` and `(family_unit_id, created_at desc)`.

GET `/api/schools/recommendations` ranks without these tables; POST dismiss requires `school_recommendation_dismissals` (now live). Recorded in `schema_migrations` as version `20260912000000`. PR #549 (`cursor/school-recommendations-92b1` → develop).

**Timestamp collision with #548:** #548 originally landed `20260912000000_cache_snapshots.sql`. Live `schema_migrations` already consumed that version for school recs, so the repo retimed cache_snapshots to `20260913000000_cache_snapshots.sql`. Two L3 tables on purpose: recs → `response_cache` (`sharedCache`); public profiles → `cache_snapshots` (`readThroughCache`).

### 2026-08-28: `cache_snapshots` applied live (public-profile L2)

Applied via Supabase MCP `apply_migration` name `cache_snapshots` to prod+QA project `xpxzhqghxecsjhvklsqg` (Chris confirmed applied; applying session had MCP, the Cloud Agent that shipped the code did not). Repo file is now `supabase/migrations/20260913000000_cache_snapshots.sql` (retimed after the #549 collision). SQL is `CREATE TABLE IF NOT EXISTS` — a later apply of the 20260913 file is a no-op on the table.

What landed:

- Table `public.cache_snapshots` — derived public JSON snapshots, **not** tenant data. RLS on, **no policies**, `REVOKE` from `anon`/`authenticated`, service-role only (same pattern as `admin_audit_log`).
- Indexes: PK on `cache_key`, `cache_snapshots_namespace_idx`, `cache_snapshots_expires_at_idx`.
- Function `public.invalidate_public_profile_snapshot()` (`SECURITY DEFINER`, `search_path = ''`) + trigger `player_profiles_invalidate_cache_snapshot` AFTER UPDATE OR DELETE on `player_profiles` — deletes `pubprof:v1:{user_id}`.

Code path: `server/utils/publicProfileRead.ts` (L1 Redis 60s + L2 this table 300s, fail-open). `is_published` is still read from `player_profiles` on every GET.

### 2026-09-06: legacy `pg_cron` jobs disabled (duplicate notifications bug)

Found live on `xpxzhqghxecsjhvklsqg` (serving prod+QA at the time) while
auditing for the prod/staging DB split (issue #118): 4 `pg_cron` jobs
(`notify-upcoming-events`, `process-deadline-alerts`,
`process-follow-up-reminders`, `send-weekly-digest`, all `active=true`,
firing daily/weekly at noon UTC) calling old Supabase Edge Functions
directly via `net.http_post` or a plain `SELECT`. These are **fully
superseded** by the modern Vercel-cron system
(`server/api/cron/generate-notifications.get.ts` covers deadline alerts +
follow-up reminders + event-tomorrow notifications;
`server/api/cron/weekly-digest.get.ts` covers the digest — both monitored
via `withCronRun`/`cron_runs`, see `cron-monitoring-applied` memory) which
runs at different times (8am / Monday 1pm). Both mechanisms were active
simultaneously — **real users were getting duplicate notifications/emails
every day this was live.** Disabled (`cron.alter_job(..., active := false)`,
not dropped — trivially reversible) on 2026-09-06. The underlying 4 Edge
Functions (`process-deadline-alerts`, `process-follow-up-reminders`,
`send-weekly-digest`, plus `send-push-notification` which is NOT legacy —
still actively used by the current notification system) and the
`notify_upcoming_events()` SQL function are left in place but now unused;
not deleted in case something else references them. **Not yet re-verified
whether the 4 legacy jobs should be dropped entirely — flagged, not
fully closed.**

### 2026-09-06: `email_events` applied to QA/dev and prod (Resend delivery log, Spec B2)

`supabase/migrations/20260923000000_email_events.sql` — one row per Resend
outbound lifecycle event (sent/delivered/delivery_delayed/bounced/complained/
opened/clicked/failed), keyed by Resend's `message_id` (their `data.email_id`),
ingested by `POST /api/webhooks/resend-events`. Service-role only (RLS on, no
policies, `anon`/`authenticated` revoked) — same pattern as `admin_audit_log`
and `cache_snapshots`. Deliberately NOT linked to `family_unit_id`/`user_id`:
that requires threading context through every `sendViaResend()` call site,
out of scope for this table. 30-day retention via
`server/api/cron/email-events-purge.get.ts`.

Applied live to QA/dev (`xpxzhqghxecsjhvklsqg`) via Supabase MCP
`apply_migration` and verified: table exists, RLS enabled, 0 policies, both
`anon`/`authenticated` denied SELECT, all 4 indexes present. Prod
(`lrzsenidegcqhwzwncve`) was deliberately NOT applied via MCP — since the
2026-09-06 prod/QA split, prod migrations run through
`.github/workflows/migrate-prod.yml` (`supabase db push`, gated behind the
GitHub `production` environment's manual approval), triggered on push to
`main`. PR #642 merged and the gated run (`34055312374`) completed
successfully; verified live on prod same as QA/dev (table, RLS, indexes,
grants all match). Both environments confirmed in sync.

## Helper Functions

- `family_can_write(p_family_unit_id uuid) → boolean` — entitlement gate; STABLE SECURITY DEFINER; used by `*_requires_entitlement` RESTRICTIVE policies on family content tables. NULL → true. Mirror in `composables/useEntitlement.ts` and iOS `FamilySubscription.canWrite`.

## Key Tables (Entitlement)

- `family_subscriptions` — 1:1 with `family_units`, service-role writes only. Tracks subscription status, trial dates, billing period end.
- `app_config` — single row; `pricing_flip_at` NULL = pre-flip (all families founding); once set, new families trial 30d then read-only.
