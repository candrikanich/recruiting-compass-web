# iOS Spec: Onboarding v2 — 2-Step Wizard + Dashboard NUX

**Date:** 2026-08-31
**Web source of truth:** `docs/superpowers/specs/2026-08-31-user-onboarding-redesign-design.md`
**Web branch:** `feat/onboarding-redesign`
**Priority:** High (parity with web onboarding overhaul)
**Complexity:** Medium-High
**Status:** Web Tasks 1-9 shipped. iOS has no counterpart yet.

---

## 1. Overview

Web onboarding reshaped from a 5-step wizard to a 2-step value-first flow:

1. **Step 1 — Tell us about you:** sport (required), graduation year (required), zip (optional). Gender auto-derived from sport.
2. **Step 2 — Schools to explore:** recommendation carousel. Add/dismiss schools.

Post-onboarding, the dashboard shows three NUX widgets: Getting Started Checklist, Profile Completeness Card, and School Recommendations Widget.

All NUX state persists in `users.nux_progress` (JSONB) via a shared API.

---

## 2. Shared API Contract (do not fork)

### 2.1 NUX Progress — Read/Write

**Column:** `users.nux_progress jsonb DEFAULT '{}'::jsonb`

**Shape:**
```json
{
  "version": 1,
  "checklist": {
    "items": {
      "sport": { "completed": true, "completedAt": "2026-08-31T..." },
      "first_school": null
    },
    "dismissedAt": null
  },
  "firstVisits": { "templates": "2026-08-31T..." },
  "dismissals": { "gpa_prompt": "2026-08-31T..." }
}
```

**Checklist keys (8):** `sport`, `first_school`, `academics`, `first_coach`, `invite_family`, `profile_80`, `preview_template`, `check_timeline`

**Read:** NUX progress rides on the existing user fetch — `nux_progress` is a column on `users`. Parse with the same logic as web's `parseNuxProgress()`:
- Missing/null → empty progress (all items incomplete, no dismissals)
- Partial → fill defaults for missing keys

**Write:**
```
PATCH /api/user/nux-progress
Authorization: Bearer <session-token>
Body: { "nux_progress": <NuxProgress object> }
Response: { "success": true }
```

Pattern: read current, merge change, PATCH full object. Same as web composable.

### 2.2 School Recommendations

```
GET /api/schools/recommendations?athleteId=<uuid>&limit=8
```

Returns `SchoolRecommendation[]` with `catalogKey`, `name`, `division`, `conference`, `state`, `score`, `reasons[]`.

```
POST /api/schools/recommendations/dismiss
Body: { "catalogKey": "ohio-state", "athleteId": "<uuid>" }
```

See `planning/iOS_SPEC_school-recommendations-2026-08-28.md` for full contract.

### 2.3 Player Details (Step 1 save)

Existing player-details PATCH endpoint — same as current iOS onboarding.

---

## 3. Screen Descriptions

### 3.1 Step 1: "Tell Us About You"

- **Sport picker:** native wheel or `List` with searchable sport names. Required.
- **Graduation year picker:** 4-option segmented or wheel (current year + 3). Required.
- **Zip code:** optional `TextField`, numeric keyboard, 5-digit validation.
- **Gender:** auto-derived from sport via `SPORT_GENDER_MAP` (same map as web). Not shown to user. Set on player-details save.

**On "Continue":**
1. Save sport + grad year + zip + gender via player-details PATCH
2. PATCH `nux_progress` to mark `sport` checklist item completed
3. Navigate to Step 2

### 3.2 Step 2: "Schools to Explore"

- **Card carousel:** horizontally scrollable `ScrollView(.horizontal)` or `LazyHGrid`. Up to 8 cards from recommendation API.
- **Each card:** school name, division badge, conference/state, reason chips. Two buttons: "Add" (primary), "Not a fit" (secondary).
- **Add action:** creates school row via existing school-create API, removes card, marks `first_school` NUX item on first add.
- **Dismiss action:** calls dismiss endpoint, removes card.
- **"Go to Dashboard" button:** always visible below carousel. On tap → navigate to dashboard.
- **Empty recs:** show "No recommendations yet — continue to dashboard" with CTA button.

### 3.3 Dashboard — Getting Started Checklist

Native `List` section or expandable card. 8 items with completion indicators:

| Key | Player Label | Parent Label | Link |
|-----|-------------|-------------|------|
| `sport` | Pick your sport | Set your athlete's sport | Player Details |
| `first_school` | Add your first school | Add a school to track | Schools |
| `academics` | Enter your GPA and test scores | Add academic info | Player Details > Academics |
| `first_coach` | Save your first coach | Save a coach contact | Coaches |
| `invite_family` | Invite a parent or guardian | Invite a family member | Family Management |
| `profile_80` | Get your profile to 80% | Help complete the profile | Player Details |
| `preview_template` | Preview a coach email | Preview an outreach template | Templates |
| `check_timeline` | Check your recruiting timeline | Review the timeline | Timeline |

**Progress bar:** "X of 8 complete — Y%" with horizontal bar or circular gauge.
**Auto-evaluation on mount:** check schools count (→ `first_school`), coaches count (→ `first_coach`), profile completeness (→ `profile_80`) and mark items complete if conditions met.
**Dismiss:** "I'm good for now" persists `checklist.dismissedAt`. Show "Resume getting started" link in a subtle banner if dismissed.

### 3.4 Dashboard — Profile Completeness Card

- **< 80%:** Circular `Gauge` or ring with percentage, title "Complete Your Profile", top 3 missing field prompts with "Add" links to settings.
- **≥ 80%:** Compact horizontal bar with "Profile X% Complete" + "Great progress!"
- Use existing `useProfileCompleteness` logic (port the calculation to Swift).

### 3.5 Dashboard — School Recommendations Widget

Same as `planning/iOS_SPEC_school-recommendations-2026-08-28.md` but rendered as a dashboard section (not just empty-state). Self-hides when no recommendations. "See all →" links to Schools tab.

---

## 4. NUX Tracking Logic (port from web)

### Checklist Percentage
```swift
let completed = NUX_CHECKLIST_KEYS.filter { progress.checklist.items[$0]?.completed == true }.count
let percentage = Int(round(Double(completed) / Double(NUX_CHECKLIST_KEYS.count) * 100))
```

### Auto-Evaluation (on dashboard mount)
```swift
if schoolsCount > 0 { completeItem(.firstSchool) }
if coachesCount > 0 { completeItem(.firstCoach) }
if profileCompleteness >= 80 { completeItem(.profile80) }
```

### Prompt Dismissal Cooldown
```swift
func isPromptDismissed(_ key: String, cooldownDays: Int) -> Bool {
    guard let dismissedAt = progress.dismissals[key] else { return false }
    let elapsed = Date().timeIntervalSince(dismissedAt)
    return elapsed < Double(cooldownDays) * 86_400
}
```

---

## 5. Analytics Events (PostHog)

Same event names as web for cross-platform funnel analysis:

| Event | When | Properties |
|-------|------|------------|
| `onboarding_v2_started` | Step 1 appears | `{ platform: "ios" }` |
| `onboarding_v2_step1_complete` | Sport + grad year saved | `{ sport, gradYear }` |
| `onboarding_v2_school_added` | School added from Step 2 | `{ schoolName, source: "onboarding" }` |
| `onboarding_v2_complete` | Dashboard reached | `{ completedItems: N }` |
| `checklist_item_completed` | Any item marked done | `{ item: key }` |
| `checklist_dismissed` | User dismisses checklist | — |

---

## 6. Push Notification Priming

After the user adds their first school (Step 2), show a pre-permission explanation screen:

> **Stay on top of recruiting**
> Get notified about recruiting deadlines, coach activity, and task reminders.

Two buttons: "Turn on notifications" (requests system permission), "Not now" (skips, records `dismissals.push_priming`).

Do NOT request permission without showing this screen first.

---

## 7. Implementation Notes

- **NuxProgress model:** create a Swift `Codable` struct matching the JSON shape. Use `JSONDecoder` with `.convertFromSnakeCase` if needed, but note the keys are camelCase in the JSON (matches web TypeScript).
- **Persistence pattern:** read `nux_progress` from user model, mutate locally, PATCH to server. Optimistic update — update UI immediately, PATCH in background. On PATCH failure, log but don't revert (matches web fire-and-forget pattern).
- **Shared state:** `NuxProgressManager` (ObservableObject) as an `@EnvironmentObject` — equivalent to web's `useNuxProgress()` composable.
- **Existing onboarding:** current iOS onboarding flow will need replacement. Keep the auth/signup screens; replace the post-signup wizard.
