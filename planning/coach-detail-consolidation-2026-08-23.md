# Coach Detail Consolidation — 2026-08-23

Consolidate coach-detail communication UX on **web + iOS**. 5 items.

## Root-cause findings (from investigation)

- **Template bug is web-only resolver wiring.** `composables/useTemplateResolver.ts:315-317` `resolveTemplate` runs bare `renderTemplate` (only `{{}}`), never `applyOptionalSegments`/`renderClean`. So `[[gate|{{token}}]]` → inner `{{token}}` substituted, `[[gate|` `]]` wrapper leaks into Subject/Message. Preview `CommunicationPanel.vue:920` `renderClean(body, {}, ...)` fed **empty** values → strips every gate span. Template DATA is correct.
- **iOS already runs the full pipeline** (`TemplateResolver.swift`, byte-identical port; `QuickCommunicationViewModel` calls `buildValues`→`render`→`renderClean` with real values). iOS template resolution = OK, verify only.
- Email = right drawer; Text = centered modal — both in `CommunicationPanel.vue` (131-352 vs 354-571). Swap is wrapper-class only.
- `/analytics` + `/communications` pages both re-fetch the SAME `interactions` the detail page already loads → fold, drop dup fetches.

## Decisions (Chris)

1. Analytics fold = **metrics table + cross-coach ranking line + insights**; delete dedicated page.
2. iOS = **implement directly this session** (after confirming iOS session idle on coach files).

---

## WEB

### W1 — Fix template resolver (the bug)
- `useTemplateResolver.ts` `resolveTemplate`: build `requiredKeys` from registry; return `subject`/`body` via `renderClean(raw, values, requiredKeys)` (full pipeline) instead of bare `renderTemplate`. Still return `values` + `unresolved`.
- `CommunicationPanel.vue`: preview computeds segment the already-clean composer body (drop `renderClean(body, {}, …)`). Keep required-unresolved send gating.
- Test: assert resolver output contains no `[[`; add vector.

### W2 — Text editor modal → side panel
- `CommunicationPanel.vue` text wrapper (354-571): adopt email drawer pattern (`absolute right-0 top-0 h-full max-w-lg border-l` + `Transition name="drawer"`). Inner form unchanged.

### W3 — Fold analytics onto coach detail
- Render metrics (total, response rate, avg response time, last contact, preferred method) + ranking line + insights on `pages/coaches/[id]/index.vue`, reusing `useCoachAnalytics` over already-loaded `interactions`.
- Delete `pages/coaches/[id]/analytics.vue`; remove Analytics button `CoachHeader.vue:158-164`.

### W4 — Fold comm-log onto coach detail
- Upgrade recent-interactions section → filterable (type/direction/date/sentiment) + expandable body + attachments (port from `communications.vue`).
- Delete `pages/coaches/[id]/communications.vue`; remove Messages button `CoachHeader.vue:165-171`. Drop no-op Reply/Forward stubs.

### W5 — Verify
type-check, lint, `npm test`, browser (player1@compassdemo.app).

---

## iOS (after web, confirm session idle)

### I1 — Template resolver: verify only (already correct). No code change expected.
### I2 — Coach-detail metrics: fix `computeStats` last-10 undercount → real total/response-rate/avg-response-time; add ranking line + insights. Extend `CoachStatsGrid`/new `CoachAnalyticsSection.swift`.
### I3 — Comm-log fold: add `coachId` to `InteractionFilters`; make recent-interactions section filterable + `RecentInteractionRow` expandable (or embed coach-scoped `InteractionsListView`).
### I4 — Verify: `xcodebuild build -quiet`.

## Open risks
- Shared-checkout race with active iOS session — coordinate before I2/I3.
- Ranking is cross-coach: needs all coaches' interactions for the school (web `compareWithSchoolAverage` already does; iOS needs equivalent).
