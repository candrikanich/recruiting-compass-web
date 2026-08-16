# iOS Delta — Ordered Positions + Recruiting Specificity (2026-08-15)

Web-first change landed on `develop` (uncommitted at time of writing). iOS should reach parity. **Do not edit Swift from the web session — this is a spec for the iOS session.**

## Product rule (Chris)
Recruiting output must name a **specific** position — coaches recruit for specific positions. No vague catch-alls.

## What changed on web

1. **"Utility" removed from Baseball + Softball vocab.** Aliases `Infielder/Outfielder/Utility` (and `IF/OF/UTIL`) no longer resolve to a canonical value. Legacy stored values are **preserved on read** (never dropped) and migrated by backfill.
2. **`positions[]` is the ordered source of truth**: `positions[0]` = primary, `positions[1]` = secondary. The legacy single `primary_position` string is now a **mirror of `positions[0]`** (written on every save) and only a fallback for pre-ordering accounts.
3. **Coach-facing render = abbreviated primary/secondary** e.g. `3B/SS` (`formatPositionsShort`). Applied everywhere a single position is shown (outreach templates, recruiting packet, public profile header, agent markdown).
4. **Sport fallback:** position abbreviation is sport-scoped; when the `users.primary_sport_id` FK is null, read `prefs.primary_sport` (the jsonb string real accounts actually populate).

## iOS work required

- [ ] Remove "Utility" from the iOS baseball/softball position constants; drop Infielder/Outfielder/Utility aliases (preserve unknown stored values, don't drop).
- [ ] Treat the positions array as **ordered**: index 0 = primary, index 1 = secondary. Add a reorder affordance in the player-details positions editor (web uses up/down arrows with Primary/Secondary badges).
- [ ] On save, mirror `positions[0]` → `primary_position` (match web reconcile).
- [ ] Add a sport-scoped abbreviation helper (`Third Base → 3B`, etc.; non-baseball/softball sports fall back to full name) and a `formatPositionsShort` equivalent → `3B/SS`.
- [ ] Repoint any coach-facing position display (share card, generated messages, packet) to the ordered/abbreviated value, not the raw `primary_position`.
- [ ] Onboarding: seed `positions[0]` from the onboarding pick.

## Reference (web)
- `utils/positions/canonical.ts` — `SPORT_POSITIONS`, `abbreviatePosition`, `primaryAndSecondary`, `formatPositionsShort`
- `composables/useTemplateResolver.ts` — `{{position}}` derivation + sport fallback
- `composables/usePlayerDetailsForm.ts` — onSave mirror + `movePosition`
- `components/Settings/PlayerDetailsAthleticsTab.vue` — Position Priority UI

## Data
Live DB backfilled on web side (single shared DB). iOS just needs to READ the ordered array correctly.
