# Handoff: Public Player Profile — Phase 2 (Owner Setup Page)

**Date:** 2026-08-25
**Branch:** `develop` (start Phase 2 on a new branch off develop)
**Status:** READY TO START — Phase 1 merged; Phase 2 plan written & unapproved

## TL;DR for the next session

Phase 1 (public page redesign) is **merged to develop** (QA). Phase 2 = the **owner setup/editor page** (Figma right frame). A full task-by-task plan already exists at `planning/2026-08-25-public-player-profile-phase2-plan.md` — read it first. Get Chris's approval on the plan, then execute via subagent-driven-development (same flow Phase 1 used).

## Completed prior sessions (on develop now)

- **Phase 1 public page redesign** — merged PR #487 (develop tip `685d3f56`). Dark-hero public page (`components/profile/public/*`, rebuilt `components/profile/PublicProfileCard.vue`), extended `server/api/public/profile/[slug].get.ts` (PII-safe `assemblePublicProfile`, `resolveSections`), pure helpers `utils/profile/sectionConfig.ts` + `utils/profile/publicProfileBuilders.ts`. Migration `20260907000000_public_profile_phase1.sql` **applied live** to prod DB `xpxzhqghxecsjhvklsqg`.
- **CI-isolation fix** — merged PR #488 (`3fb0db3e`). `interactions-add.spec` now mocks `vue-router` `useRoute`. Greened develop CI.

## In Progress (Uncommitted)

- `CLAUDE.local.md` — session-notes edit only (intentionally left uncommitted per repo convention). Not part of Phase 2.

## Phase 2 scope (from the plan — 13 tasks)

Owner setup page `pages/settings/public-profile.vue` + extend `components/profile/ProfileSetup.vue`:
1. Add `qrcode` dep. 2. `profile-banners` Storage bucket (migration, controller applies live). 3. Extend `server/api/player/profile.put.ts` — accept new fields + **`reconcileVisibility` to keep `section_config`⇄`show_*` in sync** (this is the write path that finally makes `section_config` owner-editable). 4. `useProfileBanner` upload composable. 5. `SectionConfigEditor.vue` (sortablejs drag + visibility) + `utils/profile/sectionMeta.ts`. 6. `ProfileContentEditor.vue` (looking_for/awards/values). 7. Appearance (banner) + `CommitmentStatusControl`. 8. Share tools + QR. 9. `ProfileLivePreview` (reuses PublicProfileCard via `resolveSections`). 10. Fix `ProfilePreview.vue` → `resolveSections` (Phase-1 deferred parity item). 11. Assemble setup page. 12. E2E owner-toggle→public. 13. Gates.

## Chris's design decisions (bind Phase 2)

- **Target-schools list stays dropped** from the public page.
- **Socials + recruiting-service IDs to be RESTORED** as public sections — **Chris is producing an updated design**. Phase 2's section editor is data-driven via `SECTION_META`, so `social` + `recruiting_services` keys slot in once his design lands. Do NOT build their public rendering until the design exists. (Recorded in the spec's "Update 2026-08-25 — Phase 2 design inputs".)
- Anti-abuse (Turnstile + rate-limit + honeypot) and no-coach-accounts inbound model are for Phases 3–4, not Phase 2.

## Phase-1 deferred follow-ups to fold into Phase 2

- `components/profile/ProfilePreview.vue` still uses raw `normalizeSectionConfig` → owner preview can diverge from the public page. Task 10 fixes it via `resolveSections`.
- `show_metrics` has no owner toggle yet — the Section Config editor (Task 5) provides it.
- "Verified Coach Access" pill in `ProfileHero.vue` renders unconditionally — revisit in Phase 3/4 (coach interactions), not Phase 2.
- `commitmentStatus` / `committedSchoolName` / `bannerUrl` are plumbed through the payload but unrendered — Phase 2 adds the owner controls; public rendering of commitment/banner may need small `PublicProfileCard` additions (verify against Figma).

## Known Issues / Blockers

- **Local E2E + endpoint live-curl are blocked by the dev environment** (dev server EMFILE file-watcher limit; `npm run preview` can't serve the Vercel-preset build locally). Rely on CI for E2E. Unit + component tests run fine locally.
- **Broader test-isolation debt** (separate from CI): several specs are order-fragile under *intra-file* test shuffling (`--sequence.shuffle` full). This does NOT affect CI (CI never reorders tests within a file) and is not Phase 2's job — leave it unless it starts biting.

## Test Status (end of this session, on develop)

- Unit tests: PASS — 8044/0 local (Phase 1 branch); CI-equiv `test:coverage` 7987/0 after the #488 fix. Both #487 and #488 CI green at merge.
- Type check: PASS (0).
- Lint: PASS (0). audit:tokens: PASS (0).

## Environment notes

- Single Supabase DB `xpxzhqghxecsjhvklsqg` serves prod + QA — every migration is a prod write. Apply via Supabase MCP `apply_migration` (local `db push` is broken on this DB). Ask Chris before applying live.
- Migrations dir: `supabase/migrations/` named `YYYYMMDDHHMMSS_<name>.sql`. Next free timestamp after `20260907000000`.
- Global component tags are `DesignSystem*` (NOT `DS*`) — see `planning/lessons.md`.
- E2E needs Node ≥22 (`nvm use`); this machine's dev-server E2E hits EMFILE (raise `ulimit -n` doesn't fully fix — use CI).
- Demo owner accounts for manual/E2E: `player1@compassdemo.app` / `parent1@…`, pwd `DemoPass123!`. Published demo slug: `owen-andrikanich-2028`.

## Resume Command

Start a new session and paste:

> Start Public Player Profile Phase 2. Read `planning/handoff-2026-08-25-public-player-profile-phase2.md` and `planning/2026-08-25-public-player-profile-phase2-plan.md`. Confirm the plan with me, then branch off develop and execute it via subagent-driven-development. Note: socials/recruiting-services public rendering waits on my updated design — build the section editor data-driven so they slot in later.

## Next Steps (in order)

1. Read the Phase 2 plan + this handoff; `git checkout develop && git pull`.
2. Confirm the plan with Chris (esp. whether his socials/recruiting-services design is ready — if yes, add those keys to `SECTION_META` + their public components; if no, build data-driven and defer).
3. Branch `feat/public-player-profile-phase2` off develop.
4. Execute Tasks 1–13 via subagent-driven-development (fresh SDD workspace/ledger). Controller applies the Storage-bucket migration live with Chris's ok (Task 2).
5. Ship: PR to develop, CI green, then Chris promotes.
