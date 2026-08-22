# Handoff: E2E suite greening (test project)
**Date:** 2026-08-22
**Branch:** `debug/e2e-green` (off develop, 6 commits, all pushed, clean tree)
**Status:** NEARLY DONE — 481 pass / ~9 fail. The only genuine failures are 8 auth/signup, blocked on ONE Supabase dashboard toggle. Everything else passing or flaky.

## TL;DR for the next session
Suite went **177 → ~9** on `debug/e2e-green`. Of the 9: **8 are auth/signup**, all fixed by disabling "Confirm email" in the test project's Supabase Auth (a dashboard toggle — Chris/you must do it, no API). The other ~1–3 (a11y/interaction-detail-wcag, admin-ops:66) are **parallel-load flakes** — they pass 26/26 locally and on retry. Get green by: (1) toggle Confirm email off, (2) re-run E2E, (3) confirm the 8 clear.

## The ONE blocker → green
**Supabase dashboard → project `recruiting-compass-e2e-test` (ref `ahpethltxopkjxxzwmmb`) → Authentication → Sign In / Providers → Email → turn "Confirm email" OFF.**
Why: a fresh Supabase project defaults to email-confirmation ON, so UI/anon `signUp` returns no session (no auto-login) AND rejects `@example.com` as "invalid" / hits "email rate limit exceeded". That breaks `auth.spec` (6) + `signup-flow` (2). One toggle clears all 8. (Verified via a scripted `supabase.auth.signUp` probe: session=false, confirmation ON.)

## Completed This Session (all commits on `debug/e2e-green`)
- `d40aa0a2` **THE big fix** — loopback carve-out in `middleware/host.global.ts`. ROOT CAUSE of the "177 failures": an earlier commit set `NUXT_PUBLIC_ADMIN_HOST=localhost:3003` (= the serving host), so `resolveHostRedirect` treated EVERY authenticated page as the admin subdomain and redirected it to `/admin` during route resolution → blank `#__nuxt` → `beforeEach` 30s timeouts. Fix: `resolveHostRedirect` returns null on loopback hosts; removed the admin-host env from `e2e.yml`+`soak.yml`. (The prior "suite pre-existing red" writeup — `planning/handoff-2026-08-21-e2e-suite-red-finding.md` — was WRONG; the 177 was self-inflicted.)
- `a7a2f5c7` #412 status stepper + "interested" removed (specs used stale `selectOption`); `handle_new_user` `'student'`→`'player'` enum migration (`20260901`).
- `e2d9d510` CoachCard is a "View profile for {name}" LINK (not "View details" button); Direction is a FormSegmentedControl (#406/#407), not a `<select>`.
- `89926f78` seed `sports`(17)+`positions`(68) reference tables as a migration (`20260902`).
- `bd10fba4` school-notes selector: title-scoped `data-testid` (3 SchoolNotesCard instances share classes).
- `db5abf9e` `getCoachCount`/sort selectors: CoachCard name h3 is now `truncate font-semibold` (was `text-lg font-bold`) → count via the "View profile for" link.

## ⚠️ Reference data seeded LIVE into the test project (NOT in code — MUST codify)
A from-scratch rebuild of `ahpethltxopkjxxzwmmb` lacks these; I seeded them directly via Supabase MCP (they persist, but a reset loses them). **Follow-up: codify into the E2E seed (`tests/e2e/seed/seed.ts`) or migrations:**
- `nces_schools` — 8-row sample incl "Lincoln High School" (smart-inputs high-school search).
- `cron_runs` — 5 `health-ping` rows (admin-ops jobs card).
- `task.deadline_offset_months` — all 77 were NULL on test (prod has them); copied by slug (parent-tasks deadline badges). **This is what fixed parent-tasks:169 in CI.**
- `user_preferences` category='player' with `primary_sport: Baseball` for player@test.com (profile-edit position buttons).
- Deleted debris athlete `e2e-soak-athlete2@test.com` from the test family (was the parent's sport-less default athlete).
- `sports`+`positions` ARE codified (migration `20260902`) but also seeded live.

## Known Issues / Flakes (NOT genuine failures)
- `admin-ops.spec.ts:66` + `a11y/interaction-detail-wcag.spec.ts` (122/328/573) — failed in the 3-worker CI run but pass **26/26 locally** and on retry. Parallel-load flakiness (pre-existing). Not in scope; do not chase unless they fail deterministically.
- Local single-spec runs of parent-tasks:169 / profile-edit:52 flaked (cache/timing) but **BOTH PASSED in the full CI run** — they are fixed, not broken.

## Test Status
- E2E (CI run 32577580397, `debug/e2e-green`): **481 passed / 9 failed / 1 skip** (6.4m, 3 workers). The 9 = 8 auth/signup (blocked) + ~1 flake.
- type-check: PASS (0). lint: PASS (pre-push gates passed on every commit). Unit: not run this session.

## Local repro loop (fast — CI is ~7m/run)
A git worktree + dev server pointed at the test project lets you run single specs in seconds:
1. Worktree exists this session at `…/scratchpad/wt-dev` on `debug/e2e-green` with `node_modules` symlinked. A fresh session must recreate: `git worktree add <path> debug/e2e-green` + `ln -s <mainrepo>/node_modules <path>/node_modules`.
2. `<path>/.env` needs: `NUXT_PUBLIC_SUPABASE_URL=https://ahpethltxopkjxxzwmmb.supabase.co`, `NUXT_PUBLIC_SUPABASE_ANON_KEY=<test anon>`, `SUPABASE_SERVICE_ROLE_KEY=<test service_role — from dashboard or GitHub secret TEST_SUPABASE_SERVICE_ROLE_KEY>`, `NUXT_ADMIN_TOKEN_SECRET=any`, `CRON_SECRET=any`. **Do NOT set NUXT_PUBLIC_ADMIN_HOST** (that was the bug).
3. `cd <path> && PORT=3003 npm run dev` (nuxi dev loads `.env`, NOT `.env.local`).
4. Run a spec: `set -a; . ./.env; set +a; BASE_URL=http://localhost:3003 npx playwright test <spec> --project chromium --reporter=line` (webServer reuses the running :3003).
5. Drive the real browser for diagnosis via the Playwright MCP (login player@test.com / parent@test.com, pwd `TestPass123!`).

## CI facts
- `e2e.yml` runs on `pull_request → main` + `workflow_dispatch` (NOT develop PRs). Dispatch: `gh workflow run e2e.yml --ref debug/e2e-green`. Poll main job via `gh api .../actions/jobs/<id>/logs`.
- Needs repo secrets `TEST_SUPABASE_URL` / `TEST_SUPABASE_ANON_KEY` / `TEST_SUPABASE_SERVICE_ROLE_KEY` (set). 60m timeout, 3 workers.
- Live-log fetch during a run returns near-empty; wait for job completion.

## Resume Command
> "Continue getting the E2E suite green on `debug/e2e-green`. Confirm 'Confirm email' is OFF in the test project (ref ahpethltxopkjxxzwmmb) Auth, then dispatch e2e.yml and verify auth.spec + signup-flow pass. See planning/handoff-2026-08-22-e2e-green.md. Then codify the live-seeded reference data into the E2E seed and PR the branch to develop."

## Next Steps (in order)
1. Confirm/do the **Auth toggle** (Confirm email OFF) on the test project.
2. `gh workflow run e2e.yml --ref debug/e2e-green`; verify the 8 auth/signup pass (expect ≤~3 flakes remaining).
3. Re-run any flaky failures in isolation to confirm they're not deterministic.
4. **Codify reference data** (nces sample, cron sample, task deadline-offsets, player 'player' pref) into `tests/e2e/seed/seed.ts` so a rebuild reproduces green.
5. Open PR `debug/e2e-green` → develop (per release-flow). This delivers a green E2E suite fully isolated from prod.
6. (Optional) Fix parent-tasks/profile-edit cross-worker robustness only if they start flaking again; they passed in CI.
