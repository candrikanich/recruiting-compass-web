# iOS Spec — Dashboard Timeline: consume shared web endpoints (stop local recompute)

**Date:** 2026-08-11
**Source of truth:** web app (`recruiting-compass-web`)
**Type:** bug fix + architecture (single source of truth)

## Problem

The dashboard timeline (phase / `X/100` score / current-task) is computed **independently** on
web and iOS. iOS reimplements the web logic in native Swift services and has drifted. Observed:

| Surface | Phase | Score | Current task |
|---|---|---|---|
| Web (player) | Junior Year | **20**/100 | "take official SAT or ACT" |
| iOS (parent) | Junior Year | **0**/100 | "Increase Coach Communications Cadence" |

Same athlete, same family unit — must be identical. Two confirmed divergences:

1. **Score formula.** Web computes a 4-factor weighted composite (`utils/statusScoreCalculation.ts`:
   taskCompletion 0.35 + interactionFrequency 0.25 + coachInterest 0.25 + academicStanding 0.15,
   sub-scores from the `get_athlete_status` Postgres RPC). iOS `TimelineStatusService` computes
   **task-completion only** and hardcodes the other three components to `0` (`TimelineStatusService.swift:12`).
   → iOS can never match web. This alone explains 20 vs 0.

2. **Current task.** Selection logic is identical on both sides, so a different result means iOS is
   fed a different task/completion set (independent Supabase read + local derivation). iOS also uses
   mismatched status-label thresholds (75/50 in `TimelineStatusService` vs 70/50 in
   `DashboardTimelineSummaryCard.swift`).

## Fix

iOS stops deriving phase / score / current-task locally and **consumes the web endpoints** as the
single source of truth. Web already computes all three server-side; parent→player resolution and
grade/phase derivation live in one place.

Three endpoints (all require the existing Supabase bearer token; iOS is already authenticated):

### 1. `GET /api/athlete/phase` (exists)
```jsonc
{
  "phase": "junior",                 // freshman|sophomore|junior|senior|committed
  "milestoneProgress": {
    "phase": "junior",
    "required": ["<taskId>", "..."],
    "completed": ["<taskId>"],
    "remaining": ["<taskId>"],
    "percentComplete": 33
  },
  "canAdvance": false
}
```
Use `phase` for the phase label. (`committed` → "Committed"; others → "Freshman/Sophomore/Junior/Senior Year".)

### 2. `GET /api/athlete/status` (exists) — the real score
```jsonc
{
  "score": 20,                       // the X in X/100
  "label": "at_risk",                // on_track|slightly_behind|at_risk
  "color": "red",                    // green|yellow|red
  "breakdown": {
    "taskCompletionRate": 40,
    "interactionFrequencyScore": 10,
    "coachInterestScore": 0,
    "academicStandingScore": 50
  }
}
```
Use `score` for `X/100`. Use server `label`/`color` for the status dot — **do not** re-threshold on iOS
(kills the 75/50-vs-70/50 mismatch).

### 3. `GET /api/athlete/what-matters-now` (**new — this change**) — the current task
Returns up to 5 prioritized items, highest priority first. **Take `[0]` for the timeline card.**
```jsonc
[
  {
    "taskId": "9c9c6c80-...",
    "title": "Maintain Strong Grades (College-Ready)",
    "whyItMatters": "Colleges rescind offers for grade drops.",
    "category": "academic",
    "priority": 5,
    "isRequired": true
  }
]
```
Empty array → no current task (render the card's empty/nil state). `title` → task title,
`whyItMatters` → subtitle.

## iOS changes (from code investigation)

Replace local computation with API reads in `TimelineViewModel` and retire the mirror services:

| File | Action |
|---|---|
| `Features/Timeline/ViewModels/TimelineViewModel.swift` | In `load()`, fetch the 3 endpoints. Set `statusScore`/`label`/`color` from `/status`; `currentPhase`/`milestoneProgress` from `/phase`; `nextRecommendedTask` from `/what-matters-now[0]`. Remove calls to the local phase/status/what-matters services. |
| `Features/Timeline/Services/TimelineStatusService.swift` | Delete or gut — replaced by `/api/athlete/status`. Its stubbed 3/4-factor formula is the 20-vs-0 bug. |
| `Features/Timeline/Utilities/WhatMattersNow.swift` | Delete or gut — replaced by `/api/athlete/what-matters-now`. |
| `Features/Timeline/Services/TimelinePhaseService.swift` | Delete or gut — replaced by `/api/athlete/phase` (already returns `milestoneProgress`). |
| `Features/Dashboard/Components/DashboardTimelineSummaryCard.swift` | Bind score-dot color to server `color`; drop the local 70/50 threshold. Bind task title/why from `/what-matters-now[0]`. |

Decodable structs to add (match JSON above): `AthletePhaseResponse`, `AthleteStatusResponse`
(with `breakdown`), `WhatMattersItem`.

## Parity verification (web, done 2026-08-11)

Verified live against demo family (player1 / parent1 @compassdemo.app), same family unit:

- `/api/athlete/what-matters-now` top item **identical** for parent and player (same `taskId`) — parent→player resolution works.
- Endpoint result **matches** the rendered web `DashboardTimelineCard` ("Maintain Strong Grades", Senior Year, 54/100).
- Unauthenticated → 401.

## iOS build-time checks

1. Confirm iOS auth layer attaches the Supabase bearer token to these GETs (same as other authed calls).
2. After wiring, log in as a parent and the linked player on iOS — both dashboards must show identical
   phase / score / current-task, and match the web dashboard for that athlete.
3. Handle empty `what-matters-now` array and non-200 responses gracefully (nil card, no crash).

## Notes

- Selection/score logic is **not** duplicated by the new endpoint — it reuses the same pure
  `getWhatMattersNow` util the web card uses. Moving iOS onto the endpoint removes the last
  independent implementation.
- `category` values in live data are the plain forms (`"academic"`, `"communication"`, …); the
  priority map keys some as hyphenated (`"academic-standing"`) and falls back to 5 otherwise. This is
  a pre-existing web quirk, out of scope here — iOS just renders what the endpoint returns.
