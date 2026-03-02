# Family Connection UX — Design

**Date:** 2026-03-01
**Goal:** Make family creation, invitation, and member-adding as simple and seamless as possible. Golden path: parent signs up → creates family → invites player → player joins → both feel connected.

---

## Context

The primary initiator is a parent: "Hey, here's an app we can use to track your recruiting — I sent you an invite." Two invite paths exist (email + family code). Infrastructure is solid; this design adds the confirmation layer that makes the connection feel real.

---

## Three Pieces

### 1. Parent Dashboard Banner — One-Time Connection Acknowledgment

**Current:** `ParentOnboardingBanner` shows when `parentAccessibleFamilies.length === 0`, hidden via computed in `dashboard.vue`.

**New behavior:**
- Banner logic moves into the component itself; `dashboard.vue` renders it with just `v-if="userStore.isParent"`
- **No members yet:** shows existing "Invite your athlete" CTA
- **First view after player joins:** detects `parentAccessibleFamilies.length` transition to `> 0`, shows a "You're connected!" state for 3 seconds, sets `localStorage['family_connected_ack_${userId}']`, then hides permanently
- **Already acknowledged:** reads localStorage on mount, hides immediately with no flicker

**Scale note:** Entirely client-side. Zero server load per parent.

---

### 2. Family Code in Profile Dropdown

**Current:** `HeaderProfile.vue` dropdown shows name, email, and nav links.

**New behavior:**
- On mount, calls `useFamilyCode().fetchMyCode()`
- Renders a small family code block below name/email in the dropdown (monospace font, copy icon)
- Renders nothing if code is null (loading or no family yet)
- Parents with multiple families show their first/primary code — one family is the norm in the golden path

---

### 3. "You're Connected" Toast on Join

**Current:** `join.vue` calls `navigateTo` immediately after accepting with no feedback.

**New behavior:**
- Both `accept()` (existing user) and `signupAndConnect()` (new user) call `showToast("You're connected!", "success")` before `navigateTo`
- Toast persists across client-side navigation (SPA — no page reload), so it appears on the landing page (dashboard or onboarding)

---

## What Is Not Changing

- Family creation flow (already auto-creates on onboarding step 5)
- Invite API routes and email delivery
- Family code join flow
- Notifications DB table (not used here — localStorage is sufficient)
- Real-time subscriptions (not needed; "first visit after joining" is acceptable latency)

---

## Files Affected

| File | Change |
|------|--------|
| `components/Dashboard/ParentOnboardingBanner.vue` | Move show/hide logic in; add connected state |
| `pages/dashboard.vue` | Simplify `showParentOnboarding` to `v-if="userStore.isParent"` |
| `components/Header/HeaderProfile.vue` | Add family code block below name/email |
| `pages/join.vue` | Add `showToast` before both `navigateTo` calls |
