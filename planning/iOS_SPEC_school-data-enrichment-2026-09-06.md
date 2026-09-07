# iOS Spec — School Data Enrichment (Mascot / Colors / Conference URL / Scholarship Limits)

> **Prepared:** 2026-09-06
> **Web branch:** `develop` (PR #633, merged)
> **Purpose:** Bring iOS school detail to parity with web's issue #584 build — editable mascot + school colors, an auto-resolved conference website link, and a scholarship-limit reference line on the College Data section.

---

## Feature Overview

On the school detail screen, the user can now see and edit a school's mascot name and two brand colors alongside existing contact info. The school's conference (already tracked) now renders as a clickable link to that conference's official site, resolved from a static client-side lookup table — this field is never user-edited. The College Data section gains a single reference line showing the NCAA scholarship limit for the athlete's sport at that school's division (e.g. "Athletic Scholarships: 11.7 equivalency (D1 Baseball)"), sourced from a new read-only reference table. The scholarship line and colors/mascot are additive — their absence (unseeded table, no colors set) hides the row/line entirely rather than showing an empty state.

---

## Web Implementation Summary

### Files Changed
- `supabase/migrations/20260923000000_school_mascot_colors_scholarship_limits.sql` — schema (see below)
- `data/conferenceUrls.json` — static ~30-entry conference-name → URL map
- `utils/conferenceUrls.ts` — `getConferenceUrl(conference)` pure lookup
- `utils/scholarshipLimits.ts` — `selectScholarshipLimit()` + `formatScholarshipLine()` pure functions
- `composables/useScholarshipLimits.ts` — module-cached loader for `scholarship_limits` table, fails open
- `composables/useSchoolBasicInfo.ts` — added `mascot`/`school_colors` to the edit-form init/save round-trip
- `types/models.ts` — `School.mascot?: string | null`, `School.school_colors?: string[] | null`
- `components/School/SchoolInformationCard.vue` — Mascot + School Colors edit fields, matching display rows, Conference link, scholarship stat row
- `components/School/SchoolDetailHeader.vue` — mascot subtitle line + color swatches next to the logo
- `pages/schools/[id]/index.vue` — wires athlete sport + school division through `useScholarshipLimits` into a `scholarshipLine` computed, loaded `onMounted`

### DB/Migration Changes (ALREADY APPLIED LIVE — no iOS action needed)
- `schools.mascot text` — new real column, backfilled from legacy `academic_info->>'mascot'` JSONB field (that JSONB field is untouched, still present for backward compat — iOS's existing `AcademicInfo.mascot` stays as-is; the new top-level `School.mascot` is the one to read/write going forward for this feature).
- `schools.school_colors text[]` — new column, array of hex strings, e.g. `{"#660000","#FFFFFF"}`. Web only ever stores 0-2 entries (two color-picker slots in the form) but the column has no length constraint.
- `scholarship_limits` table (`id uuid pk, sport text, division text, total numeric, head_count integer, equivalency numeric, notes text`, unique `(sport, division)`), RLS select-only for `authenticated`. **Currently ships EMPTY** — seed data is a separate, not-yet-done issue breakdown item. Design for zero rows matching: the scholarship line must simply not render, never show a placeholder or error.

---

## What iOS Needs to Build

### Screens

No new screens — this extends the existing School Detail screen (`SchoolDetailView`).

| Screen | Purpose | Entry Point |
|---|---|---|
| `SchoolDetailView` (existing) | Mascot subtitle + color swatches in header; Mascot/Colors edit fields + Conference link in Contact & Social section; scholarship line in College Data section | Existing — no new navigation |

### Navigation

No changes. Edit flow reuses the existing `SchoolBasicInfoSheet` (presented as a sheet from the Contact & Social section's Edit button).

### Section / Component Breakdown

**`SchoolDetailHeader`** (header, next to logo/initials avatar)
- Display: mascot subtitle line under the school name (`"{{school.name}} {{school.mascot}}"`, e.g. "Ohio State Buckeyes") — only when `school.mascot` is non-nil/non-empty.
- Display: a row of small filled circles (color swatches) below the logo, one per entry in `school.school_colors`, background = that hex string, thin border. Only shown when `school_colors` is non-empty.
- Interaction: none — display-only in the header.
- States: absent entirely when mascot/colors are nil.

**`SchoolBasicInfoDisplaySection`** (renamed on web to "Contact & Social" — same section on iOS)
- Display: add a "Mascot:" row (label + value) below existing rows, shown only when `school.mascot` is present.
- Display: add a "Colors:" row showing small circular swatches for each hex in `school.school_colors`, shown only when non-empty.
- Display: add a "Conference:" row — label + a `Link` styled like the existing Website/Athletics rows (external-link icon), `destination` = `getConferenceUrl(school.conference)`. **Not editable** — no edit field for this in the sheet, matches web (auto-resolved, display-only). Row hidden when the lookup returns nil (unknown conference or `school.conference` is nil).
- Interaction: Edit button (existing) opens `SchoolBasicInfoSheet` — add Mascot text field and two color text fields there.
- States: each row appears/disappears independently based on data presence — no shared loading/error state (this data comes from the already-loaded `School` object).

**`SchoolBasicInfoSheet`** (edit form)
- Add a `TextField("Mascot", text: $info.mascot)` row in the "Contact & Social" `Section`, placed after Campus Address (matches web field order: Mascot before School Colors before Twitter).
- Add two color text fields (`TextField("Primary Color (hex)", text: $info.schoolColor1)` / `TextField("Secondary Color (hex)", text: $info.schoolColor2)`) — web uses two free-text hex inputs with a live swatch preview next to each; replicate the swatch preview using a small `Circle().fill(Color(hex:))` if the codebase already has a hex→Color helper (check `Shared/Utilities` for an existing hex-color parser before adding a new one — do not add a new dependency for this).
- No client-side hex-format validation exists on web (any text is accepted, empty means cleared) — do not add stricter validation than the web has.

**`CollegeDataSection`**
- Add a scholarship line: a single row (matches web's "col-span-2 highlighted row" styling — e.g. a `Text` in a light-gray rounded background spanning the row) shown only when a scholarship match is found. Content = `formatScholarshipLine` output (see below). Placed after the existing tuition/admission-rate rows, before the "no data" fallback text.
- The row requires computing sport + division at the `SchoolDetailView`/`SchoolDetailViewModel` level (see Data Flow below) and passing a single `scholarshipLine: String?` down — do not have `CollegeDataSection` load the table itself (mirrors web's page-level load + prop-drill).

---

## API Endpoints to Call

No new Nitro endpoints. This feature is entirely direct Supabase reads (matches iOS's existing pattern of calling Supabase directly for the `schools` table via `SupabaseManager`/`SchoolsRepositoryImpl`).

### Read `scholarship_limits` (direct Supabase table read, not a Nitro route)

```
Supabase table select — mirrors web's useScholarshipLimits
Table: scholarship_limits
Columns: sport, division, total, head_count, equivalency, notes
Auth: any authenticated user (RLS: authenticated SELECT, no ownership scoping — global reference data)
Filter: none server-side — fetch all rows once (table is small, ships empty today), match client-side by (sport, division)
```

Swift equivalent of web's fetch:
```swift
let limits: [ScholarshipLimit] = try await supabaseManager.client
    .from("scholarship_limits")
    .select("sport, division, total, head_count, equivalency, notes")
    .execute()
    .value
```

Fail-open requirement (matches web exactly): if the table doesn't exist yet in some environment, or the request errors, or returns zero rows, or no row matches — the scholarship line must simply not render. Never throw, never block school-detail load, never show an error to the user for this specific fetch. Cache the result in-memory for the life of the screen/session (web caches at module scope for the page load); a plain `static var` cache or a lazy singleton on the repository/view model is sufficient — no need to over-engineer beyond what web does.

### `schools` table update (existing endpoint, extended payload)

The existing `updateBasicInfo` write (already a direct Supabase `.update()` on `schools`) needs two new columns added to its payload:

```
UPDATE schools SET
  mascot = :mascot,          -- null if cleared, matches existing nilIfEmpty pattern
  school_colors = :colors    -- text[], null if both entries empty, else the non-empty entries
WHERE id = :id
```

---

## Data Models (Swift)

### `School` (extend existing entity — additive fields only)

```swift
struct School: Codable, Identifiable, Equatable, Sendable {
    // ...existing fields unchanged...
    let mascot: String?
    let schoolColors: [String]?
}

// CodingKeys additions:
case mascot
case schoolColors = "school_colors"
```

Follow the existing file's pattern exactly: this struct has a hand-written memberwise `init`, a custom `Decodable init(from:)`, and several `with(...)` copy-helper methods that each re-list every field. Adding `mascot`/`schoolColors` means touching:
- the `struct` property list
- the memberwise `init` parameter list + body (default both to `nil` so none of the dozens of existing call sites break, matching how `phone`/`athleticsUrl` were added as defaulted params)
- `CodingKeys`
- the custom `Decodable` initializer (`decodeIfPresent`)
- every existing `with(...)` helper's internal `School(...)` reconstruction call (pass through `mascot: mascot, schoolColors: schoolColors` unchanged in each)

### `ScholarshipLimit` (new)

```swift
struct ScholarshipLimit: Codable, Sendable {
    let sport: String
    let division: String
    let total: Double?
    let headCount: Int?
    let equivalency: Double?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case sport, division, total, notes
        case headCount = "head_count"
        case equivalency
    }
}
```

### `EditableBasicInfo` (extend existing struct)

```swift
struct EditableBasicInfo {
    // ...existing fields unchanged...
    var mascot: String = ""
    var schoolColor1: String = ""
    var schoolColor2: String = ""

    static func from(school: School) -> EditableBasicInfo {
        EditableBasicInfo(
            // ...existing...
            mascot: school.mascot ?? "",
            schoolColor1: school.schoolColors?[safe: 0] ?? "",
            schoolColor2: school.schoolColors?[safe: 1] ?? ""
        )
    }
}
```

Web models `school_colors` as a fixed 2-tuple form field (`[string, string]`) even though the DB column is an unbounded array — replicate that exact simplification on iOS (two fixed slots, not a dynamic list), since that's what the web edit form actually offers today. Use whatever safe-subscript helper the codebase already has (grep for `[safe:` before adding a new one).

---

## Business Rules to Enforce Client-Side

- **Mascot/colors are free text, no validation.** Web enforces nothing beyond "empty means null on save" — do not add hex-format regex validation, that would be stricter than web and create a parity gap the other direction.
- **School colors save as `null` when both are empty, never `[]`.** Matches web's `.filter(Boolean).length > 0 ? [...] : null` — an empty array and a null column would render identically in the UI, but keep the write semantics identical to web to avoid unexplained diffs if either platform is ever debugged against raw DB rows.
- **Conference URL is an exact, case-sensitive string match** against the static lookup table keyed by conference name (see `data/conferenceUrls.json` list above — hardcode the same ~30 entries as a Swift `[String: String]` constant, or a bundled `.json` resource file read once). A miss is silent — no row renders, not an error state.
- **Scholarship line requires BOTH sport and division to be non-nil**, else don't attempt a match (mirrors web's early-return). Sport comes from the athlete's `PlayerDetails.primarySport` (or whatever the currently-active athlete's stored sport field is called on iOS — verify against `PlayerDetails.swift`), division from `school.division`. Match is case-normalized on sport (`.lowercased()`) but exact-case on division (web does the same asymmetry — replicate it, don't "fix" it here).
- **Scholarship line formatting priority: equivalency → head_count → total → generic "see (Division Sport)" fallback.** Replicate `formatScholarshipLine`'s exact branch order and capitalization (`capitalize(sport)` — first letter uppercased only, rest untouched).

---

## Excluded Items (No iOS Work Needed)

- **DB migration** — already applied to production (`schools.mascot`, `schools.school_colors`, `scholarship_limits` table + RLS policy). Nothing to run.
- **RLS policies** — enforced by Supabase server; `scholarship_limits` SELECT policy already live for all `authenticated` users.
- **Scholarship seed data** — table currently ships empty; seeding is a separate open issue-breakdown item on the web side. iOS should build against an empty table (i.e., the scholarship line simply won't appear yet in any environment) — do not block this spec on seed data landing.
- **CSRF tokens** — N/A, this is direct Supabase access, not a Nitro API route.
- **Conference URL data curation** — the ~30-entry list is finalized on web; iOS just needs to port the same static data, not maintain its own curation process.

---

## Dependencies

None — self-contained. Builds on the existing School Detail screen, `SchoolsRepositoryImpl`, `SchoolBasicInfoSheet`, and `CollegeDataSection`, all of which already exist in iOS.

---

## Notes for iOS Claude

- `AcademicInfo` already has a `mascot: String?` field (legacy JSONB-embedded value, visible in `CollegeDataSection`'s preview mock). Do NOT confuse this with the new top-level `School.mascot` column — they're different storage locations for historically the same concept; web backfilled the new column FROM the old JSONB field once, then treats the new column as canonical going forward. Read/write the new `School.mascot`, leave `AcademicInfo.mascot` alone (still there for whatever else references it).
- `School` has zero optional-with-default pattern issues to worry about for `mascot`/`schoolColors` specifically since they're being added fresh — but the file's existing `with(...)` copy-helpers mean touching ~8 functions for a 2-field addition. Batch this as one mechanical pass; every `with(...)` just needs the two new fields threaded through unchanged.
- Verify the exact PlayerDetails field name for "primary sport" before wiring the scholarship-line sport lookup (grep confirmed `primarySport`/`primary_sport` exists across `PlayerDetails.swift`, `PlayerDetailsViewModel.swift`, `AthleticsTab.swift` — read `PlayerDetails.swift` directly to get the exact property name and type).
- No new Swift package needed. Conference URL lookup is a ~30-entry static dictionary; scholarship formatting is a handful of pure functions — same spirit as web's `utils/conferenceUrls.ts` / `utils/scholarshipLimits.ts`, put iOS equivalents in `Shared/Utilities/` as pure, testable functions rather than inlining logic into the View.

---

## Test Checklist

1. Open a school detail page for a school with a mascot and two colors set → header shows "{School Name} {Mascot}" subtitle and two color swatches next to the logo; Contact & Social section shows Mascot and Colors rows.
2. Open a school with no mascot/colors set → no subtitle, no swatches, no Mascot/Colors rows anywhere (not empty rows, no rows at all).
3. Tap Edit on Contact & Social, change the Mascot field and both color fields, Save → school detail refreshes with the new values persisted (re-open the screen or pull-to-refresh to confirm it round-tripped through Supabase, not just held in local edit state).
4. Clear both color fields to empty and Save → `school_colors` is written as `null`, not an empty array, and the Colors row disappears.
5. Open a school whose `conference` matches an entry in the lookup table (e.g. "Big Ten") → Conference row renders as a tappable link that opens the correct conference website.
6. Open a school whose `conference` is set but does NOT match any entry in the lookup table (e.g. a made-up or D3-only conference name) → no Conference row renders at all.
7. Open a school detail page while `scholarship_limits` is empty (current live state) → College Data section renders exactly as it does today, no scholarship line, no error, no loading spinner hung.
8. (Once/if seed data lands) Open a school whose division matches a seeded scholarship_limits row for the athlete's sport → scholarship line renders with correct equivalency/head_count/total phrasing and the "(Division Sport)" suffix.
9. Athlete has no `primarySport` set → scholarship line never attempts a match, section renders normally without it.
