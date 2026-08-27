# Handoff: Public Player Profile — Phase 4 (Express Interest) — PLANNING

**Date:** 2026-08-26
**Branch:** `develop` @ `ab161977` (start Phase 4 on a new branch off develop)
**Status:** READY TO PLAN — Phases 1–3 + Turnstile all shipped to develop (QA). No Phase 4 plan written yet.

## TL;DR for the next session

Phases 1, 2, 3 and the Turnstile integration are **all merged to develop (QA)**, none promoted to main/prod yet. Phase 4 = **Express Interest** — the second, lighter inbound flow (a one-tap "I'm interested" from a coach) + the athlete's **inbound inbox** to view/manage the leads + monthly analytics. No plan exists yet. First job in the fresh session: **brainstorm → write the Phase 4 plan → get Chris's approval → execute via subagent-driven-development** (same flow Phases 2/3 used).

## Completed prior sessions (all on develop now, QA only — NOT promoted to main)

- **Phase 1** — public page redesign — PR #487.
- **Phase 2** — owner setup page + inline socials/recruiting-services render — PR #490 (`65ba752d`). Live migration `20260908000000` (profile-banners bucket).
- **Phase 3** — Contact Player hardened inbound flow — PR #491 (`3437aa77`). Live migration `20260909000000` (**`profile_contacts` table** — the key reuse point for Phase 4).
- **Turnstile integration** — PR #492 (`ab161977`). Full siteverify contract (action + hostname-opt-in + token-length + client reset).

## Phase 4 scope (from the spec — read it first)

Spec: `planning/2026-08-25-public-player-profile-spec.md` — §Phase 4 (line ~125), §Public endpoints (line ~96 — the `/interest` endpoint), §Interaction states (line ~118 — the popover), §Open questions (line ~143 — does Express Interest need coach email?).

Spec's Phase 4 = "Public interest endpoint + one-tap popover + 'Interest Sent' state + athlete inbound inbox + monthly analytics." Concretely:
1. **`POST /api/public/profile/[slug]/interest`** — spec body `{ program, note?, coachName?, coachEmail?, turnstileToken, hp? }`. **Same guard stack as Phase 3** (honeypot → rate-limit → Zod → Turnstile → slug-404). Insert a `profile_contacts` row with **`type='interest'`** (the table + `program` column already exist from Phase 3's migration). Notify the player. Return `{ ok: true }`.
2. **Express Interest popover** — the currently-inert hero "Express Interest" button (Phase 3 left it inert). Lighter than Contact: spec's Figma shows **program select + optional note** (open question: does it need coach email at all?). Success → **"Interest Sent" button state**, persisted per-session in localStorage (server is source of truth). Turnstile widget (same conditional/flag-gated pattern as ContactPlayerModal).
3. **Athlete inbound inbox** — a page/section where the player sees their `profile_contacts` leads (both `type='contact'` from Phase 3 AND `type='interest'`). The table already has the family-read RLS policy (Phase 3). This is the "full inbox is Phase 4" deferral from Phase 3 coming due.
4. **Monthly analytics** — interest/contact counts over time (likely a small aggregate query + a chart; check `docs/design` + existing admin analytics patterns for the chart primitive).

## Heavy reuse available (Phase 3 built the rails — Phase 4 mostly reuses)

- `server/utils/turnstile.ts` — `verifyTurnstile(token, { ip, expectedAction })` + `isHoneypotTripped`. Phase 4's endpoint passes `expectedAction: "interest"` (and the popover renders the widget with `action: "interest"`).
- `server/utils/rateLimit.ts` — `rateLimitByIp(event, { ..., ip })` (now takes an optional trusted `ip`; pass `x-vercel-forwarded-for`-derived clientIp like Phase 3's `contact.post.ts` does).
- `server/utils/matchCoachByEmail.ts` — match-only coach resolver (family-scoped, never creates) — reuse if Express Interest captures a coach email.
- **`profile_contacts` table** — already has `type` (`contact`|`interest`), `program`, `matched_coach_id`, `school_name`, `ip`, `user_agent`, family-read RLS, NO public write policy. Phase 4 needs **no new table** (verify — the `program` column is already there).
- Notification path — Phase 3's `contact.post.ts` mints an `inbound_interaction` notification + `sendNotificationEmail` directly; mirror it.
- `ContactPlayerModal.vue` + its hero-button wiring (`PublicProfileCard.vue` owns modal state, `ProfileHero.vue` emits `contact`/`interest`) — the `interest` emit already exists and is inert; Phase 4 wires it to the new popover, exactly like Phase 3 wired `contact`.
- Model the endpoint spec + tests on Phase 3's `server/api/public/profile/[slug]/contact.post.ts` + `tests/unit/server/api/public/contact.spec.ts` (guard order, no-PII response, schoolId family-scope, trusted-IP).

## Design/product decisions to settle in the Phase-4 brainstorm (ask Chris)

- **Coach email on Express Interest?** Spec's Figma shows program + note only (anonymous-ish); spec open-question #143 flags "player-side value of anonymous interest vs identifiable." Decide before building the Zod schema. (If anonymous, `matchCoachByEmail` isn't used for interest.)
- **Program list** — is "program" a free-text field, or a select over a known list (the player's sports/positions, or a fixed vocab)? Check `utils/positions/canonical.ts` / sports constants for a reuse source.
- **Inbox location** — a new `pages/` route (e.g. `/settings/inbox` or a dashboard card) vs. folding into an existing page. Check where the player would naturally look.
- **Analytics scope** — monthly counts only, or funnel/breakdown? Keep Phase 4 tight; analytics can be a thin slice.
- **De-dupe / spam on interest** — one-tap is lower-friction than Contact → higher spam risk. Same honeypot+rate-limit+Turnstile stack applies; consider a per-slug limit (Phase 3 deferred the per-slug limiter as a TODO — Phase 4 may want it since interest is one-tap).

## Carried-over launch gate + fast-follows (from Phase 3 — still open)

- **🔴 Launch gate (before ANY public prod promote of Contact/Interest):** provision Turnstile in Vercel (`NUXT_TURNSTILE_SECRET_KEY` + `NUXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAEc9xAHjjO-Jv5pg`, then **redeploy** — SPA bakes NUXT_PUBLIC at build) **and** confirm Upstash rate-limit env (`UPSTASH_REDIS_REST_URL/TOKEN`) is set in prod. Code is done (#492); this is env + a redeploy Chris does.
- **Phase 3 fast-follows (backlog):** per-slug rate limit (per-IP present) — Phase 4 should probably just build the per-slug limiter since interest is one-tap; notification-preference gating for the inbound-lead type (always notifies now); dup-email `maybeSingle` swallow; IPv6-validation regex looseness.
- **Phase 2 fast-follows:** social icons are generic heroicons not brand logos; banner_url host allowlist; committed_school_id ownership check; promote private `buildSocial` to shared builders; FormTextarea/FormInput attrs-forwarding.

## Environment / process notes

- Single Supabase DB `xpxzhqghxecsjhvklsqg` serves prod + QA — every migration is a prod write. Apply via Supabase MCP `apply_migration` (local `db push` broken on this DB). Phase 4 likely needs **NO migration** (profile_contacts already has type+program) — verify first; if a schema need emerges, STOP and ask Chris.
- Local E2E is blocked by the dev-server EMFILE watcher (Phases 1–3 all hit it) — E2E specs land + run in CI, not locally. Node ≥22 (`nvm use`).
- Global component tags are `DesignSystem*` (never `DS*`). No raw hex — `npm run audit:tokens` must pass.
- Release flow: feature branch → PR to develop (QA) → promote develop → main (prod). Use the `release-flow` skill. Terse "push"/"merge"/"promote" = execution orders.
- SDD flow: `superpowers:subagent-driven-development` — per-task fresh implementer + task review + fix loop + whole-branch final review; ledger at `.superpowers/sdd/<plan-basename>/progress.md`. Model the plan file on `planning/2026-08-26-public-player-profile-phase3-plan.md`.

## Test Status (end of this session, on develop)

- Unit tests: **PASS — 8123 / 0** (last full run, Turnstile branch). Type-check: PASS (0). Lint: PASS (0). audit:tokens: PASS (0).
- E2E: Phase 2 + 3 specs committed, CI-deferred (local EMFILE).
- All of #490/#491/#492 merged CI-green.

## Resume Command

Start a new session and paste:

> Plan Public Player Profile Phase 4 (Express Interest). Read `planning/handoff-2026-08-26-public-player-profile-phase4.md` and the spec `planning/2026-08-25-public-player-profile-spec.md` (§Phase 4). Brainstorm the open product decisions with me (coach email on interest? program free-text vs select? inbox location? analytics scope? per-slug rate limit?), write the Phase 4 plan to `planning/`, get my approval, then branch off develop and execute via subagent-driven-development. Heavy reuse: the `profile_contacts` table (type='interest' + program column already exist), the Phase 3 guard stack (turnstile/rateLimit/matchCoachByEmail), and the Phase 3 endpoint/modal as templates.

## Next Steps (in order)

1. Read this handoff + spec §Phase 4; `git checkout develop && git pull`.
2. Verify `profile_contacts` already has `type` + `program` (no migration expected) — via Supabase MCP or `types/database.ts`.
3. Brainstorm the open decisions with Chris (list above).
4. Write the Phase 4 plan (model on the Phase 3 plan); get approval.
5. Branch `feat/public-player-profile-phase4` off develop; execute via SDD.
6. Ship: PR to develop, CI green. (Launch gate for prod promote is Chris's env work, separate.)
