# iOS Spec — Add `researching` Recruiting Status (web ↔ iOS parity)

> **Prepared:** 2026-08-13
> **Web branch:** `develop`
> **Purpose:** Add the missing `researching` case to the iOS `SchoolStatus` enum so the 73 live schools currently on that status render a "Researching" pill instead of falling back to "Unknown".

---

## Feature Overview

The web app unified its recruiting-status vocabulary to a canonical 10-status funnel. `researching` is the default base state a school lands in, and 73 schools in the live database currently use it. iOS has no `researching` case, so those schools decode to `.unknown` and show an "Unknown" pill. This spec adds `researching` to iOS as a first-class status, matching web's label, color, and funnel position.

This is a surgical, single-file change. No new screens, no API changes, no web changes.

---

## Web Implementation Summary

### Source of Truth
- `utils/schoolStatusOptions.ts` (web) — canonical ordered status set. `researching` is first; `unknown` and `declined` are DB fallbacks/legacy and NOT user-selectable.

### DB / Migration Changes
- None needed. The shared Supabase `school_status` enum already contains all 11 values (incl. `researching` and `declined`). Nothing to apply.

### Live data snapshot
- `researching`: **73 schools** (web default base state)
- `declined`: 0
- `unknown`: 0

Decision (Chris): keep `researching` as a real shared status and ADD it to iOS — chosen over migrating the 73 rows to `interested`.

---

## Existing iOS Files

- **Target (edit):** `TheRecruitingCompass/TheRecruitingCompass/Features/Schools/Models/SchoolStatus.swift`
  - `enum SchoolStatus: String, Codable, CaseIterable, Sendable`
  - Custom `init(from:)` already falls back unknown raw strings to `.unknown` — no change needed there.
  - `displayName` switch + `badgeColor` switch (returns `BadgeColor`).
- **Picker (optional follow-up):** `TheRecruitingCompass/TheRecruitingCompass/Features/Schools/Components/SchoolRecruitingStatusAndTierSection.swift` — line 26 renders `ForEach(SchoolStatus.allCases, id: \.self)`.
- **Consumers (no change):** `SchoolDetailView.swift` header `StatusBadge`, list-card `BadgeView`. Both read `displayName`/`badgeColor`, so they pick up the new case automatically.

---

## What iOS Needs to Build

### Required change — `SchoolStatus.swift`

Add a `researching` case **first** in the enum (so `allCases`, and therefore the picker Menu, lists it at the top of the funnel), plus its two switch arms.

**1. Case declaration — place FIRST, before `interested`:**

```swift
enum SchoolStatus: String, Codable, CaseIterable, Sendable {
  case researching
  case interested
  case contacted
  case campInvite = "camp_invite"
  case recruited
  case officialVisitInvited = "official_visit_invited"
  case officialVisitScheduled = "official_visit_scheduled"
  case offerReceived = "offer_received"
  case committed
  case notPursuing = "not_pursuing"
  case unknown
```

(`researching` needs no explicit raw value — bare case name already serializes to `"researching"`.)

**2. `displayName` switch — add arm (order it first to match):**

```swift
  var displayName: String {
    switch self {
    case .researching:
      return String(localized: "Researching")
    case .interested:
      return String(localized: "Interested")
    // ...unchanged...
    }
  }
```

**3. `badgeColor` switch — add arm:**

```swift
  var badgeColor: BadgeColor {
    switch self {
    case .researching:            return .slate
    case .interested:             return .slate
    case .contacted:              return .blue
    // ...unchanged...
    }
  }
```

`.slate` matches web (`bg-slate-100 / text-slate-700`); iOS `.slate` already maps to Brand slate100/700.

---

## Optional Follow-up (Chris to decide — NOT required for this spec)

The picker in `SchoolRecruitingStatusAndTierSection.swift` (line 26) renders `ForEach(SchoolStatus.allCases, id: \.self)`, which includes `.unknown` as a selectable menu option. Web deliberately excludes `unknown` from its dropdown (it's decode-fallback only). For full parity, filter `.unknown` out of the picker:

```swift
ForEach(SchoolStatus.allCases.filter { $0 != .unknown }, id: \.self) { status in
```

Keep `.unknown` as a decode fallback in the enum — this only removes it from the user-selectable menu. Small, optional; not part of the acceptance criteria below.

---

## Canonical Web Set (target parity — 10 selectable)

Funnel order: `researching → interested → contacted → camp_invite → recruited → official_visit_invited → official_visit_scheduled → offer_received → committed → not_pursuing`.

`unknown` + `declined` = fallback/legacy only, NOT user-selectable.

| Status | displayName | badgeColor | Web badge |
|---|---|---|---|
| researching | Researching | `.slate` | slate-100/700 |
| interested | Interested | `.slate` | slate-100/700 |
| contacted | Contacted | `.blue` | blue-100/700 |
| camp_invite | Camp Invite | `.purple` | purple-100/700 |
| recruited | Recruited | `.emerald` | emerald-100/700 |
| official_visit_invited | Official Visit Invited | `.orange` | orange-100/700 |
| official_visit_scheduled | Official Visit Scheduled | `.orange` | orange-100/700 |
| offer_received | Offer Received | `.emerald` | emerald-100/700 |
| committed | Committed | `.emerald` | emerald-100/700 |
| not_pursuing | Not Pursuing | `.red` | red-100/700 |

---

## API Endpoints to Call

N/A — no API work. iOS already reads/writes `school.status` via its existing schools data layer; this change only expands the enum it decodes into.

---

## Data Models (Swift)

Covered above — the only model change is the `SchoolStatus` enum in `SchoolStatus.swift`. No new structs.

---

## Business Rules to Enforce Client-Side

- `researching` is user-selectable and appears **first** in the status Menu.
- `unknown` remains a decode-only fallback (never written by the picker if the optional filter is applied; today it is selectable — see optional follow-up).
- `declined` exists in the DB enum but is legacy/unused — do NOT add it as a selectable iOS case in this change.

---

## Excluded Items (No iOS Work Needed)

- **DB migrations** — the `school_status` enum already has all values.
- **Web changes** — web already ships the unified canonical set.
- **RLS / API routes** — unchanged.
- **New screens / navigation** — none.

---

## Dependencies

None — self-contained, single-enum edit.

---

## Notes for iOS Claude

- Ordering matters: `researching` must be the FIRST case because `allCases` drives the picker Menu order, and web shows it first.
- `init(from:)` needs no change — it already handles unknown raw strings by falling back to `.unknown`; adding the case means `"researching"` now decodes to `.researching` instead.
- Do not add `declined`. Live usage is 0 and it's not in the web selectable set.
- Both badge consumers (header `StatusBadge`, list-card `BadgeView`) derive from `displayName`/`badgeColor`, so no changes needed there once the switch arms are added.

---

## Test Checklist

1. **Decode parity:** Load a school whose `status = "researching"` → header pill and list-card badge both read "Researching" in slate, NOT "Unknown".
2. **Menu order:** Open the Recruiting Status Menu → "Researching" is the first option, followed by Interested, Contacted, … Not Pursuing.
3. **Round-trip write:** Select "Researching" from the Menu → persists, reloads as "Researching" (not Unknown).
4. **Color:** Researching pill uses the same slate treatment as Interested (slate-100 bg / slate-700 text).
5. **Build:** iOS build passes with exhaustive switches (both `displayName` and `badgeColor` compile without `default` warnings).
6. **(If optional filter applied):** `.unknown` no longer appears as a selectable Menu option, but a school with a legacy/unrecognized status still renders without crashing (decodes to `.unknown`).
