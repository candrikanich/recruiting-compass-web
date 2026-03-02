# Parent Onboarding Banner — Design

**Date:** 2026-03-01
**Status:** Approved

## Problem

Parents who skip the invite step during onboarding land on a dashboard that is empty and gives no clear direction. There is no prompt telling them what to do next.

## Solution

Two new components surfaced on the dashboard, both gated on `userStore.isParent && parentAccessibleFamilies.length === 0`. Both disappear reactively once an athlete connects (no manual dismiss, no localStorage).

---

## Components

### `ParentOnboardingBanner.vue`

- **Placement:** Immediately after `<ParentContextBanner>` in `dashboard.vue`
- **Style:** Amber banner, full width, left-bordered (matches existing warning conventions)
- **Content:** `UserPlusIcon` + message + "Invite Athlete →" button
- **Message:** "Connect your athlete to get started — invite them to join your family or share your family code."
- **CTA:** Links to `/settings/family-management`

### `ParentNoAthleteEmptyState.vue`

- **Placement:** Between the banner and the stats/content grid
- **Style:** Centered card with large icon, heading, body text, primary CTA button
- **Heading:** "Your athlete isn't connected yet"
- **Body:** "Once they accept your invite, you'll see their recruiting activity, school list, and progress here."
- **CTA:** "Invite Athlete" button → `/settings/family-management`

---

## Dashboard Changes

- Import and render `ParentOnboardingBanner` after `ParentContextBanner`
- Import and render `ParentNoAthleteEmptyState` after the banner, before the stats section
- Both gated on `userStore.isParent && !parentAccessibleFamilies.length`
- `parentAccessibleFamilies` already available via the injected `activeFamily` context

---

## No Backend Changes

Condition is derived entirely from `parentAccessibleFamilies` (already loaded via `useActiveFamily`).

---

## Out of Scope

- Dismissible banner (not wanted — disappears only on connection)
- Hiding the rest of the dashboard widgets (parents can explore the interface while waiting)
- Modifying onboarding flow
