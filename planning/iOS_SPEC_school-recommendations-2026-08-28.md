# iOS Spec: School Recommendations (empty list)

**Date:** 2026-08-28
**Web source of truth:** `docs/architecture/school-recommendations.md`
**Web route:** `/schools` empty state
**Web APIs:** `GET /api/schools/recommendations`, `POST /api/schools/recommendations/dismiss`
**Priority:** MVP (parity with web empty-state)
**Complexity:** Medium
**Status:** Web shipped on `cursor/school-recommendations-92b1`. iOS has no counterpart yet.

---

## 1. Overview

When the athlete's school list is empty, web now shows a "Schools to consider" grid of up to 8 NCAA programs ranked from home state + GPA, with **Add to list** and **Not a fit**. iOS `/schools` empty state is still a single CTA. Parents using only iOS never see the suggestions.

### Key user actions

- See ranked suggestions on an empty schools list
- Add a suggestion (creates a `schools` row, status `researching`)
- Dismiss a suggestion ("Not a fit") so it does not return

### Success criteria

- Empty list shows the same payload as web for the active athlete
- Add uses the existing school-create path (family-scoped)
- Dismiss persists via the dismiss endpoint and the card disappears
- Parent viewing a linked athlete passes `athleteId`

---

## 2. User flows

### Primary

1. User opens Schools with zero rows
2. iOS calls `GET /api/schools/recommendations` (parent: `?athleteId=`)
3. Grid of cards: name, state, conference, division badge, reason chips
4. Add → existing create-school API/store; remove card locally
5. Dismiss → `POST /api/schools/recommendations/dismiss` `{ catalogKey, athleteId? }`

### Empty / error

- Recommendations loading: spinner under the existing empty-state title
- Fetch fail: keep "Add school" CTA; show inline error; do not block add-manual
- Zero recommendations: hide the grid, keep manual add CTA

---

## 3. API contract (do not fork)

Response and body shapes are in `types/schoolRecommendations.ts` and `docs/architecture/school-recommendations.md`.

`catalogKey` is the stable identity (`ohio state university`). Send that on dismiss, not the display name.

Auth: Bearer + CSRF on POST, same as other mutating iOS calls.

---

## 4. UI parity

Match web `components/School/RecommendedSchools.vue`:

- Heading: **Schools to consider**
- Subcopy: suggested from home state and academics
- Card: name, `STATE · conference`, division pill, up to two reason lines
- Primary: **Add to list**
- Secondary: **Not a fit** (ghost)
- Grid: 1 column on compact, 2 on regular

Do not build a dedicated `/recommendations` screen — that path is recommendation *letters*.

---

## 5. Out of scope

- Onboarding extra step
- Sport-filtered ranking (catalog has no sport sponsorship yet)
- Caching on device beyond a normal URLCache GET
