# Position Vocabulary Normalization — Plan

**Date:** 2026-08-09
**Owner:** web (source of truth) + iOS follow-up
**Origin:** profile-completeness parity bug (#352). Root disease = many conflicting
position vocabularies; "Infielder" (a category, not a real position) is offered in
onboarding but never matches the edit form.

## Decisions (locked with Chris)

1. **Canonical vocabulary = full-name, granular**, one source of truth used by
   onboarding, the edit form, and iOS. No abbreviations in stored data.
2. **Migrate ambiguous legacy values → `Utility`** (`Infielder`/`Outfielder`/`Infield`/`Outfield` → `Utility`); clean values (`Point Guard`, `Shortstop`) stay; abbreviations expand (`P`→`Pitcher`, `1B`→`First Base`, …). Keep any unknown value selectable (never silently drop).

## Current state — SIX vocabularies + two storage locations

| # | Source | Vocabulary | Used by |
|---|---|---|---|
| 1 | `pages/onboarding/index.vue` (inline `sportPositions`) | full names, coarse (Infielder/Outfielder), 17 sports | player onboarding `<option>` list |
| 2 | `pages/onboarding/parent.vue` (inline) | identical to #1 | parent onboarding |
| 3 | `composables/useSportsPositionLookup.ts` | **abbreviations** (P,1B,SS,PG…), 12 sports | settings edit form (`usePlayerDetailsForm`) |
| 4 | `utils/sportsPositionLookup.ts` | `{id,name}` objects, full names, 10 sports (baseball has "Outfield", no LF/CF/RF/UTIL) | `components/Onboarding/Screen2BasicInfo.vue` |
| 5 | `utils/positions.ts` | baseball abbreviations only + `normalizePosition` | `positions[]` array normalization, completeness helpers |
| 6 | DB `positions` table + `users.primary_position_id`/`primary_position_custom` | DB rows | `useTemplateResolver`, `seed-demo-families` |

**Two storage locations for "position":**
- `user_preferences.data.primary_position` (free string) — read by completeness, edit form, public profile.
- `users.primary_position_id` / `primary_position_custom` (FK to `positions` table) — read by templates/seed.

**No Zod enum** constrains `primary_position` or `positions[]` — any string passes. Only runtime `normalizePosition` (baseball-only) enforces anything.

**Collision:** `C` = Catcher (baseball) AND Center (basketball) → normalization MUST be sport-scoped.

## Canonical position map (full names, granular)

```
Baseball / Softball: Pitcher, Catcher, First Base, Second Base, Third Base,
  Shortstop, Left Field, Center Field, Right Field, Designated Hitter, Utility
Basketball: Point Guard, Shooting Guard, Small Forward, Power Forward, Center
Football: Quarterback, Running Back, Wide Receiver, Tight End, Offensive Line,
  Defensive Line, Linebacker, Defensive Back, Kicker, Punter
Soccer: Goalkeeper, Defender, Midfielder, Forward
Volleyball: Outside Hitter, Middle Blocker, Setter, Libero, Opposite Hitter, Defensive Specialist
Track & Field: Sprinter, Distance Runner, Jumper, Thrower, Hurdler
Swimming: Freestyle, Backstroke, Breaststroke, Butterfly, Individual Medley, Diver
Cross Country: Runner
Tennis: Singles, Doubles
Golf: Golfer
Lacrosse: Attackman, Midfielder, Defenseman, Goalie
Field Hockey: Forward, Midfielder, Defender, Goalkeeper
Ice Hockey: Forward, Defenseman, Goalie
Wrestling: Wrestler
Rowing: Rower
Water Polo: Field Player, Goalkeeper
```

Legacy → canonical (sport-scoped) migration map covers: abbreviations
(P→Pitcher, 1B→First Base, PG→Point Guard, …) and coarse (Infielder/Outfielder→Utility).

## Phased approach

### Phase 1 — DONE (2026-08-09)

- `utils/positions/canonical.ts` — `SPORT_POSITIONS` (full-name granular, 17 sports)
  + sport-scoped `normalizePosition`/`normalizePositions` (preserve unknowns, no
  data loss) + `getCanonicalPositions`. 14 tests.
- Onboarding `index.vue` + `parent.vue` and `useSportsPositionLookup` now read the
  canonical module → **no "Infielder"/"Outfielder" offered anywhere live**.
- `validatePlayerDetails` + `usePlayerDetailsForm` canonicalize `primary_position`
  + `positions[]` on read/load/save.
- DB backfill applied (live): `primary_position` (Infielder→Utility, P→Pitcher, …)
  and `positions[]` → canonical full names. 0 abbrev/coarse values remain.
- **Data-loss recovery:** owen's `primary_position` had been wiped to null by the
  OLD buggy bundle + autosave during diagnosis; restored to `Utility` (canonical
  of his original "Infielder"; his `positions[]` = Second/Third Base, Shortstop,
  Pitcher survived). Chris to refine to a specific spot in the fixed UI if wanted.
- Tests: 248 across affected specs green; type-check 0.

Screen2BasicInfo.vue is dead (rendered nowhere) → its object lookup
`utils/sportsPositionLookup.ts` (still has softball "infield"/"outfield") deferred
to Phase 2, not user-facing.

### (original) Phase 1 — canonical module + user-facing fix (this session, bounded)
Goal: remove "Infielder" everywhere it's offered, one full-name vocabulary for
onboarding + edit form, permanent completeness fix, backfill stored strings.

0. **Verify which onboarding is live** (`/onboarding` index.vue vs Screen2BasicInfo) — grep routes/components; don't edit a dead path.
1. New `utils/positions/canonical.ts`: `SPORT_POSITIONS` (the map above) + `normalizePosition(sport, value)` (sport-scoped) + `getCanonicalPositions(sport)`.
2. Repoint onboarding #1, #2 and edit-form lookup #3 at the canonical module (full names; Infielder/Outfielder gone → real positions).
3. `usePlayerDetailsForm` + `preferenceValidation` normalize `primary_position` + `positions[]` to canonical on load/save (keep-unknown-selectable retained from #352).
4. DB backfill (idempotent): normalize `user_preferences.data.primary_position` + `positions[]` to canonical (single-digit rows today).
5. Tests (sport-scoped normalize incl. C collision; onboarding offers no Infielder) + live verify (owen/player1 = 85; onboarding dropdown shows real positions).

### Phase 2 — deeper unification (separate session)
- Fold object lookup #4 (`utils/sportsPositionLookup.ts` + Screen2BasicInfo) into the canonical module; retire the object shape or derive it from canonical.
- Reconcile the DB `positions` table (#6) vs the `primary_position` string — decide one storage location; migrate templates/seed.
- iOS: align `OnboardingConstants`/`FamilyConstants` to the canonical labels (web is source of truth) — handoff spec.

## Open questions
- Which onboarding flow is live (Phase 1 step 0)?
- Utility for `Outfielder`, or a new coarse-but-valid "Outfield"? (Decision: Utility, to stay granular-only.)
- DB `positions` table (#6): unify now or Phase 2? (Proposed: Phase 2 — it's a different store, not user-facing in the completeness path.)
