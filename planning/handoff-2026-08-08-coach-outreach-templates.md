# Handoff: Coach Outreach Template Library + Compose UX
**Date:** 2026-08-08
**Branch:** `feat/coach-outreach-templates` (7 commits ahead of `develop`, **NOT pushed**)
**Status:** NEARLY DONE — core feature complete + committed; remaining work is optional extension (Phase 5/6) + polish

## What this feature is
Best-of-breed coach-outreach email/text templates for athletes. 80-var registry + 33 templates, resolved from real athlete/coach/school/event data, composed in `CommunicationPanel.vue` with a live preview, inline profile editing, authored-field capture, a send-gate, and a send log with anti-BCC dedupe + follow-up-timing guardrails. Full design + phase plan: `docs/coach-outreach/migration-build-plan.md`, `docs/coach-outreach/schema-reconciliation.md`. Durable memory: `~/.claude/projects/.../memory/coach-outreach-templates.md` + `player-contact-vs-credentials.md`.

## Completed This Session (all committed)
- Phases 0–2 schema + 80-var registry + 33 templates seeded (live DB) — `c9f21b70`
- Phase 3 resolver (`utils/templateResolver.ts`) + `composables/useTemplateResolver.ts` + Slice 4 compose wiring + 5a variables panel + 5b live preview + send-gate — `c9f21b70`, `3373e015`
- 5c inline profile-field editing (endpoint `server/api/athlete/profile-field.patch.ts` + `utils/editableProfileFields.ts` + `composables/useProfileFieldWrite.ts`) — `4dcae5b4`
- 5d "Edit in profile →" link fallback — `2f720282`
- Recruiting contact split from login (`playerPhone`/`playerEmail` → `pref:player.*`, Basics-tab recruiting fields) + **dropped `users.phone`** (migration `20260818000000`, backfilled) — `410a6ad0`
- Phase 4 send log + dedupe + timing (`athlete_messages` table migration `20260819000000` + `server/api/athlete/messages/{index,check}.post.ts` + `composables/useAthleteMessages.ts`) — `4b2f24d7`
- 5e authored-field capture (programNote/updateHook inputs; **activates the rule-#6 programNote dedupe**) — `644480fa`

## In Progress (Uncommitted)
- **None of mine.** Only `server/utils/triggerSuggestionUpdate.ts` shows modified — that's the autonomous "agent checkpoint" cron's WIP, NOT part of this work. Do not fold it into this branch.

## Live DB state (single prod-serving DB `xpxzhqghxecsjhvklsqg` — every write is prod)
All applied via Supabase MCP `apply_migration` (NOT `db push` — broken locally):
- `20260816000000` Phase 0/1 (communication_templates cols + type CHECK+social; template_variables; users profile cols + anti-drift trigger)
- `20260817000000` Phase 2 (performance_metrics display_value/source/is_primary)
- `20260818000000` drop users.phone
- `20260819000000` athlete_messages
- Registry data seeded; `playerPhone`/`playerEmail` repointed to `pref:player.*` via direct UPDATE.
- **Migration files exist in `supabase/migrations/` but MCP records versions under its own timestamps** (schema_migrations dual-recording drift, known). All migrations idempotent.

## Known Issues / Blockers
- **Env reaps background dev servers** — my `npm run dev` got killed repeatedly; caused a false "couldn't save" scare (was ERR_CONNECTION_REFUSED, not code). Next session: run `! npm run dev` in the user's own terminal for a stable server. It comes up on :3003 (3000 taken).
- **Login hydration flake under Playwright** — password v-model won't bind when typed via automation on a cold server (fill-before-hydration). Browser-verify manually, not via Playwright.
- Pre-existing unrelated warning: `pages/coaches/[id].vue` → "Failed to resolve component: CoachProfileLink" (missing component; not from this work).
- Pre-existing unrelated: `unimport` WARN for `server/utils/~/utils/ncaaRecruitingCalendar` (harmless).

## Test Status
- Type-check: **PASS** (exit 0, 0 errors)
- Unit (coach-outreach): **PASS** — 29 (templateResolver 16 + useTemplateResolver 3 + editableProfileFields 10)
- Endpoints **verified live via Bearer curl**: profile-field write 200 + 400 rejections; athlete_messages log 200; timing (count/recent) correct; programNote dedupe `programNoteReused=true` across a different program.
- Full unit suite (`npm test`) + E2E: NOT run this session — verify before PR.
- Lint: not run this session.

## Verify next (browser, user's server — player1@compassdemo.app / DemoPass123!)
Athlete-role login shows inline profile edit; parent-role shows read-only + links.
1. Compose email → pick "First contact" → variables panel: profile vars have inline input+Save, authored vars ("why this program") have "write for this message" inputs, computed vars have "Edit in profile →".
2. Fill authored input → blur → preview + body fill inline; unresolved stay bold amber.
3. Send twice same school → 2nd warns "Send again to confirm". After a send, a row lands in `athlete_messages`.
4. Fill programNote, send to School A; same programNote to School B → **hard-block** (dedupe).
5. `/settings/player-details` Basics → Recruiting Email/Phone save; account Personal Info no longer shows Phone.

## Resume Command
> Continue coach-outreach on branch `feat/coach-outreach-templates`. Core is done + committed (7 commits, not pushed). Next: either (a) browser-verify + PR to develop, or (b) build Phase 5 (per-sport contact_window_rules auto-swap intro-standard↔intro-pre-window) — see docs/coach-outreach/migration-build-plan.md Phase 5. Also outstanding polish: pref:player.* inline writes (endpoint is column:users.* only), computed edit_path/edit_link per-var anchors, Phase 6 event_slots for {{eventSchedule}}.

## Next Steps (in order)
1. Manual browser verify (checklist above) on a stable user-run dev server.
2. Push branch + open PR to `develop` (ships 3 user-facing bug fixes too: loadTemplates, school-prop, phone model). Run full `npm test` + E2E first.
3. Phase 5 — per-sport contact-window config + auto template swap (baseball Aug 1 pre-junior, etc.; verify dates at ncaa.org).
4. Phase 6 — `event_slots` child table for multi-row `{{eventSchedule}}`.
5. Polish — `pref:player.*` inline editing; per-var `edit_path`/`edit_link` anchors; add integration tests for the athlete_messages + profile-field endpoints.
