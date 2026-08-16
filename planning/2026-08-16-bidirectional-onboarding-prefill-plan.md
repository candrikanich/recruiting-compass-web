# Plan — Bidirectional Onboarding Pre-fill (Web + iOS)

**Date:** 2026-08-16
**Status:** ✅ Web Phases 1–3 BUILT + tested (2026-08-16). Conflict rule = **player-authoritative** (Chris). iOS Phase 4 = handoff `planning/iOS_SPEC_2026-08-16_age-gate-and-onboarding-parity.md`.

### What shipped (web)
- **Phase 1** — `server/api/family/player-details.post.ts` now persists `playerDob` (+ all staged fields) instead of dropping it.
- **Phase 2** — `server/utils/hydrateAthleteProfile.ts` (new): on invite-accept (`invite/[token]/accept.post.ts`), staged parent data hydrates the athlete's canonical `user_preferences.player` + `users.date_of_birth`, **fill-if-empty** (player-authoritative), **fail-open** (never blocks acceptance). DB-backed ⇒ reaches iOS.
- **Phase 3** — `pages/onboarding/index.vue` reads canonical prefs on mount (`prefillFromCanonical`, fill-if-empty) — replaces the web-only query-param transport as the cross-platform path (query params kept as harmless fallback).
- **Scoping note:** parent onboarding is always parent-first (a parent joining an existing player skips onboarding → dashboard), so the player→parent direction is already served by the shared-row model in settings; no onboarding change needed there.
- Tests: `hydrateAthleteProfile.spec.ts` (5), `player-details.spec.ts` (+1 playerDob), onboarding suites green. Full suite 7762 pass.

---

### Original plan (for reference)
**Goal:** Any data collected during parent OR player onboarding is persisted to the DB and pre-fills the other party's onboarding — parent-first prefills the player, player-first prefills the parent — and it works cross-platform (parent on web, player on iOS, or vice versa).

---

## What exists today (from code audit)

- **Canonical athlete store = `user_preferences`** (jsonb `data` per `category`): `player` (grad year, sport, position(s), GPA, SAT, ACT, full PlayerDetails), `location` (zip/city/state/lat-long).
- **Parent and player already share ONE row.** `server/utils/playerOwnedPreferences.ts` marks `player`/`location`/`school` as player-owned; `resolvePreferenceTargetUserId` redirects a parent's reads/writes to the **linked athlete's `user_id`** row. So the collaboration substrate already exists server-side and is DB-backed (⇒ reaches iOS).
- **Parent onboarding** (`pages/onboarding/parent.vue`) stages to a **separate** blob `family_units.pending_player_details` = `{playerName, graduationYear, sport, position}`. **`playerDob` is collected but DROPPED** (`player-details.post.ts:11` never destructures it). GPA/tests/zip are not collected here.
- **Prefill is one-directional (parent→player) and fragile:** on invite-accept (`invite/[token]/accept.post.ts`) the staged blob is returned as a `prefill` object → `pages/join.vue` forwards `graduationYear/sport/position` as **URL query params** → `onboarding/index.vue` `onMounted` seeds them. Query-params + `localStorage` progress are **web-only — they never reach iOS.** No player→parent prefill exists.

### Core problems
1. Parent's staging blob is **disconnected** from the canonical `user_preferences` row.
2. Prefill transport (query params / localStorage) is web-only → **breaks cross-platform.**
3. Only 4 fields prefill; DOB + academics + location don't.
4. No player→parent direction.

---

## Design

**Principle: one canonical source (`user_preferences` + `users.date_of_birth`), read on mount, no client-side transport.**

The wrinkle: at **parent-first** onboarding the player's `users` row may not exist yet (player hasn't signed up), so parent data can't be keyed to the athlete `user_id`. Keep a staging bridge, but connect it to canonical on accept.

### Phase 1 — Stop dropping data; make staging complete (web)
- `player-details.post.ts`: destructure + persist **all** parent-entered fields into `pending_player_details` (add `playerDob`, and any academics/location if we add them to the parent form later). Keep it a typed jsonb blob.
- No behavior change to the player yet — just stop losing data.

### Phase 2 — Hydrate canonical from staging on invite-accept (web)
- `invite/[token]/accept.post.ts`: after the player user row exists, **write the staged blob into the athlete's canonical `user_preferences`** (`player` + `location`) and `users.date_of_birth`, instead of returning query params.
- `join.vue` / `onboarding/index.vue`: drop query-param prefill; onboarding reads canonical prefs on mount (next phase covers this).

### Phase 3 — Onboarding reads canonical prefs on mount (web, both flows)
- `onboarding/index.vue` (player) and `onboarding/parent.vue` (parent): on mount, fetch the athlete's canonical `user_preferences` (`player`,`location`) via the existing redirect and pre-fill any field already set. This gives **both directions for free** — parent editing the shared row means the player sees it, and vice versa.
- Prefill DOB from `users.date_of_birth` where present.

### Phase 4 — iOS parity
- iOS onboarding must read/write the **same** `user_preferences` categories (`player`,`location`) and `users.date_of_birth`, and pre-fill from a canonical **DB read** (never query params / local state). Because the redirect + trigger live in the DB/API, iOS gets the shared-profile behavior and the 13+ gate automatically once it uses these endpoints. Separate iOS handoff.

---

## Open decision (needs Chris)

**Conflict resolution when parent and player set the same field to different values.** Options:
1. **Last-write-wins** (simplest; whoever saved most recently wins). ← default recommendation
2. **Player-authoritative** (player's own entries always win over parent's).
3. **Prefill-only, no overwrite** (a field already set is never overwritten by the other party; prefill only fills blanks).

Sub-decision — **DOB specifically:** player enters own DOB at signup (authoritative for COPPA/account); parent's onboarding DOB is a pre-check. Recommend: parent's staged DOB **pre-fills** the player's signup field, but the player's confirmed signup value is authoritative.

---

## Test plan
- Unit: staging persists all fields; accept hydrates canonical + DOB; prefill reads canonical for both roles.
- Integration: parent-first then player joins → player onboarding pre-filled from DB (no query params). Player-first then parent invited → parent onboarding pre-filled.
- Cross-platform smoke: values written by web appear on an iOS read of the same endpoints.

## Rollout
Web Phases 1–3 behind existing flows (no schema migration needed — `pending_player_details` is already jsonb; `user_preferences` already exists). iOS Phase 4 tracked separately. No breaking change to existing accounts.

## Estimate
Web: ~1–1.5 days (Phases 1–3 + tests). iOS: separate, mirrors the endpoints.
