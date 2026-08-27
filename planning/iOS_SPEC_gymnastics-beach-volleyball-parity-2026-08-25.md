# iOS Spec — Gymnastics + Beach Volleyball Sport Parity

> **Prepared:** 2026-08-25
> **Web branch:** `feat/add-gymnastics-beach-volleyball`
> **Web commits:** `672fb0b2` (registry add), `18cdcab7` (WGYM calendar + first-class men's events)
> **Purpose:** Bring iOS to parity after web extended the canonical sport vocabulary from 17 → 19 (adds Gymnastics and Beach Volleyball) across positions, metrics, calendar, and the derived services/attributes registries.

---

## Feature Overview

The web app now supports two additional sports everywhere a sport is selectable or drives sport-aware UI: **Gymnastics** and **Beach Volleyball**. An athlete can pick either during onboarding, log sport-specific metrics for them, see their canonical "positions" (Gymnastics events / Beach Volleyball roles), get the NCSA recruiting-profile link, and see a recruiting calendar. Women's Gymnastics gets a real NCAA recruiting calendar; men's Gymnastics and Beach Volleyball fall back to the generic "Other" track (no published NCAA calendar of their own — same treatment as Tennis/Water Polo).

This is a **pure data-registry parity task** — no new screens, no new API endpoints, no server work. Everything is client-side constants that must be added to the Swift registries in lockstep, exactly as the web did.

---

## Web Implementation Summary

### Files Changed (web)
- `utils/positions/canonical.ts` — added `Gymnastics` (9 events) and `Beach Volleyball` (2 roles) to `SPORT_POSITIONS`.
- `utils/metrics/canonical.ts` — added 9 Gymnastics judged-score `MetricDef`s, mapped `SPORT_METRICS` for both sports (Beach Volleyball reuses indoor Volleyball keys), added emoji icons for the 9 gym keys.
- `utils/recruitingCalendar/types.ts` — `AppSport` union += `Gymnastics`, `Beach Volleyball`; `NcaaCalendarKey` union += `OTHER_WGYM`.
- `utils/recruitingCalendar/resolver.ts` — Gymnastics added to `GENDER_SPLIT_SPORTS` (`men → "Other"`, `women → "OTHER_WGYM"`); Beach Volleyball falls through to generic `"Other"`.
- `utils/recruitingCalendar/calendarData.ts` — new `OTHER_WGYM` calendar (7 real windows) registered in `D1_CALENDARS`.
- `utils/services/canonical.ts` — **no edit needed**: `ALL_SPORTS = Object.keys(SPORT_POSITIONS)`, so NCSA (offered for all sports) auto-covers both new sports once positions are added.
- `utils/attributes/canonical.ts` — **no edit needed**: both new sports are intentionally absent → `attributesForSport` returns `[]`.

### DB/Migration Changes
None. Sport is stored as a free-text string; no schema, enum, or migration involved. Nothing to apply.

---

## What iOS Needs to Build

All edits are in `TheRecruitingCompass/TheRecruitingCompass/Core/Utilities/` unless noted. Ignore the stale `.claude/worktrees/...` duplicate copies.

### 1. Positions — `CanonicalPositions.swift` (`bySport`, lines ~14–34)

This is the iOS single source of truth (17 sports today). Add two keys:

```swift
"Gymnastics": [
  "All-Around",
  "Vault",
  "Uneven Bars",
  "Balance Beam",
  "Floor Exercise",
  "Pommel Horse",
  "Still Rings",
  "Parallel Bars",
  "Horizontal Bar"
],
"Beach Volleyball": ["Blocker", "Defender"],
```

Order matters — match web exactly (All-Around first; women's events, then men's-only events). No abbreviation-table entries needed (web has none for these).

### 2. Metrics — `MetricRegistry.swift`

**a. New MetricDefs.** Add a `gymnastics` def array (mirror web `gymnasticsDefs`) and concatenate it into `allDefs`/`defs`. Nine judged scores, all `.decimal` with 3 fractional digits, higher-is-better (do NOT set `lowerIsBetter`), unit empty:

| key | label | format |
|---|---|---|
| `aa_score` | All-Around Score | decimal(3) |
| `vault_score` | Vault Score | decimal(3) |
| `floor_score` | Floor Exercise Score | decimal(3) |
| `bars_score` | Uneven Bars Score | decimal(3) |
| `beam_score` | Balance Beam Score | decimal(3) |
| `pommel_score` | Pommel Horse Score | decimal(3) |
| `rings_score` | Still Rings Score | decimal(3) |
| `pbars_score` | Parallel Bars Score | decimal(3) |
| `high_bar_score` | High Bar Score | decimal(3) |

**b. `sportMetrics` map** (lines ~74–94) — add the ordering arrays:

```swift
"Gymnastics": [
  "aa_score", "vault_score", "floor_score", "bars_score", "beam_score",
  "pommel_score", "rings_score", "pbars_score", "high_bar_score"
],
// Beach Volleyball reuses the indoor Volleyball metric keys — NO new defs.
"Beach Volleyball": ["kills", "aces", "digs", "blocks", "hitting_pct"],
```

Confirm those five Volleyball keys (`kills`, `aces`, `digs`, `blocks`, `hitting_pct`) already exist in the iOS Volleyball defs and reuse them verbatim — Beach Volleyball must NOT introduce new defs.

**c. `iconByKey`** (SF Symbols, lines ~25–69) — add SF Symbol entries for the 9 gym keys. Web uses the 🤸 emoji for all nine; pick one consistent SF Symbol for all nine (e.g. `figure.gymnastics` if it renders on the deployment target, else `figure.mixed.cardio` or your existing generic-athletic fallback). Values are intentionally per-platform (web emoji ≠ iOS SF Symbol), so exact-match is not required — consistency across the nine keys is.

**d. `sportMetricGroups`** — **no change.** Web left Gymnastics/Beach Volleyball out of the "dense sport" section-header map; they render as a flat metric list. Do the same on iOS.

### 3. Attributes — `AthleteAttributes.swift` — NO CHANGE

Both new sports are intentionally absent from `bySport`, so `servicesForSport`/attribute lookup returns `[]` (no laterality/handedness attribute for either). Verify the lookup path returns empty gracefully for an unknown sport key; do not add entries.

### 4. Services — `RecruitingServices.swift` — NO CHANGE (verify only)

`isKnownSport` delegates to `CanonicalPositions.bySport.keys`, and NCSA's gate is `nil` (= all known sports). Once step 1 adds the two positions keys, `servicesForSport("Gymnastics")` and `servicesForSport("Beach Volleyball")` will automatically return NCSA (and any other all-sports service). No edit — but add/confirm a test asserting both resolve to NCSA.

### 5. Recruiting Calendar — `RecruitingCalendar/RecruitingCalendar.swift` + `RecruitingCalendarData.swift`

**a. `NcaaCalendarKey` enum** (RecruitingCalendar.swift ~8–13) — add one case:

```swift
case otherWGYM = "OTHER_WGYM"
```

(21 → 22 keys.)

**b. `genderSplitSports`** (~102–108) — add Gymnastics. Women → `OTHER_WGYM`; men → generic `.other`. Only women's gym has a distinct table in the "Other" bundle PDF; men's gym is folded into "All Other Sports".

```swift
"Gymnastics": (men: .other, women: .otherWGYM),
```

**c. Beach Volleyball** — add **nothing** to the mapping dicts. It has no published calendar, so `resolveKey` must fall through to `.other` (the generic default). Verify the fallback path already returns `.other` for an unmapped-but-known sport (it does today for Tennis/Water Polo).

**d. New `OTHER_WGYM` calendar** in `RecruitingCalendarData.swift` — add an `otherWGYM: SportCalendar` and register it in `d1Calendars` (~583–589). Source = `otherSource` (the shared "Other" bundle PDF constant); `verifiedOn = "2026-08-25"`; `milestones = []`. Seven periods, all `confidence: .high`:

| type | start | end | description |
|---|---|---|---|
| dead | 2026-11-09 | 2026-11-12 | Dead Period — Monday through Thursday of the initial week for the fall signing date for athletics aid agreements |
| recruiting_shutdown | 2026-11-26 | 2026-11-29 | Recruiting Shutdown — Thanksgiving Day to the Sunday after Thanksgiving |
| dead | 2026-12-01 | 2026-12-30 | Dead Period, Dec 1–30 (label only) |
| dead | 2027-04-14 | 2027-04-18 | Dead Period — The day before the first day of the National Collegiate Gymnastics Championships to noon on the day after the championships (effective noon) |
| dead | 2027-05-11 | 2027-05-13 | Dead Period — The first day to last day of the coaches association convention |
| quiet | 2027-05-17 | 2027-05-23 | Quiet Period — Monday to Sunday after the USA Gymnastics Developmental Nationals |
| dead | 2027-06-01 | 2027-06-15 | Dead Period, Jun 1–15 (label only) |

Match the PeriodType enum spelling used in iOS (web uses `dead`, `recruiting_shutdown`, `quiet`). Dates are `YYYY-MM-DD` local-date strings, same format as existing calendars.

### 6. Onboarding sport list — `Features/Onboarding/Utilities/OnboardingConstants.swift`

`commonSports` (lines ~7–11) is a **hardcoded 17-sport list** that mirrors `CanonicalPositions.bySport.keys` but is NOT derived from it. Add `Gymnastics` and `Beach Volleyball` so both are selectable in onboarding (`SportGateView` derives its picker from `CanonicalPositions.bySport.keys.sorted()`, so it updates automatically — but `commonSports` must stay in sync). Best fix: either add the two strings, or (preferred, prevents future drift) derive `commonSports` from `CanonicalPositions.bySport.keys`.

---

## Data Models (Swift)

No new structs. All work reuses existing types: `MetricDef`, `MetricGroup`, `AttributeDef`, `ServiceDef`, `RecruitingPeriod`, `SportCalendar`, `NcaaCalendarKey`. The only type-level change is the new `NcaaCalendarKey.otherWGYM` case.

---

## Business Rules to Enforce Client-Side

- **Gymnastics metrics are higher-is-better** — do not flag any of the 9 as `lowerIsBetter`. (Judged scores; higher wins.)
- **Beach Volleyball must not create new metric defs** — it reuses the exact five indoor Volleyball keys. Introducing duplicates will break the "one def per key" registry invariant.
- **Position/event order is load-bearing** — Gymnastics lists All-Around first, then women's events, then men's-only events, matching web. Keep the order.
- **Calendar gender resolution:** Gymnastics + `gender == female` → `OTHER_WGYM`; Gymnastics + any other/nil gender → `.other` (men's default). Match the web `isMen` convention: anything not `"female"` (case-insensitive) is treated as men's.
- **Beach Volleyball always resolves to `.other`** regardless of gender/division — it's not in any mapping dict.

---

## Excluded Items (No iOS Work Needed)

- **DB migrations / RLS** — sport is a plain string; no schema change.
- **API endpoints** — none added or changed; sport-aware behavior is all client-side constants.
- **Attributes registry** — both sports intentionally return `[]`; no entry.
- **Services registry** — NCSA auto-covers via the positions-derived known-sport set; no entry (verify only).
- **`sportMetricGroups`** — new sports render flat, no section headers (matches web).
- **Men's Gymnastics / Beach Volleyball calendars** — both correctly route to the generic `.other` track; no dedicated calendar data.
- **NCAA cycle-checker job** — web-only script; women's gym rides in the "Other" bundle PDF the quarterly checker already HEAD-checks. No iOS analog.

---

## Dependencies

None — self-contained. All edited registries already exist in iOS; this only adds keys/cases to them.

---

## Notes for iOS Claude

- **`CanonicalPositions.bySport` is the SSOT.** Add the two sports there first; services (known-sport gate) and the `SportGateView` picker derive from it and update for free. `OnboardingConstants.commonSports` is the one hardcoded list that does NOT auto-derive — sync it (or refactor to derive).
- **Pre-existing drift to flag, not necessarily fix here:** `Features/Family/Utilities/FamilyConstants.swift` `enum Sports.all` is a separate hardcoded **13-sport** list already missing Field Hockey, Ice Hockey, Rowing, and Water Polo. It's out of parity independent of this change. Decide whether to add the 2 new sports there too, or (better) fold this into a "derive FamilyConstants from CanonicalPositions" cleanup. Call it out to Chris rather than silently widening scope.
- **Icons are per-platform by design** — don't try to match the web 🤸 emoji; use a consistent SF Symbol across all nine gym keys.
- **Add the web's two regression guards** if iOS has equivalents: a full-vocabulary snapshot test (every sport's exact position list) and an explicit sport-key-set assertion, so a future add/drop/rename fails loudly. Web added both in this change.
- Beach Volleyball is a genuinely different sport from indoor Volleyball (2-player, two roles) — it's a distinct sport key, not a variant of "Volleyball". It only *reuses the metric vocabulary*.

---

## Test Checklist

1. **Onboarding** — select Gymnastics; sport saves; positions picker shows the 9 events in order (All-Around first). Repeat for Beach Volleyball → shows Blocker/Defender.
2. **Metrics logging (Gymnastics)** — the metric picker offers the 9 judged scores as a flat list (no section headers); each accepts a 3-decimal value; higher values rank better in any comparison UI.
3. **Metrics logging (Beach Volleyball)** — picker offers kills/aces/digs/blocks/hitting_pct, reusing the indoor Volleyball defs (labels/units identical); no duplicate-def crash.
4. **Services** — open recruiting-services for a Gymnastics athlete and a Beach Volleyball athlete → NCSA link present for both.
5. **Attributes** — Gymnastics and Beach Volleyball athletes show no laterality/handedness attribute (empty), no crash.
6. **Calendar — women's Gymnastics** — a female Gymnastics athlete resolves to `OTHER_WGYM`; the 7 windows appear; Nov 9–12 and Dec 1–30 report as dead periods; May 17–23 reports as quiet.
7. **Calendar — men's Gymnastics** — a male/unspecified-gender Gymnastics athlete resolves to the generic `.other` track (NOT OTHER_WGYM).
8. **Calendar — Beach Volleyball** — resolves to the generic `.other` track for any gender/division.
9. **Regression** — all 17 existing sports still resolve to their prior calendar keys, positions, and metrics unchanged (run the full-vocabulary snapshot guard).
