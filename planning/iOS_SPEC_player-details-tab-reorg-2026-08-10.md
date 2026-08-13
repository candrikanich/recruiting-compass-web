# iOS Spec — Player Details Tab Reorg + Multiple Travel Teams

> **Prepared:** 2026-08-10
> **Web branch:** `develop` (PR #361 merged — commits `044b2e14`, `43f2628b`, `1e8dbed4`)
> **Purpose:** Bring the iOS Player Details screen to parity with the reorganized web Player Details tabs — most of the reorg is already present on iOS, so this is a **delta spec**. The one substantive new feature is **multiple travel teams**.

---

## TL;DR — What Actually Needs Building

The web PR did three things. Against the **current** iOS build:

1. **Tab reorg (Contact/Social → Basics, High School → Academics)** — **ALREADY DONE on iOS.** iOS `BasicsTab` already holds Contact + Social + College Preferences; iOS `AcademicsSocialTab` already holds High School + Academics + Core Courses. No structural work needed. Verify only.
2. **Multiple travel teams** — **GAP. This is the real work.** iOS still models a single travel team (scalar fields) and renders one Travel Team card in `HistoryTab`. Needs a `travel_teams` array + repeatable add/remove UI.
3. **Polish (`1e8dbed4`)** — mostly minor. **Video 'other' platform** needs a small write-side fix; **ID helper links** are a nice-to-have; label-wrap is web-CSS-only (N/A).

There is **no prior iOS profile-tab spec** in `planning/` — this is the first.

---

## Parity Report: Player Details Tabs

### UI Screens / Tab Structure
| Tab (web) | Web contents | iOS tab | iOS contents | Status |
|---|---|---|---|---|
| Basics | Photo, Grad Year, Primary Sport, Recruiting Email/Phone + share toggles, Social handles, Campus Size, Cost Sensitivity | `BasicsTab` | Photo, Basic Info (grad/sport), Contact + toggles, Social, College Prefs | **MATCH** |
| Athletics | Height/Weight, `{Sport} Details` (bats/throws + positions), Recruiting DB IDs + helper links, Video Links | `AthleticsTab` | Physical, sport details, IDs, Video Links | **PARTIAL** (helper links + video 'other') |
| Academics | High School (name/city/state), Academic Standing (GPA/SAT/ACT), Core Courses | `AcademicsSocialTab` (title shows "Academics") | High School, Academics, Core Courses | **MATCH** |
| History | HS Career (9–12 team/coach), **Travel Teams (repeatable)** | `HistoryTab` | HS Career, **Travel Team (single)** | **GAP** |
| Public Profile | ProfileSetup + ProfilePreview | — | Not in this screen on iOS | Out of scope (web-only tab here) |

> Note: the iOS view file is still named `AcademicsSocialTab.swift`, but its segmented-control title is "Academics" and it no longer contains Social (Social lives in `BasicsTab`). Web parity is satisfied; a rename is optional cleanup, not required.

### Data Models
| Field | Web (TS) | iOS (`PlayerDetails.swift`) | Status |
|---|---|---|---|
| `travel_teams: TravelTeam[]` | ✓ (new) | missing | **GAP** |
| `travel_team_year/name/coach` (legacy scalars) | ✓ | ✓ (`travelTeamYear/Name/Coach`) | MATCH (keep) |
| `core_courses: string[]` | ✓ | ✓ (`coreCourses`) | MATCH |
| `nces_school_id` | ✓ | missing | Pre-existing gap (see Notes) |
| VideoLink `platform` incl. `"other"` | ✓ | `.unknown` catch-all | **PARTIAL** (write-side) |

### Summary
Total checked: 10 · MATCH: 6 · GAP: 2 (travel_teams, video 'other' write) · PARTIAL: 2 · Out of scope: 1 (Public Profile, NCES).
**Recommendation:** BUILD — focused on multiple travel teams; small follow-ups for video 'other' and helper links.

---

## What iOS Needs to Build

### 1. Multiple Travel Teams (primary)

**Model — add to `PlayerDetails.swift`:**

```swift
struct TravelTeam: Codable, Equatable, Sendable {
    var year: Int?
    var name: String?
    var coach: String?
    // Keys are plain (year/name/coach) — these are object keys INSIDE the
    // travel_teams JSON array, NOT snake_cased top-level prefs fields.
}
```

Add the property + CodingKey:
```swift
var travelTeams: [TravelTeam]?
// ...
case travelTeams = "travel_teams"
```
Keep the existing scalar `travelTeamYear/Name/Coach` + their CodingKeys — they stay as the mirror of the most-recent team (edit-history labels + the coach-outreach template resolver still read them).

**Load logic (mirror web `usePlayerDetailsForm.load`):**
- If decoded `travel_teams` is non-empty → use it.
- Else **seed** a single-element array from the legacy scalars if any of `travelTeamYear/Name/Coach` is set (web calls this `buildLegacyTravelTeam`). If all three are empty → empty array.

**Save logic (mirror web autosave `onSave`):**
1. Drop fully-empty rows — keep a row only if `year != nil || name non-empty || coach non-empty`.
2. Sort surviving rows by `year` descending; take the first as `latest`.
3. Write `travel_teams` = filtered array, and mirror `latest` back onto the scalar fields: `travel_team_year = latest?.year`, `travel_team_name = latest?.name ?? ""`, `travel_team_coach = latest?.coach ?? ""`.

**History tab UI (`HistoryTab.swift`):** replace the single Travel Team card with a repeatable list:
- One editable row per team: Season Year (numberPad), Organization, Head Coach, plus a trash/delete control.
- "Add Travel Team" button appends a blank row `{ year: nil, name: "", coach: "" }`.
- Empty-state text when the list is empty (web copy: "No travel teams added yet.").
- Web helper copy above the list: "Add each org you've played for — most recent shows on your profile."
- Deleting a row triggers a save; field edits mark changed / autosave as elsewhere.

### 2. Video 'other' platform (small, `AthleticsTab` / VideoLinks)

Web widened the video platform enum to `hudl | youtube | vimeo | other`, and the **DB CHECK constraint was widened live** (`20260821000000_video_links_platform_other`).
- **Read side is already safe:** iOS `VideoLinkPlatform(from:)` maps any unrecognized raw → `.unknown` (displayName already "Other"), so a `platform = 'other'` row decodes without crashing.
- **Write-side GAP to verify/fix:** iOS's catch-all raw value is `"unknown"`, but the widened web/DB vocabulary is `"other"`. If iOS ever writes `platform = "unknown"` and the CHECK constraint no longer permits it, the write fails. Recommended: add a real `case other = "other"` (or map the catch-all's *encoded* value to `"other"`) and expose it in `selectable` so users can pick "Other" like the web does. Confirm the live CHECK constraint's allowed set before finalizing.

### 3. Recruiting-DB ID helper links (nice-to-have, `AthleticsTab`)

Web added external links under each Recruiting DB ID field. Optional on iOS (e.g. small `Link` under each field):
- NCAA ID → `https://web3.ncaa.org/ecwr3/` ("Register at NCAA Eligibility Center")
- Perfect Game ID (baseball/softball only) → `https://www.perfectgame.org/` ("Get your Perfect Game profile")
- Prep Baseball ID (baseball/softball only) → `https://www.prepbaseballreport.com/` ("Get your Prep Baseball Report profile")

---

## API / Persistence

No REST endpoints changed. Player Details persist as a **jsonb blob in `user_preferences`** (player-prefs category) via the existing preferences service — the same path iOS already uses. `travel_teams` is just a new key inside that blob; **no schema/migration** is required for it (the web PR added none for travel teams).

iOS only round-trips fields present in its own `CodingKeys`, so adding `travel_teams` to the Swift model is sufficient for it to persist. (The web-side "core_courses reload drop" bug — where `validatePlayerDetails` stripped un-whitelisted keys — was a **web client** quirk and does not affect iOS, since `coreCourses` is already a first-class Codable field on iOS.)

---

## Business Rules to Enforce Client-Side

- **Travel team empty-row pruning:** never persist a row where all of year/name/coach are empty (matches web `toTravelTeams` + autosave filter).
- **Most-recent mirroring:** the scalar `travel_team_*` fields must always equal the highest-`year` surviving row after each save. Do not let them drift.
- **Core courses:** max 20; de-dupe on add (web ignores a duplicate trimmed value); trim whitespace. (Already largely handled by `CoreCoursesEditor`.)
- **Video links:** max 5; URL must parse before a link is created.

---

## Excluded Items (No iOS Work Needed)

- **DB migrations** — video 'other' CHECK already applied live; travel teams needs none.
- **RLS / server validation** — server-enforced.
- **Public Profile tab** — web-only surface on this screen; not part of iOS Player Details.
- **Label-wrap CSS** (`whitespace-nowrap` on Basics labels) — web layout only.
- **Email / CSRF** — N/A.

---

## Dependencies

- Existing iOS `PlayerDetailsViewModel` + preferences service (already wired).
- Existing `PlayerDetails` Codable model (extend, don't replace).
- Existing `CoreCoursesEditor`, `VideoLinksEditorView` (reuse).

None new.

---

## Notes for iOS Claude

- **The reorg is mostly done.** Don't re-plumb Basics/Academics tabs — verify they match and move on. The headline task is the repeatable Travel Teams list in `HistoryTab`.
- **Scalar travel-team fields are load-bearing** — the coach-outreach template resolver and profile edit-history read `travel_team_name` etc. Keep them and keep them mirrored.
- **`TravelTeam` array keys are NOT snake_case** — they are `year`/`name`/`coach` inside the JSON array. Only top-level prefs keys are snake_cased.
- **Pre-existing divergence (out of scope):** web High School uses an NCES-backed autocomplete (`SharedHighSchoolSearchInput`) writing `nces_school_id`; iOS uses a plain text field with no `ncesSchoolId`. Not introduced by this PR — flagging so it isn't mistaken for new drift. Decide separately whether to close it.
- **Video 'other':** the safest minimal change is write-side (emit `"other"`); confirm the live CHECK constraint's allowed values first via Supabase before shipping a writer.

---

## Test Checklist

1. Open Player Details → History: existing single-team users see their old team pre-seeded as one row (from legacy scalars). Reload → it persists, not dropped.
2. Add two travel teams (e.g. 2023 and 2024) → save → reload → both round-trip; the 2024 row's values appear in the legacy scalar mirror (verify via a surface that reads `travel_team_name`, e.g. a coach-outreach template).
3. Add a blank travel-team row, don't fill it, save → the blank row is NOT persisted.
4. Delete a travel team → save → reload → it's gone and the mirror updates to the next-most-recent.
5. Core Courses: add courses, background/reload the screen → courses persist (regression guard for the web "reload drop" class of bug).
6. Video Links: a link stored with `platform = 'other'` displays as "Other" and does not crash decode; creating a non-Hudl/YT/Vimeo link writes a platform value the DB CHECK accepts.
7. Basics tab shows Contact + Social + College Prefs; Academics tab shows High School + GPA/SAT/ACT + Core Courses (reorg parity confirmation).
