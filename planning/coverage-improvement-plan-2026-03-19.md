# Test Coverage Improvement Plan: 72% → 80%

**Date:** 2026-03-19
**Goal:** Raise all four V8 metrics (statements, branches, functions, lines) to 80%+

---

## Baseline

| Metric | Current | Target | Gap |
|---|---|---|---|
| Statements | 71.97% | 80% | 8.03 pp |
| Branches | 63.02% | 80% | 16.98 pp |
| Functions | 69.82% | 80% | 10.18 pp |
| Lines | 73.42% | 80% | 6.58 pp |

The branch gap is the steepest. Priority order: cover uncovered branches first, then functions, then lines/statements as byproduct.

---

## Phase 1 — Pure Utility Files (zero mocking)

**Estimated effort:** 2–3 hours
**Estimated coverage gain:** +2.5–3.5 pp statements, +4–6 pp branches

### 1A. `utils/formatters.ts` → `tests/unit/utils/formatters.spec.ts`

Functions: `extractFilename`, `formatFileSize`

- `extractFilename` with full URL → last segment
- `extractFilename` with bare filename → unchanged
- `extractFilename("")` → `""` (fallback branch)
- `formatFileSize(0)` → `"0 Bytes"`
- `formatFileSize(1024)` → `"1 KB"`
- `formatFileSize(1048576)` → `"1 MB"`
- `formatFileSize(1073741824)` → `"1 GB"`
- `formatFileSize(500)` → sub-KB value

### 1B. `utils/coachHelpers.ts` → `tests/unit/utils/coachHelpers.spec.ts`

Functions: `getInitials`, `getSchoolById`, `getSchoolName`

- `getInitials({ first_name: "John", last_name: "Smith" })` → `"JS"`
- `getInitials` with lowercase names → uppercased
- `getSchoolById(undefined, [])` → `undefined`
- `getSchoolById("id-1", schools)` → matching school
- `getSchoolById("missing", schools)` → `undefined`
- `getSchoolName(undefined, [])` → `"Unknown"`
- `getSchoolName("id-1", schools)` → school name
- `getSchoolName("missing", schools)` → `"Unknown"`

### 1C. `utils/coachFormatters.ts` → `tests/unit/utils/coachFormatters.spec.ts`

Functions: `formatCoachDate`, `formatDateWithTime`, `getDaysAgoExact`, `getRoleBadgeClass`

Note: Use `vi.useFakeTimers()` for `getDaysAgoExact`. Use `expect.stringContaining` for locale-sensitive date assertions.

- `getDaysAgoExact(today)` → `"today"`
- `getDaysAgoExact(yesterday)` → `"1 day ago"`
- `getDaysAgoExact(5 days ago)` → `"5 days ago"`
- `getRoleBadgeClass("head")` → `"bg-purple-100 text-purple-700"`
- `getRoleBadgeClass("assistant")` → blue class
- `getRoleBadgeClass("recruiting")` → emerald class
- `getRoleBadgeClass("unknown")` → slate fallback (covers default branch)
- `formatCoachDate("2026-01-15T00:00:00Z")` → `expect.stringContaining("Jan")`
- `formatDateWithTime("2026-01-15T14:30:00Z")` → `expect.stringContaining("2026")`

### 1D. `utils/dateFormatters.ts` → `tests/unit/utils/dateFormatters.spec.ts`

Functions: `formatDate`, `daysAgo`, `formatDateWithRelative`, `formatDateTime`

- `formatDate(undefined)` → `""` (falsy branch)
- `formatDate("")` → `""` (falsy branch)
- `formatDate("2026-01-15")` → `expect.stringContaining("Jan")`
- `daysAgo` with 10 days ago (fake timers) → `10`
- `formatDateWithRelative` 1 day ago → contains `"1 day ago"` (singular branch)
- `formatDateWithRelative` 3 days ago → contains `"3 days ago"` (plural branch)
- `formatDateTime(undefined)` → `"Unknown"` (falsy branch)
- `formatDateTime("2026-03-01T10:00:00Z")` → `expect.stringContaining("Mar")`

### 1E. `utils/sentimentAnalysis.ts` → `tests/unit/utils/sentimentAnalysis.spec.ts`

Currently 7% covered. Functions: `analyzeSentiment`, `getSentimentEmoji`, `getSentimentColor`, `getSentimentLabel`

`analyzeSentiment` scenarios:
- Multiple `VERY_POSITIVE_KEYWORDS` → sentiment `"very_positive"`, score >= 0.5
- Only `POSITIVE_KEYWORDS` → sentiment `"positive"`, score in [0.15, 0.5)
- No keywords → sentiment `"neutral"`, score 0, keywords `[]`
- `NEGATIVE_KEYWORDS` → sentiment `"negative"`, score <= -0.15
- Mixed (positive + negative) → score clamped, correct category
- Many positives → score clamps at 1.0
- Same keyword repeated → `keywords` array deduped via Set

Display helpers (all branches for each):
- `getSentimentEmoji("very_positive")` → `"🔥"`
- `getSentimentEmoji("positive")` → `"👍"`
- `getSentimentEmoji("negative")` → `"👎"`
- `getSentimentEmoji("neutral")` → `"😐"`
- `getSentimentEmoji(null)` → `"😐"` (default)
- `getSentimentEmoji(undefined)` → `"😐"` (default)
- Same pattern for `getSentimentColor` and `getSentimentLabel`

### 1F. `utils/positions.ts` → `tests/unit/utils/positions.spec.ts`

Currently 8.69% covered. Functions: `normalizePosition`, `normalizePositions`, `isValidPosition`, `getPositionFullName`

`normalizePosition` scenarios:
- Canonical `"P"` → `"P"` (direct lookup)
- Full name `"Pitcher"` → `"P"`
- Lowercase `"pitcher"` → `"P"` (case-insensitive)
- Variation `"Short Stop"` → `"SS"`
- Broad category `"Infield"` → `"UTIL"`
- Trimmed whitespace `"  SS  "` → `"SS"`
- Invalid `"invalid"` → `null`
- `""` → `null` (falsy guard)

`normalizePositions` scenarios:
- `null` / `undefined` / `[]` → `[]`
- `["Pitcher", "P"]` → `["P"]` (dedup via Set)
- `["invalid", "SS"]` → `["SS"]` (nulls filtered)

`isValidPosition`:
- Each canonical value → `true`
- Full name → `false`
- `"invalid"` → `false`

`getPositionFullName`:
- `"P"` → `"Pitcher"`
- `"SS"` → `"Shortstop"`
- `"unknown"` → `"unknown"` (returns original)

---

## Phase 2 — Composables with Minimal Mocking

**Estimated effort:** 2–3 hours
**Estimated coverage gain:** +1.5–2.5 pp statements, +2–4 pp branches

### 2A. `composables/useLoadingStates.ts` → `tests/unit/composables/useLoadingStates.spec.ts`

Only uses `ref` from Vue — no mocking needed.

- Initial: `loading.value === false`, `validating.value === false`
- `setLoading(true)` → `loading.value === true`
- `setLoading(false)` → `loading.value === false`
- `setValidating(true)` → `validating.value === true`
- `setValidating(false)` → `validating.value === false`
- Returns object with all four keys

### 2B. `composables/ncaaDatabase.ts` → `tests/unit/composables/ncaaDatabase.spec.ts`

Mock JSON: `vi.mock('~/data/ncaaSchools.json', () => ({ default: { D1: [...], D2: [...], D3: [...] } }))`

- `getAllSchools()` → D1 + D2 + D3 merged
- `getSchoolsByDivision("D1")` → only D1
- `findSchool("Stanford")` → match
- `findSchool("stanford")` → case-insensitive match
- `findSchool("NonExistent")` → `undefined`
- `isNcaaSchool("Stanford")` → `true`
- `isNcaaSchool("NonExistent")` → `false`
- `getSchoolsByConference("SEC")` → filtered list
- `getSchoolsByConference("sec")` → case-insensitive

### 2C. `composables/useEntityNames.ts` → `tests/unit/composables/useEntityNames.spec.ts`

```typescript
vi.mock('~/composables/useSchools', () => ({ useSchools: () => ({ schools: ref([]) }) }))
vi.mock('~/composables/useCoaches', () => ({ useCoaches: () => ({ coaches: ref([]) }) }))
```

`getSchoolName`:
- No `schoolId` → `"Unknown"`
- `schoolId` not in list → `"Unknown"`
- `schoolId` found → returns `school.name`

`getCoachName`:
- No `coachId` → `"Unknown"`
- `coachId` not in list → `"Unknown"`
- Found with both names → `"First Last"`
- Found with empty names → `"Unknown"` (trim fallback)

`formatCoachName`:
- Both names → `"First Last"`
- Only first name → `"First"`
- Both `undefined` → `"Unknown"`

### 2D. `composables/useDeadlines.ts` — extend existing spec

Currently 62.5%. Add error path tests:

- `fetchDeadlines` rejects → `error.value = "Failed to load deadlines"`, `loading.value` resets to `false`
- `createDeadline` happy path → calls POST, then fetchDeadlines, returns deadline object
- `createDeadline` rejects → throws, `logger.error` called
- `removeDeadline` rejects → throws, `logger.error` called
- `loading.value` is `true` during fetch, `false` after

---

## Phase 3 — Targeted Branch Fill on Near-80% Files

**Estimated effort:** 1–2 hours
**Estimated coverage gain:** +0.5–1 pp statements, +2–3 pp branches

### 3A. `utils/schoolBadges.ts` — extend `tests/unit/utils/schoolBadges.spec.ts`

Missing `getFitScoreBadgeClass`:
- `getFitScoreBadgeClass(70)` → emerald (>= 70 branch)
- `getFitScoreBadgeClass(85)` → emerald
- `getFitScoreBadgeClass(50)` → orange (>= 50 branch)
- `getFitScoreBadgeClass(65)` → orange
- `getFitScoreBadgeClass(49)` → red (< 50)
- `getFitScoreBadgeClass(0)` → red

### 3B. `utils/sentiment.ts` — extend or create `tests/unit/utils/sentiment.spec.ts`

Missing null/undefined branches and `getTypeBadgeColor`:
- `getSentimentBadgeColor(null)` → `"slate"`
- `getSentimentBadgeColor(undefined)` → `"slate"`
- `getSentimentBadgeColor("")` → `"slate"`
- `getSentimentBadgeColor("unknown_value")` → `"slate"` (map fallthrough)
- `getDirectionBadgeColor(undefined)` → `"slate"`
- `getDirectionBadgeColor("inbound")` → `"emerald"`
- `getDirectionBadgeColor("outbound")` → `"purple"`
- `getDirectionBadgeColor("other")` → `"slate"`
- `getTypeBadgeColor(undefined)` → `"blue"`
- `getTypeBadgeColor("any")` → `"blue"`

### 3C. `composables/useFamilyInvitations.ts` — extend existing spec

Currently 68.75%. Missing `fetchInvitations` and `revokeInvitation`:
- `fetchInvitations` happy path → sets `invitations.value`, clears `error.value`
- `fetchInvitations` rejects → `error.value = "Failed to load invitations"`, `loading.value` resets
- `revokeInvitation` happy path → calls DELETE, then re-fetches
- `revokeInvitation` rejects → `error.value = "Failed to revoke invitation"`, `loading.value` resets

---

## Phase 4 — Server API Routes

**Estimated effort:** 3–4 hours
**Estimated coverage gain:** +1.5–2.5 pp functions/branches on server layer

### 4A. `server/api/admin/health.get.ts` → `tests/unit/server/api/admin/health.get.spec.ts`

Mocks: `~/server/utils/auth` (requireAdmin), `~/server/utils/supabase` (useSupabaseAdmin), `~/server/utils/logger` (useLogger)

- DB succeeds, `RESEND_API_KEY` set → `{ ok: true, db: "ok", resend: "ok" }`
- DB succeeds, `RESEND_API_KEY` missing → `{ ok: true, db: "ok", resend: "missing" }`
- DB returns error → `{ ok: false, db: "error" }`
- DB throws exception → `{ ok: false }` (inner catch)
- `requireAdmin` throws H3Error → re-thrown
- `requireAdmin` throws generic Error → 500

Use `vi.stubEnv("RESEND_API_KEY", "key")` and `vi.unstubAllEnvs()` in `afterEach`.

### 4B. `server/api/admin/stats.get.ts` → `tests/unit/server/api/admin/stats.get.spec.ts`

- All counts resolve → response has correct values
- Null count → defaults to 0 (`?? 0` branch)
- `requireAdmin` throws H3Error → re-thrown
- `requireAdmin` throws generic → 500

### 4C. `server/api/athlete/phase.get.ts` — extend existing spec

Missing branches:
- Parent role → resolves linked player ID
- Parent with no family membership → uses parent user ID
- DB error on `user_preferences` (non-PGRST116) → throws 500
- DB error on `athlete_task` → throws 500
- Out-of-range grade year → defaults to `"freshman"`

---

## Estimated Coverage Gain Summary

| Phase | Files | Statements | Branches | Functions |
|---|---|---|---|---|
| 1 — Pure utils | 6 new | +2.5–3.5 pp | +4–6 pp | +2.5–4 pp |
| 2 — Composables | 3 new + 1 extended | +1.5–2.5 pp | +2–4 pp | +1.5–2.5 pp |
| 3 — Branch fill | 3 extended | +0.5–1 pp | +2–3 pp | +0.5 pp |
| 4 — Server routes | 2 new + 1 extended | +1–2 pp | +2–3 pp | +1–2 pp |
| **Total** | | **+5.5–9 pp** | **+10–16 pp** | **+5.5–9 pp** |

---

## Post-Implementation Steps

1. Run `npm run test -- --coverage` and compare to baseline
2. Update `vitest.config.ts` thresholds: statements → 80, lines → 80, functions → 80, branches → 75 (conservative — branches may land 76–79)
3. Archive this plan once all phases complete

---

## Risks and Notes

- **Locale flakiness in date tests**: Use `expect.stringContaining` for month/year, not full string assertions
- **`BadgeColor` import in `utils/sentiment.ts`**: May need `vi.mock('~/components/DesignSystem/Badge.vue', () => ({}))` if import resolution fails
- **ncaaDatabase JSON import**: Mock as `{ default: { D1: [], D2: [], D3: [] } }` (default import format)
- **Admin test directory**: `tests/unit/server/api/admin/` doesn't exist yet — create it first

## Unresolved Questions

1. Does `utils/sentiment.ts`'s `BadgeColor` import from a Vue component cause vitest resolution errors? Worth a quick smoke test before writing the full spec.
2. Are there composables indirectly tested via parent tests that inflate numbers? Inspect JSON coverage report to confirm per-file gains.
