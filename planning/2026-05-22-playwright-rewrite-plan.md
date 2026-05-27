# Playwright Suite Full-Rewrite Plan

**Author:** Claude (Opus 4.7), 2026-05-22
**Branch:** `develop`
**Starting state:** Tier1 86 pass / 115 fail / 19 skip (40% pass rate). 6 atomic specs are the only fully-healthy specs in tier1. Other tiers not yet audited.

---

## Goal

Restore the Playwright suite to a **trustworthy** state — every spec either passes deterministically, or is `test.skip()`ed with a written reason and a follow-up issue. Eliminate fake coverage (vacuous assertions, dead beforeEach setups, conditional skips that look like passes).

## Definition of done

- [ ] Full suite runs in <15 min (currently tier1 alone is 10.5 min, mostly burning on 30s timeouts)
- [ ] 0 unexpected failures in CI on `develop`
- [ ] Every `test.skip` has an explanatory string argument
- [ ] No `expect(x).toBeGreaterThanOrEqual(0)` patterns
- [ ] No `if (await x.isVisible()) { ... }` skip-conditional pretending to assert
- [ ] No `page.waitForTimeout()` over 500ms (handful of intentional ones allowed)
- [ ] One handoff doc summarizing every spec's final disposition

---

## Phase 0 — Audit (in progress)

| Tier | Status | Notes |
|---|---|---|
| tier1-critical (24 specs) | ✅ Done | 6 dead, 3 partial, 15 healthy |
| tier2-important (9 specs) | ⏳ Running | started 12:18, ETA ~15 min |
| tier3-nice-to-have (1 spec) | ⏳ Running | bundled with tier2 |
| user-stories (4 specs) | ⏳ Running | bundled with tier2 |
| a11y (1 spec) | ⏳ Running | bundled with tier2 |
| admin (1 spec) | ⏳ Running | bundled with tier2 |
| root (~25 specs) | ⏳ Queued | runs after tier2 batch |

Plan will be updated with tier2+root results before Phase 2 begins.

## Phase 1 — Quarantine dead specs (immediate CI signal)

**Goal:** Stop pretending broken tests are tier1-critical coverage. One commit, one PR.

For each spec that's ≥80% failing, add at file top:

```ts
test.describe.skip("[Feature] — quarantined for rewrite", () => {
  // SKIP REASON: Route renamed / selectors drifted / feature moved.
  // Rewrite tracked in planning/2026-05-22-playwright-rewrite-plan.md Phase 2.
  // ... existing tests below
});
```

Tier1 specs to quarantine in Phase 1:

| Spec | Why dead | Phase 2 plan |
|---|---|---|
| `coaches-detail.spec.ts` (746 LOC, 18 tests) | beforeEach creates school per test → cascade timeout; selectors drifted | Rewrite as ~5 focused tests with `beforeAll` school setup + cleanup |
| `interaction-detail.spec.ts` (674 LOC, 24 tests) | Same pattern; 19 timeouts | Same — rewrite as ~6 focused tests, beforeAll setup |
| `documents-sharing.spec.ts` (537 LOC, 14 tests) | Assumes pre-existing documents; selectors stale | Verify sharing UI exists; rewrite or delete |
| `collaboration.spec.ts` (12 tests) | Route `/settings/collaboration` no longer exists — feature renamed to `family-management` | Replace with `family-management.spec.ts` (or fold into existing `family-units.spec.ts`) |
| `workflow.spec.ts` (8 tests) | Static `testSchools.school1` fixtures collide under parallel runs; no cleanup | Rewrite as 2-3 atomic happy-path workflows with unique names |
| `coaches-workflow.spec.ts` (3 tests) | Same as workflow.spec.ts | Same |

**Estimated time:** 30 min (mechanical edits).

## Phase 2 — Rewrite

Each dead spec gets a focused rewrite. The pattern is established by the 6 working atomic specs in tier1.

### Strategy per spec shape

**Detail-page specs (`coaches-detail`, `interaction-detail`):**
- One `beforeAll` creates one school + one coach/interaction
- Each test exercises ONE detail-page concern (modal open/close, notes save, validation, etc.)
- `afterAll` cleans up
- Target: 5-7 tests per spec, all under 30s

**Workflow specs (`workflow`, `coaches-workflow`):**
- Atomic CRUD already covers basics
- Keep here: cross-entity workflows that span 2+ entities (school → coach → interaction in one journey)
- 2-3 tests max per file
- Unique names per test

**Sharing / Collaboration specs:**
- First: verify feature still exists in current UI (1-min check before writing any test)
- If exists: small focused happy-path tests (invite → accept → revoke)
- If gone: delete spec, leave note in this plan

**Partially-broken specs (`athlete-profile-creation`, `email-verification`, `user-story-5-2-timeline`):**
- Triage the failing tests — fix the selectors that drifted, delete the assertions that test gone features
- Aim to preserve coverage, not to start over

### Execution order

Highest ROI first (biggest specs that block the most CI time):

1. `coaches-detail.spec.ts` — biggest, longest timeouts
2. `interaction-detail.spec.ts` — second biggest
3. `documents-sharing.spec.ts` — sharing is real feature
4. `collaboration.spec.ts` → rewrite as `family-management.spec.ts`
5. `workflow.spec.ts` + `coaches-workflow.spec.ts` — merge or trim
6. `athlete-profile-creation.spec.ts` — fix drift
7. `email-verification.spec.ts` — fix the 6 failures
8. `user-story-5-2-timeline.spec.ts` — fix or skip
9. Whatever tier2/root surfaces

**Estimated time:** 30-60 min per spec, 6-9 hours total.

## Phase 3 — Pattern sweep

Once specs are individually healthy, sweep for cross-cutting anti-patterns:

### `waitForTimeout` → real waits

| File | Count | Strategy |
|---|---|---|
| `tier2-important/search-workflows.spec.ts` | 29 | Replace with `expect(...).toBeVisible()` / `waitForResponse` |
| `schools-filtering.spec.ts` | 15 | Same |
| `school-detail-status-history.spec.ts` | 14 | Same |
| `school-detail-sidebar.spec.ts` | 10 | Same |
| 9 other files (3-8 each) | ~70 | Same |
| **Total** | **152** | Expected runtime savings: 1-2 min |

### Vacuous assertions

39 instances of `toBeGreaterThanOrEqual(0)` and similar. For each:
- If the assertion is genuinely checking "loads without crashing", replace with `expect(page.locator('main')).toBeVisible()` and add a meaningful assertion
- If it's covering for missing data, gate the test with `test.skip` and a real seed prerequisite OR seed the data

Concentrated in: `notes-history.spec.ts`, `coaches-communication.spec.ts`, `parent-tasks.spec.ts`.

**Estimated time:** 2-3 hours.

## Phase 4 — Verify

- [ ] Run full suite: `BASE_URL=http://localhost:3003 npx playwright test --reporter=line`
- [ ] Confirm 0 unexpected failures
- [ ] Confirm runtime <15 min
- [ ] Update `CLAUDE.local.md` and write handoff doc

## Open questions to answer before Phase 2

1. **`documents-sharing`** — does document sharing UI still exist? If not, delete; if yes, what's the current shape?
2. **`collaboration` rename** — is `family-management.spec.ts` worth writing standalone, or should the tests live inside the existing `family-units.spec.ts`?
3. **`user-story-5-2-timeline`** — does the timeline view exist, or has it been replaced by something else?

These get answered by reading current `pages/` + `components/` during each spec's rewrite.

## Risk / non-goals

- **NOT rewriting healthy specs.** The 6 atomic specs stay as-is.
- **NOT adding new test coverage** for features that lack any spec. Out of scope.
- **NOT touching unit tests** (Vitest). E2E only.
- **NOT touching iOS tests.** Web only.
- Risk: rewrites may surface real app bugs (the atomic rollout did this). Treat each one as a real signal — fix the bug or document it.
