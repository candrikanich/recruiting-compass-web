# Atomic CRUD Pattern Rollout — Handoff for Next Session

**Author:** Claude (Opus 4.7), 2026-05-22
**Branch state at handoff:** `develop` on `origin` is at `e0e1d3b5` ("refactor(offers): move offers state to Pinia store with pagination and soft-warn"). Working tree clean except for this handoff doc.

---

## What this is

A pilot established the "atomic CRUD lifecycle" pattern for Playwright tests across the project's first-class entities. One test walks a single record through create → read → update → delete (or a meaningful subset) with proper cleanup, replacing per-action specs that mostly didn't work.

This doc tells the next context where to look for further candidates and what to skip.

## Atomic specs that exist now

All in `tests/e2e/tier1-critical/`:

| Spec | Status | Notes |
|---|---|---|
| `schools-crud-atomic.spec.ts` | ✅ passing | Atomic CRUD lifecycle |
| `coaches-crud-atomic.spec.ts` | ✅ passing | + trimmed `coaches-crud.spec.ts` keeps orthogonal cases (XSS, special chars, roles, etc.) |
| `documents-crud-atomic.spec.ts` | ✅ passing | School-attached upload flow |
| `interactions-crud-atomic.spec.ts` | ✅ passing | No UPDATE (interactions immutable) |
| `offers-crud-atomic.spec.ts` | ✅ passing | Continues to pass after the Pinia store migration (`e0e1d3b5`) |
| `events-crud-atomic.spec.ts` | ✅ passing | Strict UUID regex on waitForURL |

Real bugs the atomic tests surfaced and fixed:
- `components/School/SchoolDetailHeader.vue` — `:model-value` was being applied to a native `<select>`; should be `:value=`.
- `composables/useDocumentsConsolidated.ts` — `getDocument()` was passing `{ filters: { ... } }` to a function whose 2nd arg is flat filters; broke Edit and Delete on `/documents/[id]`.
- `composables/useOffers.ts` — detail page resolved offer via `offers.value.find(...)` against a per-instance cache that may be empty on direct navigation; added `getOffer(id)` direct-by-ID fetch (commit `c9ff56dd`).

## Where to look for more candidates

The remaining tier-1 specs are mostly NOT clean CRUD shapes. Don't force atomic on them.

### Skip these (not CRUD lifecycles)

- `auth.spec.ts`, `auth-enforcement.spec.ts`, `email-verification.spec.ts`, `password-reset.spec.ts`, `remember-me.spec.ts`, `session-timeout.spec.ts` — auth flows, need their own discipline.
- `workflow.spec.ts`, `coaches-workflow.spec.ts`, `user-story-*.spec.ts` — multi-step scenarios, atomic doesn't fit.
- `collaboration.spec.ts`, `documents-sharing.spec.ts` — orthogonal features.
- `coaches-detail.spec.ts` (746 LOC), `interaction-detail.spec.ts` (674 LOC) — detail-page deep dives, not lifecycles.
- `athlete-profile-creation.spec.ts` — profile is 1-per-user, not a list/lifecycle entity.

### Maybe-candidates outside tier-1 (verify before committing time)

Scan `tests/e2e/` (root) and `tests/e2e/tier2-important/`. Likely lifecycle-shaped:

- **`tests/e2e/parent-tasks.spec.ts` (85 LOC)** — athlete_tasks entity. Probably CRUD-y. Check first: does the app actually let you create/update/delete athlete_tasks via UI, or is it system-generated only? If the latter, atomic doesn't apply.
- **`tests/e2e/notes-history.spec.ts` + `school-detail-notes.spec.ts`** — school notes have create/edit/delete. Could fit but might be too tightly coupled to the school detail page (which is more of an orthogonal feature test).
- **`tests/e2e/tier2-important/settings.spec.ts`** — user settings are updates only (no create/delete in the usual sense). Atomic doesn't really fit. Skip.
- **`tests/e2e/tier2-important/user-preferences.spec.ts`** — same as settings.
- **`tests/e2e/tier2-important/coaches-communication.spec.ts`** (426 LOC) — if messages are CRUD entities, could fit. Probably more of a multi-step workflow. Look before deciding.

### How to evaluate a candidate quickly

```bash
# 1. Does it have a create + delete pair?
grep -E "test\(|test\\.describe" path/to/spec.spec.ts | head -20

# 2. Does the entity have its own routes?
find pages/ -name "<entity>*" -o -path "*<entity>*"

# 3. Try one test to see if the setup actually works
BASE_URL=http://localhost:3003 npx playwright test path/to/spec.spec.ts \
  --workers=1 -g "<first test name>" --reporter=line
```

If the first test fails at `beforeEach` navigation (like several specs did — they used `page.click("a:first-child")` which matches the skip-link), the file is dead. Pattern = replace-and-delete, not trim.

If the first test fails on a specific assertion, you may have a real selector issue worth fixing OR a real app bug worth surfacing. Both are good to find.

## Offers store migration (completed, shipped to develop)

A parallel session implemented the Pinia store migration outlined in `planning/2026-05-22-offers-architecture-redesign.md` and landed it as `e0e1d3b5`:

- `composables/useOffers.ts` removed → `stores/offers.ts` created (22 passing unit tests)
- Callers updated: `pages/offers/[id].vue`, `pages/offers/index.vue`, `pages/reports/timeline.vue`, `pages/schools/index.vue`
- Old `tests/unit/composables/useOffers*.spec.ts` removed; new `tests/unit/stores/offers.spec.ts`
- Pagination + soft-warn cards per the plan
- `offers-crud-atomic.spec.ts` verified passing against this version

The plan doc `planning/2026-05-22-offers-architecture-redesign.md` can be considered closed except for the deferred `archived` status follow-up.

## Infrastructure built during this rollout

- **`scripts/e2e-cleanup.ts`** — deletes accumulated test schools (and cascaded children) for `player@test.com`. Supports `--dry-run`. Re-run before any future atomic test work if the suite hasn't been clean in a while.
- **`planning/2026-05-22-offers-architecture-redesign.md`** — the full plan the other agent is working from (Pinia store, pagination, soft-warn cards at 25 offers / 80 schools, no hard caps).

## Recommended next steps

1. **Triage maybe-candidates** above (parent-tasks, notes-history, coaches-communication). Spend max 5 minutes per file deciding lifecycle-fit before committing to the rewrite.
2. **Don't** sweep tier-2/3 just to feel productive. The atomic pattern's value is on CRUD lifecycles, not orthogonal feature tests. If you find a candidate where it doesn't simplify the spec, skip it.
3. **Optional:** file an issue for the deferred `archived` offer status from the redesign plan — soft-warn UI to bulk-archive old offers.

## Constraints inherited from the rollout

- **Auth via storageState** — every atomic uses `tests/e2e/.auth/player.json`. Don't call `loginViaForm()` in `beforeEach`; it's been removed from every atomic spec for a reason.
- **Parallel safety** — UUID/timestamp-suffixed names everywhere. The cleanup script depends on these prefix patterns; if you invent a new test name shape, add the prefix to `scripts/e2e-cleanup.ts`'s `TEST_SCHOOL_PREFIXES` list.
- **Cleanup in afterAll** — every atomic that creates a parent school deletes it again, so no stray rows accumulate. Keep this discipline.
- **No mocks** — atomic specs hit real Supabase. If you write a candidate that needs to mock the backend, you're probably testing the wrong thing.

## Final state

- `develop` at `origin`: `e0e1d3b5` (offers store migration on top of 7 atomic-pattern commits from this session)
- Working tree clean.
- Dev server still running on `:3003` (Nuxt 3.21.6 with `experimental.viteEnvironmentApi: true` workaround for the ssr:false dev crash).
- All 6 atomic specs pass; cleanup script available at `scripts/e2e-cleanup.ts`.
