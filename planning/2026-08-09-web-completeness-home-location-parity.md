# Web handoff — profile completeness home-location parity (web undercounts 10%)

**Date:** 2026-08-09
**Target repo:** web (`recruiting-compass` / Next.js — `develop` branch)
**Origin:** iOS repo, live-DB investigation. iOS is correct; web has the bug.

---

## Symptom

Same athlete, same DB, two different completeness numbers:

- **Web** (player self-view, `myrecruitingcompass.com/settings/player-details`): **75%**
- **iOS** (parent view, Player Profile): **85%**

Both platforms share the canonical weighted spec
(`planning/2026-08-09-profile-completeness-canonical-spec.md`). They should match.

## Root cause

Delta is exactly **10%** = one 10-weight field. All in-blob player fields decode
identically from the same `user_preferences.category='player'` row, so the divergent
field must be a **decoupled signal** (home-location or highlight-video — the two
values fetched separately from outside the player blob).

- Highlight-video (15%) is absent on **both** — the `video_links` table does not
  exist in prod yet, so both platforms score it 0. Not the delta.
- **Home-location (10%) is the divergent field.** iOS reads it from
  `user_preferences` where `category='location'` and counts it present. Web reads
  `signals.isHomeLocationPresent` from the wrong/empty source (the dead
  `family_units` columns) → scores it 0 → 75%.

## Ground-truth data (prod, project `xpxzhqghxecsjhvklsqg`)

Athlete `user_id = 3d97c4dc-aa34-45bc-bcc3-511d97577796` (grad 2028, Baseball, Olmsted Falls):

`user_preferences` row, `category='location'`:
```json
{ "zip": "44138", "city": "Olmsted Township", "state": "OH",
  "address": "9866 Ethan circle", "latitude": 41.352414, "longitude": -81.939227 }
```

Home-location IS set (zip non-empty AND coords present). Web must count it → should
be 85%, matching iOS.

Per-field breakdown (video absent → max 85):

| Field | Wt | Present |
|---|---|---|
| grad year | 10 | ✅ 2028 |
| sport | 10 | ✅ Baseball |
| position | 10 | ✅ Infielder |
| **home location** | 10 | ✅ zip + coords — **web currently scores 0 (bug)** |
| gpa | 15 | ✅ 3.8 |
| SAT/ACT | 10 | ✅ 1200 / 32 |
| highlight video | 15 | ❌ no `video_links` table (both platforms 0) |
| height | 5 | ✅ 73 |
| weight | 5 | ✅ 170 |
| phone | 10 | ✅ 2165534996 |

Correct total = **85**. iOS = 85 ✅. Web = 75 ❌.

## The fix (web)

In `calculateProfileCompleteness(profile, signals)`, `signals.isHomeLocationPresent`
must be computed the same way iOS does.

**Canonical home-location "present" rule** (matches iOS `HomeLocation.isSet`):

```ts
// zip non-empty OR both coords set
const isHomeLocationPresent =
  (loc?.zip?.trim() ?? '') !== '' ||
  (loc?.latitude != null && loc?.longitude != null);
```

**Source of `loc`:** `user_preferences` where `user_id = <athlete>` and
`category = 'location'`, reading the `data` jsonb. **Not** `family_units` columns
(those are dead — see iOS memory `lessons-learned`). For the athlete's `user_id`,
use the profile being scored (in parent/family context, the athlete's id, not the
viewer's).

## iOS reference (canonical, do not change)

- `HomeLocation.isSet` — `Features/Preferences/Models/HomeLocation.swift`
  ```swift
  var isSet: Bool {
    !(zip ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      || (latitude != nil && longitude != nil)
  }
  ```
- Fetched in `PlayerDetailsViewModel.loadCompletenessInputs()` from
  `preferenceService.fetchPreferences(category: .location, userId: targetUserId)`.
- Scorer: `PlayerDetails.completenessScore(hasHighlightVideo:hasHomeLocation:)`.

## Verify

After fix, web player-details for athlete `3d97c4dc...` should read **85%**
(matching iOS). When a `video_links` row is later added for that athlete, both
platforms jump to **100%**.

## Out of scope

- iOS — no change. iOS is arithmetically correct.
- `video_links` table creation — separate cross-platform work
  (`video-links-cross-platform`). Both platforms already score video 0 until it lands.

---

## RESOLUTION (2026-08-09, later) — home-location was a MISDIAGNOSIS

This handoff's premise (web undercounts because it reads home-location from a
dead source) was **wrong**. Live bisection on prod (player1) proved
home-location always counted. The real 10% gap was **`primary_position` being
silently wiped on every page load**:

`usePlayerDetailsForm.ts` watches `primary_sport` and cleared `primary_position`
when it wasn't in the sport's canonical option list — and it fired on the
INITIAL load too. Stored labels like `Infielder` (baseball) / `Point Guard`
(basketball) aren't in the web dropdown's abbreviations (`SS`,`PG`,…) → wiped →
completeness scored position 0 → web 75 vs iOS 85.

Fixed in **#352** (`shouldClearPositionOnSportChange` + `reconcilePositionOptions`
in `utils/positions.ts`); promoted to prod via **#353**. Verified live: player1
40→50 after the fix. Home-location parity (#349) was real and already correct —
just not the cause of the 75.
