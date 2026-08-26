# Public Player Profile — Phase 3 (Contact Player) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) tracking.

**Goal:** Add the inbound **Contact Player** flow to the public profile: an unauthenticated recruiting contact fills a lightweight form on `/p/<slug>`, server hardens it (honeypot + Turnstile + rate-limit + Zod), **matches-or-creates a coach** in the player's CRM, logs an **inbound `interactions` row**, and fires the **existing** `createInboundInteractionAlert` (in-app notification + Resend email to the player). No coach accounts. Returns `{ ok: true }` only — never PII.

**Spec:** `planning/2026-08-25-public-player-profile-spec.md` (§Phase 3, §Security notes). Design: Figma node 5-5 hero "Contact Player" button + contact modal (spec:117).

## Decisions (Chris, 2026-08-26 — bind this phase)

- **Storage = reuse `interactions` (direction=inbound), NOT a new `profile_contacts` table.** Match-or-create coach → `interactions` row (`direction='inbound'`, `coach_id`, `family_unit_id`) → existing `createInboundInteractionAlert` (`utils/interactions/inboundAlerts.ts`) mints the LIVE `inbound_interaction` notification + `sendNotificationEmail`. Shows in the coach timeline; the `last_contact_date` trigger fires. **No new table → no player_contacts migration.**
- **Coach dedup = email-only.** Within the player's `family_unit_id`, match on case-insensitive `coaches.email`; no email or no match → create. (Accepts more duplicates when a coach omits email — Chris's call.)
- **Turnstile behind a verifier interface + env flag.** Real honeypot + rate-limit + code path always; Turnstile verification is a no-op **pass** when `TURNSTILE_SECRET_KEY` is absent (mirrors `emailService.ts:90`'s missing-RESEND guard). Widget renders only when the public site key is present. Wire real keys later with no rebuild.
- **This phase = Contact Player only.** Express Interest = Phase 4 (separate endpoint + popover + inbox + analytics).

## Reuse map (from investigation — do NOT reinvent)

| Need | Reuse | Location |
|---|---|---|
| Rate limit per IP (graceful degrade) | `rateLimitByIp()` | `server/utils/rateLimit.ts:53` (precedent: `help/feedback.post.ts:13` = 3/5min) |
| Client IP | `getRequestIP(event,{xForwardedFor:true})` (h3) / `getClientIp` | `server/middleware/rate-limit.ts:127` |
| Zod body validate | `schema.safeParse(await readBody(event))` → `createError(422, .issues[0]?.message)` | `server/api/feedback.post.ts:28` |
| Service-role insert | `useSupabaseAdmin()` | `server/api/family/create.post.ts:12` |
| Slug → player resolution (hash or vanity) | existing resolver | `server/api/public/profile/[slug].get.ts` + `[slug]/view.post.ts:14` (unauth POST precedent) |
| Inbound notification + email | `createInboundInteractionAlert(...)` | `utils/interactions/inboundAlerts.ts:14` → `sendNotificationEmail` `emailService.ts:168` |
| Coach create | `coaches` table (has `family_unit_id`, `email` nullable, `role`, `school_id`) | `stores/coaches.ts:217` (server does its own service-role insert, not the store) |
| Missing-key no-op guard pattern | `emailService.ts:90` | mirror for Turnstile stub |
| runtimeConfig secret slot | `nuxt.config.ts:198-218` | add `turnstileSecretKey` (server) + `turnstileSiteKey` (public) |

**Net-new:** Turnstile verifier util (flagged), honeypot handling, the contact POST endpoint, the match-or-create coach resolver, `ContactPlayerModal.vue`, wiring the inert hero button.

## Global Constraints

- TS strict, no `any` outside tests; `as const` enums; immutability. Zod for ALL body input.
- **Security (unauth write endpoint — primary risk surface):** honeypot field (`hp`) non-empty → return `{ ok: true }` (silent no-op, never reveal it's a trap); Turnstile verify server-side (behind flag); `rateLimitByIp` per-IP AND a per-slug limit; **service-role inserts only** (no client RLS insert); **no player PII in any response** (`{ ok: true }` only); log `ip`/`ua` via `useLogger` for abuse triage (no DB column — no `profile_contacts` table this phase); Zod-validate every field.
- No secret in client bundle: `TURNSTILE_SECRET_KEY` server-only (`runtimeConfig`), only `turnstileSiteKey` public.
- UI: no raw hex/rgba — brand tokens; `DesignSystem*` (never `DS*`); `npm run audit:tokens` clean.
- Gates before "done": `npm run type-check`, `npm run lint`, `npm run test`, `npm run audit:tokens`.
- Single Supabase DB serves prod + QA. **No migration this phase** (reusing `interactions`). If any schema need emerges, STOP and raise it — don't add a table silently.

---

### Task 1: Turnstile verifier (flagged) + honeypot helper + runtimeConfig

**Files:** Create `server/utils/turnstile.ts`; Modify `nuxt.config.ts`; Test `tests/unit/server/utils/turnstile.spec.ts`.

**Interfaces:** `verifyTurnstile(token: string | undefined, ip?: string): Promise<{ ok: boolean; reason?: string }>` — when `TURNSTILE_SECRET_KEY` is empty/undefined → resolves `{ ok: true, reason: 'disabled' }` (no-op pass, mirrors emailService guard); otherwise POSTs to `https://challenges.cloudflare.com/turnstile/v0/siteverify` with `secret`+`response`(+`remoteip`), returns `{ ok: data.success }`. Never throws (network error → `{ ok: false, reason: 'verify_failed' }`). `isHoneypotTripped(hp: unknown): boolean` — true when `hp` is a non-empty string.

- [ ] **Step 1 (TDD RED):** test — no key set → `verifyTurnstile("anything")` resolves `{ok:true, reason:'disabled'}`; key set + mocked fetch success → `{ok:true}`; key set + fetch `success:false` → `{ok:false}`; fetch throws → `{ok:false, reason:'verify_failed'}` (no throw); `isHoneypotTripped("x")===true`, `("")===false`, `(undefined)===false`. Run → FAIL.
- [ ] **Step 2:** Implement. Read the secret via `process.env.NUXT_TURNSTILE_SECRET_KEY` (or `useRuntimeConfig().turnstileSecretKey` if in event context — prefer the runtimeConfig read the repo uses server-side). Add to `nuxt.config.ts` runtimeConfig: `turnstileSecretKey: process.env.NUXT_TURNSTILE_SECRET_KEY || ""` (server) and `runtimeConfig.public.turnstileSiteKey: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY || ""`.
- [ ] **Step 3:** GREEN + `npm run type-check`. Commit `feat(security): turnstile verifier (flag-gated) + honeypot helper`.

---

### Task 2: Match-coach-by-email resolver (MATCH-ONLY — no create)

> **REVISED 2026-08-26 (Chris):** `coaches.school_id` + `user_id` are NOT NULL live, and the public page hides the player's schools, so a stranger can't supply a valid schoolId — AND creating coaches/schools from an unauthenticated endpoint is an unwanted CRM-spam surface. **Decision: NEVER create a coach from the public contact endpoint.** Match an existing coach by email → link; no match → the interaction is logged with `coach_id = NULL` (Task 3) and the player converts it later via the existing add-coach flow. This task is therefore MATCH-ONLY.

**Files:** Create `server/utils/matchCoachByEmail.ts`; Test `tests/unit/server/utils/matchCoachByEmail.spec.ts`.

**Interfaces:** `matchCoachByEmail(admin, { familyUnitId, email }): Promise<{ coachId: string | null }>`. When `email` is a non-empty string: `SELECT id FROM coaches WHERE family_unit_id = $1 AND lower(email) = lower($2) LIMIT 1` → return `{ coachId: row.id }` on hit, else `{ coachId: null }`. No email → `{ coachId: null }`. NO insert, NO name-splitting, NO user_id/school_id/role logic (all removed — dead under the no-create decision). Service-role client passed in (endpoint owns `useSupabaseAdmin`). Always family-scoped.

- [ ] **Step 1 (TDD RED):** test with a mocked admin client (repo's chainable `.eq()` mock idiom): existing email (case-insensitive) → returns that id, `created:false`, no insert; new email → insert called, `created:true`; no email → always insert; name split correct. Run → FAIL.
- [ ] **Step 2:** Implement. Family-scoped ALWAYS (never match across families). `email` compared case-insensitively. Insert cast to the coaches Insert type.
- [ ] **Step 3:** GREEN + type-check. Commit `feat(coach): match-or-create resolver (email dedup, family-scoped)`.

---

### Task 3: `POST /api/public/profile/[slug]/contact` endpoint

**Files:** Create `server/api/public/profile/[slug]/contact.post.ts`; Test `tests/unit/server/api/public/contact.spec.ts` (unit) + note integration path.

**Interfaces:** Zod body `{ coachName: string(1..120), coachEmail?: email, coachTitle?: string(<=80), schoolId?: uuid, schoolName?: string(<=120), note: string(1..2000), turnstileToken?: string, hp?: string }`. Order of guards (fail fast, cheap first):
1. `isHoneypotTripped(body.hp)` → return `{ ok: true }` immediately (silent).
2. `rateLimitByIp(event, { limit, window })` per IP (e.g. 5/10min) → 429 on exceed; ALSO a per-slug guard (key `contact:<slug>`, e.g. 20/hour) to blunt targeting one athlete.
3. Zod `safeParse` → 422 `.issues[0]?.message`.
4. `verifyTurnstile(body.turnstileToken, ip)` → `{ ok:false }` → 403.
5. Resolve player by slug (reuse resolver); unpublished/not-found → 404.
6. `matchCoachByEmail(admin, { familyUnitId, email })` → `coachId | null` (match-only; NEVER creates a coach — Chris 2026-08-26).
7. Insert `interactions` row: `direction='inbound'`, `coach_id` (matched id OR **null**), `family_unit_id`, `type` (existing inbound-appropriate enum — verify the live enum; NO enum add without asking), `subject` (`"Contact from <coachName>"`), `content` (note + coachName + coachEmail + coachTitle + schoolName so the player has the lead details even when `coach_id` is null), `occurred_at=now()`.
8. `createInboundInteractionAlert(...)` with the resolved player user (coach may be null) → notification + email (fire-and-forget-safe, never blocks the response). **Verify the alert works with a null coach** — read `inboundAlerts.ts:14`; if it hard-requires a coach, adapt (pass coach details / degrade gracefully) or STOP + report.
9. **Turnstile-disabled warning:** when `verifyTurnstile` returns `reason:'disabled'`, log a `useLogger` WARNING (loud signal that a keyless prod deploy has no CAPTCHA — the flag is off). Defense-in-depth (honeypot + rate-limit) still applies.
9. `useLogger(event,'public:contact').info({ ip, ua, slug, created })` for triage.
10. Return `{ ok: true }` (never coach/player PII).

- [ ] **Step 1 (TDD RED):** unit tests over a mocked admin + mocked deps: honeypot → `{ok:true}` and NO insert; bad body → 422; Turnstile fail → 403; happy path → coach matched/created + interaction insert + alert called + `{ok:true}`; response never contains player email/name. Run → FAIL.
- [ ] **Step 2:** Implement, reusing rateLimit + slug resolver + useSupabaseAdmin + createInboundInteractionAlert. Verify the `interactions.type` enum has an inbound-appropriate value (read the type); if none fits, use the closest existing value — do NOT add an enum (no migration) without stopping to ask.
- [ ] **Step 3:** GREEN + type-check + lint. `npm run dev` + `curl` the endpoint (honeypot, bad body, happy path shapes). Commit `feat(api): public Contact Player endpoint (hardened, match-or-create + inbound alert)`.

---

### Task 4: `ContactPlayerModal.vue`

**Files:** Create `components/profile/public/ContactPlayerModal.vue`; Test `tests/unit/components/profile/ContactPlayerModal.spec.ts`.

**Interfaces:** props `{ slug: string; playerName: string; schools?: {id;name}[] }`, emits `close`, `submitted`. Fields: coach name, coach title, school (free-text; if `schools` provided, a datalist/typeahead that can also fall back to free-text → `schoolName`), coach email, message. Hidden honeypot input `hp` (visually hidden, `autocomplete="off"`, `tabindex="-1"`). Turnstile widget mounts ONLY when `runtimeConfig.public.turnstileSiteKey` is set (script loaded client-side; token captured into `turnstileToken`). Submit → `$fetch('/api/public/profile/'+slug+'/contact', { method:'POST', body })`. Success → confirmation state ("The player will be notified and can respond directly" — spec:117). Error → inline message; 429 → friendly "try again shortly". `<script setup>`, DesignSystem*, brand tokens, no raw hex.

- [ ] **Step 1 (TDD RED):** test — renders fields + honeypot; fills + submits → `$fetch` called with the body incl `hp` empty; success response → confirmation state shown; Turnstile widget absent when no site key (mock runtimeConfig). Run → FAIL.
- [ ] **Step 2:** Implement. Turnstile script inject guarded + cleaned up; don't crash if the script fails to load (submit still works — server no-ops verification when flag off). Zod-mirror client validation for UX (server is source of truth).
- [ ] **Step 3:** GREEN + type-check + audit:tokens. Commit `feat(profile): Contact Player modal (honeypot + optional Turnstile)`.

---

### Task 5: Wire the hero "Contact Player" button

**Files:** Modify `components/profile/public/ProfileHero.vue` (+ `PublicProfileCard.vue` if it owns the modal/state); Test extend the hero/card spec.

**Interfaces:** The currently-inert "Contact Player" hero button opens `ContactPlayerModal` (teleported, backdrop — heed the teleport-backdrop-isolate-root lesson: don't teleport the backdrop over the menu). Pass `slug`, `playerName`, and the player's `schools` if available in the public payload (only if already exposed — do NOT add PII; schoolName free-text is the safe default). Keep "Express Interest" inert (Phase 4).

- [ ] **Step 1 (TDD RED):** test — clicking "Contact Player" opens the modal; closing hides it. Run → FAIL.
- [ ] **Step 2:** Implement (open/close state on the card or hero). No raw hex.
- [ ] **Step 3:** GREEN + type-check + audit:tokens. Commit `feat(profile): wire hero Contact Player button to modal`.

---

### Task 6: E2E — public visitor submits contact → player notified

**Files:** Create/extend `tests/e2e/profile-contact.spec.ts`.

- [ ] **Step 1:** E2E — anonymous context opens `/p/<slug>` (self-published in setup, as Phase 2's spec does), opens Contact Player, fills the form (honeypot left empty), submits, asserts the confirmation state. Turnstile off in the test env (no site key) so no widget blocks. Optionally, as an authenticated second context (the player), assert a new notification appears. Follow repo Playwright conventions (storageState, separate anon context, data-test selectors).
- [ ] **Step 2:** `--list` parses + typecheck/lint clean; run locally if possible, else CI-defer (known EMFILE — document it). Do NOT weaken.
- [ ] **Step 3:** Commit `test(e2e): public Contact Player submit → player notification`.

---

### Task 7: Full gate + phase wrap

- [ ] `npm run type-check && npm run lint && npm run test && npm run audit:tokens` — all pass.
- [ ] `npm run dev` — open a public profile logged-out, submit Contact Player, confirm the player gets an in-app notification (+ email if RESEND configured); confirm the network response is `{ ok: true }` with NO PII; confirm honeypot + a rapid-fire rate-limit behave.
- [ ] Update `CLAUDE.local.md`; note the Turnstile keys are NOT yet provisioned (flag off in prod until added) as a launch item.

---

## Self-Review

**Spec coverage (Phase 3 slice):** hardened public contact endpoint (T3) with honeypot+Turnstile+rate-limit+Zod+service-role+no-PII (Global Constraints), match-or-create coach email-dedup (T2), inbound `interactions` + existing alert reuse (T3 per decision), Turnstile flagged verifier (T1), contact modal + confirmation (T4), hero button wired (T5), E2E (T6), gates (T7). ✓

**Deviations from spec (intentional, Chris-approved):** no `profile_contacts` table — reuse `interactions`+`createInboundInteractionAlert`; ip/ua to logs not a DB column; coach dedup email-only. ✓

**Deferred to Phase 4:** Express Interest endpoint + popover + "Interest Sent" state + inbound inbox + monthly analytics. Provisioning real Turnstile keys (flag stays off until then). Security fast-follows carried from Phase 2 (banner host allowlist, committed_school_id ownership).

**Open items to confirm at build:** exact `interactions.type` enum value for an inbound contact (use existing; no enum add without asking); whether the public payload already carries a safe `schools` list for the modal typeahead (default: free-text schoolName only, no new PII exposure).
