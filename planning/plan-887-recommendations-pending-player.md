# Plan: issue #887 — recommendations empty for pre-athlete users

## Root-cause findings (code read)
- `assembleSchoolRecommendations` reads sport/gender only from `user_preferences.player`. Parent onboarding stores them in `family_units.pending_player_details` (`sport`, `gender`), never read here → sport/gender null → no programs filtering.
- `RecommendedSchools.vue` has loading/error/list branches only → genuinely empty result renders nothing.
- `SchoolRecommendationsWidget` hides itself when empty (by design, unchanged).
- Ranker returns catalog with null signals, so "always empty" not proven; live repro not possible here (no prod data / dev creds) — fix both real gaps.

## Changes
1. TDD: `assembleSchoolRecommendations` falls back to `family_units.pending_player_details` (sport, gender) when athlete prefs lack them. Prefs win when present.
2. TDD: `RecommendedSchools.vue` empty state when not loading/error and items empty.
3. Verify: unit tests, type-check, lint, audit:tokens.

## Out of scope
- Parent-caller resolving to linked athlete (`resolveViewerAthleteId`) — separate concern.
