# E2E Reliability — Findings Log

**Goal:** robust, trustworthy e2e suite. Log every failure/flake/error with evidence, then fix/refactor.

**Env baseline:** Node v24.18.0 (`.nvmrc`=24, CI e2e NODE_VERSION=24), chromium project, 4 workers local, fresh `node_modules`.

## Status

| Run | Date | Command | Pass | Fail | Flaky | Skip | Notes |
|-----|------|---------|------|------|-------|------|-------|
| smoke | 2026-06-29 | `diagnostic.spec.ts` | 5 | 0 | 0 | 0 | green, exit 0 |
| full-1 | 2026-06-29 | full chromium suite | 418 | 8 | ? | 52 | 9 did not run; 5.6m |
| reclass-1 | 2026-06-29 | `--last-failed --retries=2` | — | — | — | — | **ABORTED at gate** — global-setup `parent` auth capture timed out. No tests ran. |
| reclass-2 | 2026-06-29 | 8 specs `--retries=2` | — | — | — | — | **ABORTED at gate** — `player` auth capture timed out. No tests ran. |
| gate-5x | 2026-06-29 | diagnostic ×5 (post-fix) | ✅ 5/5 | 0 | 0 | 0 | **gate fixed** — all 4 accounts minted every run, 0 fallback, 0 abort. Exit criterion met. |
| full-2 | 2026-06-29 | full chromium (post-fix) | 438 | 7 | — | 42 | 0 did-not-run (cascade gone); 4.9m |

## Known issues (pre-existing, from memory)

- **coaching-philosophy.spec.ts:34** — session-expired race. Flaky.
- **smart-inputs.spec.ts:76** — heavy parallel-load flake.
- **~92 conditional-data-guard skips** — tests skip when seed data absent; need seed infrastructure. Tracked: [[e2e-seed-infra-auth-flake]].
- **test-account school leak** — suites leak schools into shared `player@test.com`; cleaned 2026-06-22, `fetchCoaches` now chunks `.in()`.

## Findings (this session)

### full-1: 8 failures (classification pending re-run)

> Note: full-1 ran with `| tail -80`, which discarded per-failure detail. Only the failure list + one error block survived. reclass-1 re-runs these 8 isolated with `--retries=2` to separate flake from deterministic. **Lesson:** never pipe e2e through `tail` — write full output to a file, slice after.

| # | Spec:line | Test | Captured error | Hypothesis |
|---|-----------|------|----------------|-----------|
| 1 | `admin/bulk-delete-users.spec.ts:151` | select-all checkbox | — | TBD |
| 2 | `school-detail-notes.spec.ts:109` | special characters in notes | — | TBD |
| 3 | `tier1-critical/user-story-9-1.spec.ts:46` | Athlete sees progress | — | TBD (seed-data dependent?) |
| 4 | `tier1-critical/user-story-9-1.spec.ts:163` | Mobile view responsive | — | TBD |
| 5 | `tier2-important/analytics.spec.ts:26` | Analytics heading loads | — | TBD |
| 6 | `user-stories/athlete-interactions.spec.ts:21` | Athlete logs email interaction | — | TBD |
| 7 | `user-stories/dashboard-8-1.spec.ts:238` | Dashboard slow-3G throttling | `DashboardPage.goto` timeout (BasePage.ts:11) | throttle > goto timeout → likely real timing bug or too-tight budget |
| 8 | `user-stories/dashboard-8-3.spec.ts:216` | clicking activity → details | `expect(newUrl).not.toBe(initialUrl)` — URL stayed `/dashboard` | click didn't navigate; activity row not clickable or no seed activity |

**9 did not run** — workers likely aborted after failures in same file, or downstream-of-failure. Investigate after reclass.
**52 skipped** — conditional-data-guard pattern (expected; seed-infra bucket).

### 🔴 CRITICAL — Gate flake (global-setup auth capture). Blocks entire suite.

`tests/e2e/global-setup.ts:64-113` provisions storageState for 4 accounts (player, parent, admin, iosParent) by driving a real browser login each. **Any single capture failure throws → aborts the whole run** (by design, lines 107-112, to avoid stale-auth 30-min hangs).

**Observed:** full-1 captured all 4 fine. reclass-1 (minutes later, same code) failed `parent`:
```
❌ Failed to capture storageState for parent: page.waitForURL: Timeout 15000ms exceeded.
waiting for navigation until "load"
  navigated to "http://localhost:3003/login"   (×4)
```
Post-click the page bounced back to `/login` repeatedly instead of `/dashboard`. **Non-deterministic** → race, not a hard bug.

**Why it flakes (suspects, in order):**
1. **No retry.** One transient login failure = full-run abort. Single point of failure with no resilience.
2. **Click races hydration.** `waitForFunction(!button.disabled)` (line 82-87) confirms the *attribute*, not that Vue bound the `@click`/submit handler. Click can fire into a not-yet-hydrated form → native submit/reload → back to `/login`.
3. **No login-error detection.** If Supabase auth returns an error (rate-limit on 4 rapid logins, session race), the loop just waits 15s for a URL change that never comes.
4. **Serial, fail-late.** 4 logins back-to-back; `parent` is 2nd. Possible auth rate-limit / session-cookie write race.

This matches memory [[e2e-seed-infra-auth-flake]]: "fix capture first." It is the #1 reliability blocker — **the suite cannot be trusted until the gate is deterministic.**

**Flake rate this session:** gate failed 2 of 4 runs (50%), different account each time (`parent`, then `player`). Worsens under rapid back-to-back runs → consistent with cumulative auth pressure (GoTrue rate/session race) or hydration timing. Login is **client-side Supabase `signInWithPassword`** (no server `/api/auth/login` endpoint), so the app's Upstash limiter is NOT the cause — it's GoTrue-side or browser-hydration.

**Consequence:** the 8 full-1 failures remain **unclassified** — reclass-1 and reclass-2 both aborted at the gate before any test ran. Cannot separate flake-from-real until the gate is fixed. → makes gate fix a hard prerequisite for everything else.

## Fix / Refactor Plan

Ordered by leverage. **Phase 0 is a hard prerequisite** — until the gate is deterministic, no other failure can be reliably classified or fixed, and the suite is untrustworthy by definition.

### ✅ Phase 0 — Make the auth gate deterministic — DONE (2026-06-29)

**Implemented (admin-mint + retry):**
- New `tests/e2e/seed/helpers/auth-session.ts` — mints a Supabase session via the password grant (anon client, server-side, no browser) and writes the exact `sb-<ref>-auth-token` localStorage storageState the app reads.
- `tests/e2e/global-setup.ts` rewired: per account, **mint (3 retries) → UI-login fallback (2 retries) → abort if both fail**. Added `withRetry` + extracted `captureViaUi` (now waits `networkidle` before click to dodge the hydration race).
- **Result (gate-5x):** 5/5 consecutive clean starts, all 4 accounts minted, 0 fallback, 0 abort. Exit criterion met. Faster too (no browser login: setup+5 tests 11–14s vs ~28s).
- **full-2 re-baseline confirms:** gate passed clean, `did-not-run` cascade gone (9→0), skips 52→42 (valid sessions unlocked guards).

#### Failure classification (full-1 ∩ full-2)

**Deterministic — real, fix in Phase 2 (4):**
| Test | Error | Hypothesis |
|---|---|---|
| `admin/bulk-delete-users.spec.ts:151` | `selectedCount` 25, expected 24 (`userCount-1`) | off-by-one — select-all likely includes the current-admin row the test excludes |
| `tier1-critical/user-story-9-1.spec.ts:46` | progress bar `toBeVisible` → hidden | no seeded tasks → progress bar not rendered (seed-data dep — Phase 4 overlap) |
| `tier1-critical/user-story-9-1.spec.ts:163` | same, mobile viewport | same root cause |
| `user-stories/athlete-interactions.spec.ts:21` | strict-mode: `text=Recruiting Inquiry` → 2 elements | test selector not unique → `.first()` or scope it |

**Flaky — only one of two runs (Phase 3):**
| Test | Note |
|---|---|
| `school-detail-notes.spec.ts:109` | full-1 only |
| `tier2-important/analytics.spec.ts:26` | full-1 only |
| `user-stories/dashboard-8-1.spec.ts:238` | full-1 only — slow-3G `goto` timeout; likely too-tight budget |
| `user-stories/dashboard-8-3.spec.ts:216` | full-1 only — click→nav URL stayed `/dashboard` |
| `family-invite-flow.spec.ts:373` | full-2 only — revoke card count race (resolved 4 then 2) |
| `school-detail-status-history.spec.ts:12` | full-2 only — "show loading spinner on initial load" inherently racy (spinner gone before assert) |
| `smart-inputs.spec.ts:76` | full-2 only — KNOWN flake, parallel-load, 30s timeout |

---

### Phase 0 — Make the auth gate deterministic 🔴 (unblocks everything) — original plan, now done

Root problem: storageState is captured by driving a **real UI login** per account, with **no retry** and a click that can race hydration. One transient failure aborts all 487 tests.

- **0a — Eliminate the UI-login race (primary fix, refactor).** Stop driving the browser to log in. Mint sessions directly via Supabase admin (already have `getSupabaseAdmin()` in setup): obtain access/refresh tokens server-side (password grant via GoTrue REST, or `admin.generateLink`), then write `storageState` JSON with the `sb-<ref>-auth-token` localStorage entry directly. No browser, no hydration race, no rate-limit pressure, ~10× faster. This is the real reliability win.
- **0b — Retry + readiness as belt-and-suspenders.** If any UI login is still needed: wrap each capture in a 3-attempt retry with backoff; before click `waitForLoadState("networkidle")` and assert the submit handler is wired (not just the `disabled` attr); detect a login-error toast and fail fast instead of waiting the full 15s.
- **0c — Reduce auth pressure.** Capture once, reuse across runs when fresh (cache `.auth/*.json`, re-mint only if expired). Avoids cumulative GoTrue rate pressure on back-to-back local runs.
- **Exit criterion:** 5 consecutive full-suite starts reach "Global setup complete" with 0 gate aborts.

### Phase 1 — Re-baseline the suite (after Phase 0)

- Run full chromium suite to a **file** (never `| tail` — full-1 lost all per-failure detail that way; lesson logged).
- Capture clean pass/fail/flake/skip counts + per-failure traces (`trace: on-first-retry` already set).
- Re-classify the 8 full-1 failures: deterministic-real vs flake.

### Phase 2 — Fix deterministic test failures (the real bugs among the 8)

Triage list (errors still uncaptured — gate blocked). Known signal:
- `dashboard-8-3:216` clicking activity → details: URL stayed `/dashboard`. Either app bug (row not navigable) or missing seed activity. Verify in-app first.
- `dashboard-8-1:238` slow-3G throttle: `goto` timeout. Likely too-tight budget under throttle, not an app bug → adjust timeout or mark as perf-tier.
- Others (`bulk-delete select-all`, `notes special chars`, `analytics heading`, `athlete-9-1 progress/mobile`, `athlete logs email`): capture errors in Phase 1, fix or quarantine.

### Phase 3 — Flake hardening

- Known flakes: `coaching-philosophy:34` (session-expired race), `smart-inputs:76` (heavy parallel load). Root-cause, don't just retry.
- Decide local retry policy (currently `retries: 0` local, `1` CI) — consider `retries: 1` local to surface flakes as flaky-not-failed.
- Review `workers: 4` local — parallel load is implicated in smart-inputs flake; measure.
- Add a flake-quarantine tag (`@flaky`) + a nightly job that runs quarantined tests to track without blocking.

### Phase 4 — Seed infrastructure (the 52 skips)

- 52 tests skip via conditional-data-guards (skip when seed data absent). They provide **zero coverage** in that state.
- Build deterministic seed (`E2E_SEED`/`db:seed:test` already scaffolded) so guarded tests run with real data. Tracked: [[e2e-seed-infra-auth-flake]].
- Convert "skip if no data" → "seed then assert".

### Phase 5 — CI / process hardening

- `9 did not run` in full-1 — understand worker-abort cascade; ensure one file's failure doesn't silently drop unrelated tests.
- Trace/video/screenshot retention on failure (partly configured).
- Consider sharding for wall-clock (5.6m chromium-only).
- Align local and CI Node (both 24 now ✓).

## Open questions (resolve before/at execution)

1. **Phase 0 approach:** admin-mint storageState (0a, bigger refactor, best outcome) vs retry-the-UI-login (0b, smaller, leaves race latent)? Recommend 0a + 0b.
2. **Scope now:** fix only the gate (Phase 0) and re-baseline first, or commit to full Phase 0–5 program?
3. **Flake policy:** retry-to-green acceptable, or root-cause-only (no masking)? Affects Phase 3.
4. Is the slow-3G throttle test (`dashboard-8-1:238`) meant to be a hard gate, or a soft perf check?
