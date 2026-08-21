# E2E suite is RED pre-existing — finding + next steps (2026-08-21)

## TL;DR

Standing up the dedicated E2E Supabase test project (see branch
`chore/e2e-test-supabase-project`) revealed that **the Playwright E2E suite is
not green anywhere** — recent prod-side runs fail too. The ~177 failures are the
suite's true state, previously masked by prod runs that finished early / had the
gate as effectively non-blocking. Getting the suite green is a **separate,
sizable effort** and was red before any of this work.

## Evidence

- **Test project full run** (3 workers, ~40m, runs to completion):
  `145 passed / 177 failed / 153 skipped`. **Deterministic** — run 8 and run 9
  produced the same distribution (176 vs 177), so it is not a race.
- **Prod-side runs** (`e2e.yml` on `pull_request`): the last three all
  `conclusion: failure`, finishing in ~24–35m. The suite has been red on
  develop/main PRs; the gate evidently did not block merges.
- Earlier "35–41 failed" numbers on the test project were **partial** — those
  runs were cancelled at the 30m job timeout before most specs ran.

## Root symptom (needs deeper debugging)

Data-heavy specs fail in `beforeEach`, e.g. `dashboard-8-1.spec.ts`:

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
waiting for getByRole('heading', { name: 'Dashboard', level: 1 })
Error: element(s) not found
```

The `/dashboard` page never renders its H1 for the logged-in player. Failing
clusters: `dashboard-8-1/8-3`, `school-detail-*`, `profile-edit-restrictions`,
`player-details-autosave`, `documents-list`, `athlete-interactions`,
`family-units`, `family-member-removal`, `auth`, `session-timeout`. ~145 other
specs (auth/nav/static) pass with the same storageState, so the session is
broadly valid — the failure is specific to these pages rendering.

## Hypotheses ruled out this session

- **Session-revocation cascade** — plausible (global-scope `signOut` revoked the
  shared player/admin session). Fixed it anyway (see below), but the failure
  count barely moved (176 → 177), so it is **not** the primary cause.
- **Thin seed data** — ruled out. player@test.com data volume matches prod
  (5 schools, 5 coaches, 0 interactions on both; only `documents` differs
  4 vs 120, and that 120 is prod debris).

## What shipped (keep regardless — all correct)

- **Dedicated test project** `recruiting-compass-e2e-test`
  (`ahpethltxopkjxxzwmmb`), schema reconciled to prod parity. CI (`e2e.yml`,
  `soak.yml`) points at `TEST_SUPABASE_*` secrets. E2E no longer writes to prod.
- **Drift captured as repo migrations** (a fresh rebuild now works):
  `admin_audit_log`, `on_auth_user_created` + notify triggers, `pg_net`,
  and a guard making the Phase-5 cutover tolerant of the dropped
  `social_media_posts` table.
- **`scope: "local"` logout** (`useAuth`, `useAuthLifecycle`) — correct product
  behavior (a plain logout should end this session, not every device) and it
  removes the cross-worker revocation as a confound.
- Global-teardown debris reaper + `family_invitations.invited_by` cascade
  (earlier in the arc; already on develop).

## Next steps to actually green the suite (separate effort)

1. **Trace one failure end-to-end.** Pull the Playwright trace/`error-context.md`
   artifact for `dashboard-8-1` AC1. Determine why `/dashboard` doesn't render:
   redirected to `/login` (session), app runtime error, or a data fetch that
   hangs the page. Log-reading was not enough — use the trace.
2. **Controlled prod-vs-test compare.** Run the identical suite/config once
   against prod to confirm whether the same ~177 fail there. If yes, this is a
   suite-quality problem, not test-project-specific.
3. **Fix by cluster.** The failures group tightly (dashboard, school-detail,
   profile, family) — likely a handful of shared root causes, not 177 unique.
4. Consider sharding (`--shard`) to cut the ~40m wall-clock once it is green.

## Open question

Whether these same specs fail on prod's full suite is **unconfirmed** — prod
runs finish faster (fewer specs reached) so we have never seen prod's full-suite
result. Step 2 above resolves it.
