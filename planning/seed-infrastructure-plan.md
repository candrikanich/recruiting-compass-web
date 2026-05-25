# Seed Infrastructure Plan

**Date:** 2026-05-25
**Scope:** Unlock ~110 conditional-data-guard skips across 9 spec buckets
**Status:** Draft / not started
**Owner:** TBD

---

## Context

Full E2E suite currently runs 362 pass / 126 skip / 1 flake. Of the 126 skips, **~110 are conditional-data-guard skips** — tests that `test.skip()` when their fixture data is absent, rather than failing. They run only if the seed harness populates the right entities for the test's family unit / user.

Existing harness:

- `tests/e2e/seed/seed.ts` — seeds 5 schools + 5 coaches against `player@test.com`
- `tests/e2e/seed/reset.ts` — cascading delete of test data + accounts
- `tests/e2e/seed/helpers/supabase-admin.ts` — service-role client
- `tests/e2e/global-setup.ts` — runs seed only when `E2E_SEED=true`
- Default behaviour skips the full seed; storage state still captured for auth.

Best existing pattern: `tests/e2e/family-invite-flow.spec.ts` seeds its own rows in `test.beforeAll` and cleans up in `test.afterAll`, gating individual tests on a local `seedReady` flag. This is preferable to a monolithic global seed because:

- Each spec owns its fixtures → no cross-test coupling
- Cleanup is symmetric and isolated → no leakage between specs
- Failure to seed gates only the affected tests, not the whole suite
- No CI env-var dance required

**Recommendation:** Adopt the per-spec `beforeAll` seed pattern. Keep `seed.ts` for one-off local exploration. Do not promote `E2E_SEED=true` to CI default.

---

## Bucket-by-Bucket Plan

### 1. `notifications.spec.ts` (~9 tests)

**File:** `tests/e2e/notifications.spec.ts`
**Lines:** 87, 125, 149, 167, 178, 190, 221, 243, 276
**Tables:** `notifications`
**Required state for `player@test.com`:**

- ≥1 unread notification of each type tested:
  - `school_added`, `coach_contact`, `interaction_logged`, `task_due`, `family_invite_accepted`
- ≥1 already-read notification (for read/unread filter tests)
- ≥1 actionable notification with `action_url` populated (for click-through tests)

**Seed shape:**

```ts
{ user_id, type, title, body, action_url?, read_at: null | timestamp, created_at }
```

**Cleanup:** Delete by `user_id = player.id AND created_at >= seed_run_started_at`.

**Effort:** S (1–2h). All notifications scoped to one user.

---

### 2. `family-invite-flow.spec.ts` (~10 tests)

**Status:** Already implements per-spec seed. Skips fire only if Supabase admin auth fails mid-seed.

**Action:** No new seed work. Investigate why `seedReady` ever stays `false` (likely service-role env not loaded on CI). Add a clearer failure mode (`test.fail.if(!seedReady)` with the actual error message).

**Effort:** XS (15m). Diagnose + improve error visibility.

---

### 3. `coaching-philosophy.spec.ts` (~10 tests)

**File:** `tests/e2e/coaching-philosophy.spec.ts`
**Lines:** 50, 74, 106, 147, 193, 239, 287, 336, 379, 425
**Tables:** `schools`, `coaches` (existing seed) + `coaching_philosophies` (if separate table)

**Required state:**

- Schools with diverse `coaching_style` and `recruiting_approach` strings already present in current `seed.ts`. Tests likely skip because they assert against specific *combinations* (e.g. "shows X philosophy when filtered by D1 + SEC").
- **Action:** Read each skip's `test.skip()` predicate, derive the missing combination, add a `schools` row that satisfies it.

**Effort:** S–M (2–4h). Likely just 2–3 extra school rows with targeted attribute combos.

---

### 4. `admin/bulk-delete-users.spec.ts` (~9 tests)

**File:** `tests/e2e/admin/bulk-delete-users.spec.ts`
**Lines:** 26, 44, 75, 95, 112, 133, 149, 174, 196, 213
**Tables:** `users` (Supabase auth)
**Gate:** `test.skip(userCount < N, ...)` where N varies (1, 2)

**Required state:**

- ≥5 deletable, non-test users in the system that the admin account can see (must not collide with `player@test.com`, `parent@test.com`, etc.).

**Seed shape:**

```ts
// Create via supabase.auth.admin.createUser with emails like:
//   e2e-deletable-001@test.com … e2e-deletable-005@test.com
// Mark them in user_metadata: { e2e_deletable: true }
```

**Cleanup:** Delete by `user_metadata.e2e_deletable === true` (idempotent — re-runnable).

**Risk:** Admin UI may show seeded users to humans browsing local Supabase. Mitigate by prefixing email + metadata flag.

**Effort:** M (2–3h). Need cleanup hooks that survive flaky cancellations.

---

### 5. `user-stories/dashboard-8-1.spec.ts:292` (1 test)

**Test:** "Dashboard displays correct stat counts"
**Required state:** Known-good fixture counts for schools (5), coaches (5), interactions (N), tasks (M) tied to `player@test.com`.

**Action:** Seed a fixed-count fixture in `beforeAll` of this single test. Assert equality against the count, not `>= 0`.

**Effort:** XS (30m).

---

### 6. `user-stories/dashboard-8-3.spec.ts` (~4 tests)

**Lines:** 19, 34, 50, 63 — all activity-feed scenarios
**Tables:** `interactions`, `events`

**Required state:**

- ≥10 interactions for `player@test.com` family unit, spread across the last 30 days
- Mix of types (`email`, `call`, `visit`, `text`) to exercise icon rendering
- Mix of relative timestamps (today, yesterday, last week) to exercise time-ago formatting

**Effort:** S (1–2h).

---

### 7. `parent-tasks.spec.ts` (~4 tests)

**Lines:** 46, 61, 74, 82
**Tables:** `athlete_tasks`

**Required state:**

- ≥3 tasks assigned to the player in the parent's family unit
- Mix of statuses (`pending`, `completed`) and due dates (past, future)

**Effort:** S (1h).

---

### 8. `user-story-6-1.spec.ts` (~9 remaining tests)

**Status:** 1 un-skipped in 2026-05-22 triage. Rest are timeline-dependent.

**Required state:** Same as dashboard-8-3 (interactions over time) but with story-specific filter combinations.

**Effort:** S (overlaps with bucket 6). Implement bucket 6 first; many of these will light up automatically.

---

### 9. `smart-inputs.spec.ts` (~15 tests — describe.skip, 3 suites)

**Status:** **Not a seed problem alone.** All 3 describes were un-skipped 2026-05-25; they now run and pass under the existing 5-school seed. Real blockers (per triage 2026-05-22):

- High-school search: needs `nces_schools` table populated (~27k NCES public-school rows). **Already in DB per spec header comment** ("Uses the live nces_schools table (~27k rows)").
- Address autocomplete: needs `NUXT_RADAR_API_KEY` env var. **External — not seedable.**
- Social handle normalization: client-side only — no seed needed.

**Action:** Out of scope for this plan. Confirm `NUXT_RADAR_API_KEY` is set in CI; otherwise the address tests will continue to silently fall back to their "input value preserved" assertion (which still passes).

**Effort:** 0 (covered by existing infra).

---

## Cross-Cutting Concerns

### Idempotency

Every `beforeAll` seed must be re-runnable without colliding with prior runs:

1. **Scope cleanup** to data created by this seed run (track inserted IDs, delete on `afterAll`).
2. **Use deterministic but namespaced tokens/emails** (e.g. `e2e-revoke@example.com`) — already the existing pattern.
3. **Tolerate partial cleanup failures** — log warnings, don't crash.

### Parallel-worker safety

Playwright runs 4 workers by default. If multiple specs all seed against `player@test.com`'s family unit at once, they will trample each other.

**Mitigations:**

- Prefer namespacing data by a per-spec prefix (`spec.notif.*`, `spec.tasks.*`) so each spec only deletes its own rows.
- Avoid bulk `DELETE FROM x WHERE user_id = player.id` in any `afterAll` — that nukes a sibling spec's fixtures mid-run.
- Where strict isolation is required, give the spec its own seeded test user (e.g. `e2e-tasks@test.com`) instead of sharing `player@test.com`. New users are cheap to create.

### CI wiring

No new env vars required. Per-spec seed runs unconditionally when the spec runs; `SUPABASE_SERVICE_ROLE_KEY` is already set in `.env.local` and in Vercel project env.

Add a `tests/e2e/seed/README.md` documenting the per-spec pattern so future-Claude doesn't reinvent it.

### Failure mode visibility

Today `seedReady = false` shows up as silent skips. Improve by:

```ts
test.beforeAll(async () => {
  try {
    // ...seed
    seedReady = true;
  } catch (e) {
    seedReadyError = e instanceof Error ? e.message : String(e);
    console.warn("⚠️  Seed failed:", seedReadyError);
  }
});

test.skip(!seedReady, () => `Seed unavailable: ${seedReadyError ?? "unknown"}`);
```

---

## Execution Order (recommended)

Ordered by ROI (test-count unlocked per hour of effort):

1. **family-invite-flow** (XS, 10 tests) — diagnose-only, no new code
2. **dashboard-8-3 + user-story-6-1** (S+S, ~13 tests) — shared interaction-timeline fixture
3. **notifications** (S, 9 tests)
4. **coaching-philosophy** (S–M, 10 tests)
5. **parent-tasks** (S, 4 tests)
6. **bulk-delete-users** (M, 9 tests)
7. **dashboard-8-1** (XS, 1 test)

Total: ~12–18 engineer-hours to retire ~56 of the ~110 skips in the high-confidence buckets. The remaining ~50 are smart-inputs (mostly handled) and miscellaneous one-offs.

---

## Acceptance Criteria

- [ ] After plan completion, full E2E sweep shows ≤ 20 skipped tests (down from 126).
- [ ] No new flake introduced (all touched specs pass 3× consecutive runs).
- [ ] Per-spec seed pattern documented in `tests/e2e/seed/README.md`.
- [ ] `E2E_SEED=true` global-seed path either removed or marked deprecated in `global-setup.ts`.
- [ ] Each seed has matching cleanup; running `npm run test:e2e` twice in a row produces identical results.

---

## Open Questions

1. Should we keep `tests/e2e/seed/seed.ts` for local exploration, or fully migrate to per-spec seeds?
2. Is `NUXT_RADAR_API_KEY` set in Vercel CI? If not, address autocomplete tests will continue to skip silently.
3. Are there any cross-family-unit invariants we need to preserve when adding `e2e-deletable-*` users? (e.g. they shouldn't appear in `player@test.com`'s family.)
