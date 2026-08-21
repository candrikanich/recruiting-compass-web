# School Status Pipeline — Formalization Spec

**Date:** 2026-08-21
**Author:** Chris + Claude
**Status:** APPROVED — decisions locked 2026-08-21, implementation in progress
**Repos:** `recruiting-compass-web`, `recruiting-compass-ios` (single shared Supabase DB)

---

## Problem

The `school_status` field currently conflates two independent axes and has no
defined order:

- **Progress** — where a school sits in the recruiting funnel (a monotonic
  milestone chain).
- **Affinity** — how much the athlete likes the school (a feeling).

Symptoms observed:

- **11 enum values**, only **6 exposed** in the web `SchoolForm`, and iOS/web
  **disagree on ordering** (iOS enum: `researching → interested → contacted`;
  web `useSchools` doc: `researching → contacted → interested`).
- iOS enum has `unknown` and lacks `declined`; web DB has `declined` and lacks
  `unknown`. Divergent value sets.
- `interested` is an affinity, not a milestone — but it lives on the progress
  axis, duplicating the existing `isFavorite` star.
- No documented order → the "Contacted" stat (schools where `status ==
  'contacted'`) is a single-stage snapshot that confuses users (a school with 3
  logged interactions read `interested`, so "0 contacted"). Interim patch
  (migrations `20260828000001`/`20260828000002`) auto-advances
  researching/interested → contacted on interaction. This spec is the durable fix.

---

## Goals

1. One **canonical, ordered, monotonic** progress pipeline, shared byte-for-byte
   across iOS and web (single source-of-truth constant).
2. Move **affinity off the status axis** — fold `interested` into the favorite flag.
3. **Auto-advance** rules so the pipeline tracks reality (interaction → contacted,
   visit → visiting, offer → offer_received) instead of relying on manual bumps.
4. A **visible pipeline UI** (stepper/progress) so the athlete sees current stage
   and what's next.
5. Keep both platforms at **parity** — same stages, order, names, auto-advance,
   and stat definitions.

## Non-goals

- Redesigning interactions, offers, or events themselves.
- Changing the favorite feature beyond absorbing `interested`.

---

## Proposed canonical pipeline

Monotonic progress stages (a school only moves forward; off-ramp is terminal).
**5 stages + off-ramp** (`recruited` dropped per Q3 — recruiting activity is
covered by interactions + the `visiting` stage):

| # | Stage | Meaning | Auto-advance trigger |
|---|-------|---------|----------------------|
| 1 | `researching` | Added; evaluating fit | default on create |
| 2 | `contacted` | First outreach sent/received | log an interaction |
| 3 | `visiting` | Visit invited / scheduled / completed (incl. camp invite) | manual (future: visit event) |
| 4 | `offer_received` | Offer on the table | manual (future: offer logged) |
| 5 | `committed` | Committed | manual |
| — | `not_pursuing` | Off-ramp / dead (terminal) | manual |

**Affinity (separate axis):** `isFavorite` boolean — already exists. Absorbs the
old `interested` meaning ("I like this school").

### Value migration map (existing rows → new set)

| Existing value | New status | Notes |
|----------------|-----------|-------|
| `researching` | `researching` | unchanged |
| `interested` | `contacted` if ≥1 interaction, else `researching` (+ set `is_favorite = true` either way) | Q1: affinity → favorite; interaction → contacted |
| `contacted` | `contacted` | unchanged |
| `camp_invite` | `visiting` | collapse (Q3) |
| `recruited` | `visiting` | collapse (Q3) |
| `official_visit_invited` | `visiting` | collapse |
| `official_visit_scheduled` | `visiting` | collapse |
| `offer_received` | `offer_received` | unchanged |
| `committed` | `committed` | unchanged |
| `declined` | `not_pursuing` | collapse (web-only value) |
| `not_pursuing` | `not_pursuing` | unchanged |
| `unknown` | `researching` | collapse (iOS-only value) |

**Q1 resolved:** old `interested` rows → `is_favorite = true`; status →
`contacted` if the school has ≥1 interaction, else `researching`. (The interim
patch already advanced interested-with-interactions → contacted, so those are
`contacted`; this migration sets the favorite flag and downgrades the rest.)

---

## Ordering: single source of truth

Define one ordered list; both platforms derive from it.

- **iOS** — replace the ad-hoc `SchoolStatus` case order with an explicit
  `orderedStages: [SchoolStatus]` (progress stages only) + `isTerminal`. Add a
  `rank(_:) -> Int` for monotonic comparisons.
- **web** — a `SCHOOL_STATUS_ORDER: SchoolStatus[]` constant (e.g.
  `constants/schoolStatus.ts`) replacing the stale `useSchools` doc comment and
  the partial `SchoolForm` options.
- Both lists MUST be identical. Add a parity test on each side asserting the
  ordered value list matches the agreed spec.

Monotonic enforcement: auto-advance only ever moves a school to a **higher-rank**
stage; never downgrades. Manual edits may move anywhere (user override), but the
form should present stages in canonical order.

---

## Auto-advance rules (phase in)

| Event | Advance to (if current rank lower) |
|-------|-----------------------------------|
| Interaction logged | `contacted` |
| Camp-invite / inbound interaction | `recruited` (future) |
| Visit event (invited/scheduled/past) | `visiting` (future) |
| Offer logged | `offer_received` (future) |

Implement at the **DB layer** (triggers) so both platforms share behavior with
no app code — the interaction→contacted trigger already exists
(`advance_school_status_on_interaction`). Extend the same pattern for
offer/visit in later phases. Each trigger must:
- Compare current stage rank; only advance forward.
- Write a `school_status_history` row (`changed_by` = the actor uuid;
  `previous_status`/`new_status`).
- Be `SECURITY DEFINER` with `search_path = public, pg_temp`.

---

## Stats impact

- **"Contacted" stat (Q2 resolved)** — count of schools with **≥1 interaction**
  (activity-derived), NOT `status == 'contacted'` and NOT cumulative rank. This
  decouples the stat from the status field entirely and matches the dashboard's
  interaction semantics. Apply identically iOS (`SchoolsListViewModel.analytics`)
  + web (`useSchoolStats`). Any interaction type counts as a contact (consistent
  with the dashboard interaction count).
- **"Visited" stat** — already interaction/event-derived on iOS
  (`visitedSchoolIds`); reconcile with new `visiting` stage.

---

## UI

- **Stepper / progress indicator** on the school detail (both platforms) showing
  the ordered stages, current stage highlighted, terminal off-ramp shown
  distinctly. Platform-idiomatic chrome, identical stages/labels/order.
- **Status picker** lists stages in canonical order (drop the partial 6-value
  web form list; expose the full progress set + off-ramp).
- **Favorite star** unchanged; messaging/onboarding copy clarifies favorite =
  "I like it", status = "where it is in the process".

---

## Migration plan (phased)

1. **Constants + parity tests** — land `SCHOOL_STATUS_ORDER` (web) and ordered
   `SchoolStatus` (iOS) with matching values + tests. No data change.
2. **DB enum reconciliation + data migration** — add any missing values
   (`visiting`), migrate existing rows per the map above, set `is_favorite` for
   old `interested`. History rows for each status change. Apply to prod via
   Supabase migration.
3. **Stat definition** — switch "Contacted" (and any stage stat) to the agreed
   cumulative definition on both platforms; update tests.
4. **Auto-advance triggers** — keep interaction→contacted; add visit/offer
   triggers.
5. **UI** — status picker (canonical order) + stepper on both platforms.
6. **Cleanup** — remove stale `useSchools` doc order, iOS `unknown`, web
   `declined` once data migrated.

Each phase: build gate per platform (`npx tsc --noEmit` web,
`xcodebuild build` iOS), parity diff, commit + push **both repos same turn**.

---

## Open questions

**Resolved 2026-08-21:**
- Q1 — `interested` → favorite flag; `contacted` if ≥1 interaction else `researching`.
- Q2 — "Contacted" stat = schools with ≥1 interaction (activity-derived).
- Q3 — drop `recruited`; collapse camp_invite/recruited/official_visit_* → `visiting`.

**Still open (non-blocking, defaults chosen):**
4. Should `not_pursuing` be reversible (re-open), and does re-opening reset stage?
   *(Default: reversible via manual status change; no auto-reset.)*
5. Do we surface auto-advance to the user (toast: "Ashland moved to Contacted")?
   *(Default: no toast for now; revisit after stepper ships.)*
6. `visiting` — one stage (chosen). Stepper shows a single Visiting node.

---

## Already shipped (interim)

- Migration `20260828000001_advance_school_status_on_interaction` — trigger +
  backfill: researching/NULL → contacted on interaction.
- Migration `20260828000002_advance_from_interested` — widened to include
  `interested`; backfilled. (owen@andrikanich.com: Ashland `interested`→`contacted`,
  now shows 1 contacted.)
- Both applied to prod (`Recruiting Tracker 2025`, `xpxzhqghxecsjhvklsqg`).
- iOS required **no** code change — stat already reads `status == 'contacted'`.
