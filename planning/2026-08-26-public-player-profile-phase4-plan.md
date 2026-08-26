# Public Player Profile — Phase 4 (Express Interest) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) tracking.

**Goal:** Add the second inbound flow to the public profile — **Express Interest**: a low-friction, one-tap "I'm interested" from a coach on `/p/<slug>`. Server hardens it with the **same guard stack as Phase 3** (honeypot → per-IP rate-limit → **per-slug rate-limit** → Zod → Turnstile → slug-404), inserts a `profile_contacts` row with **`type='interest'`**, optionally links a CRM coach via `matchCoachByEmail`, and notifies the player. Plus: the athlete's **inbound inbox** (view Contact + Interest leads) and **thin monthly analytics**. Returns `{ ok: true }` only — never PII.

**Spec:** `planning/2026-08-25-public-player-profile-spec.md` (§Phase 4 line ~125, §Public endpoints line ~96, §Interaction modals line ~118). **Handoff:** `planning/handoff-2026-08-26-public-player-profile-phase4.md`.

## Decisions (Chris, 2026-08-26 — bind this phase)

- **Coach identity on Express Interest = OPTIONAL email.** Form = `program` (required) + optional `note` + optional `coachName` + optional `coachEmail`. Truly one-tap still allowed (program only). When `coachEmail` present → `matchCoachByEmail` links an existing CRM coach (same match-only rail as Phase 3, **never creates** a coach). Anonymous interest is a valid lead.
- **`program` field = select over the athlete's own sport(s)/positions**, with **free-text fallback**. Source is the PUBLIC payload's `athletic` block (`primary_sport` + `positions`). ⚠️ `athletic` is **`null` when `show_athletic` is false** (`types/models.ts:538`) → when null OR empty, the popover renders a free-text `program` input. No new PII exposure (sport is already public when shown).
- **Inbox home = a new "Inbox" tab in `pages/settings/player-details.vue`** (beside the existing `public-profile` tab that renders `ProfileSetup`). Co-located with the profile that generates the leads. Shows BOTH `type='contact'` (Phase 3) and `type='interest'` leads.
- **Analytics = thin.** Monthly count tiles ("N interest / N contact this month") + a small over-time count, above the inbox list. One aggregate query. No funnel/breakdown this phase.
- **Per-slug rate limit = build it this phase.** One-tap = higher spam surface than Contact. Add exported `rateLimitByKey(event, key, opts)` to `rateLimit.ts` and apply `interest:<slug>` on the interest endpoint AND retrofit `contact:<slug>` on the Phase-3 contact endpoint (closes its deferred TODO at `contact.post.ts:104`).

## Reuse map (Phase 3 built the rails — Phase 4 mostly reuses)

| Need | Reuse | Location |
|---|---|---|
| Guard stack template (honeypot→rate-limit→Zod→Turnstile→slug-404→match→insert→notify→`{ok:true}`) | clone the whole handler | `server/api/public/profile/[slug]/contact.post.ts` |
| Turnstile verify (flag-gated, no-op pass when keyless) | `verifyTurnstile(token,{ip,expectedAction})` + `isHoneypotTripped` | `server/utils/turnstile.ts` |
| Per-IP rate limit (trusted `x-vercel-forwarded-for`) | `rateLimitByIp(event,{requests,window,ip})` + `throwIfRateLimited` | `server/utils/rateLimit.ts:61` |
| Coach match (match-only, family-scoped, never creates) | `matchCoachByEmail(admin,{familyUnitId,email})` | `server/utils/matchCoachByEmail.ts` |
| Trusted client IP + IP→inet coercion | `x-vercel-forwarded-for` chain + `toValidInetOrNull` | `contact.post.ts:83`, `:43` |
| Slug→player resolve (hash then vanity, unpublished→404) | inline resolver | `contact.post.ts:139` |
| Player notification + email (fire-and-forget-safe) | notifications insert (`type:'inbound_interaction'`, `related_entity_type:'profile_contact'`) + `sendNotificationEmail` | `contact.post.ts:239` |
| Lead sink table (`type` in contact/interest, `program`, family-read RLS) | `profile_contacts` (already live) | migration `20260909000000_profile_contacts.sql` |
| Hero button emits (`contact`/`interest`, `interest` inert) | `@interest` handler is net-new; `@contact` is the pattern | `components/profile/public/ProfileHero.vue:9,115` |
| Modal wiring host (owns ProfileHero + ContactPlayerModal) | add ExpressInterestPopover + `@interest` here | `components/profile/PublicProfileCard.vue` |
| Turnstile widget (conditional/flag-gated client pattern) | mirror the widget mount + token capture | `components/profile/public/ContactPlayerModal.vue` |
| Settings tab pattern (`tabs`, `currentTab`, `v-show`) | add `inbox` tab entry | `pages/settings/player-details.vue:57` |
| Public sport/positions for the program select | `data.athletic?.primary_sport` + `data.athletic?.positions` (null-safe) | `types/models.ts:538` |

**Net-new:** `rateLimitByKey`; the interest POST endpoint; `ExpressInterestPopover.vue`; `@interest` wiring + "Interest Sent" localStorage state; `GET /api/player/profile/contacts` (authed inbox endpoint + monthly counts); `useProfileContacts` composable; `ProfileInbox.vue` (tab content + stat tiles).

## Global Constraints

- TS strict, no `any` outside tests; `as const` enums; immutability. Zod for ALL body input.
- **Security (unauth write endpoint — primary risk surface):** honeypot `hp` non-empty → `{ ok:true }` silent no-op; per-IP AND **per-slug** rate limit; Turnstile verify server-side (flag-gated, loud `warn` when disabled); **service-role inserts only** (no client RLS insert — `profile_contacts` has NO insert policy); **no player/coach PII in any response** (`{ ok:true }` only); capture `ip`/`ua`; Zod-validate every field.
- Inbox endpoint (authed) = **read-only**, family-scoped via the existing `profile_contacts` family-read RLS (`auth.uid()` through `family_members`). Resolve the family athlete the same way other authed player endpoints do — do NOT trust a client-supplied family id.
- No secret in client bundle. UI: no raw hex/rgba — brand tokens; `DesignSystem*` (never `DS*`); DS empty/loading/error states; `npm run audit:tokens` clean.
- **NO migration this phase.** `profile_contacts` already has `type` + `program` + coach fields + family-read RLS (verified live, `20260909000000`). If any schema need emerges → **STOP and ask Chris**.
- Local E2E blocked by dev-server EMFILE (Phases 1–3 all hit it) → E2E lands + runs in CI, not locally. Node ≥22 (`nvm use`).
- Gates before "done": `npm run type-check`, `npm run lint`, `npm run test`, `npm run audit:tokens`.

---

### Task 1: `rateLimitByKey` + per-slug limiting (retrofit Contact)

**Files:** Modify `server/utils/rateLimit.ts`; Modify `server/api/public/profile/[slug]/contact.post.ts` (apply per-slug + drop the TODO); Test `tests/unit/server/utils/rateLimit.spec.ts` (extend if present, else create).

**Interface:** `rateLimitByKey(event: H3Event, key: string, options: RateLimitOptions): Promise<RateLimitResult>` — mirrors `rateLimitByUser` but limits on the caller-supplied `key` verbatim (the caller namespaces it, e.g. `interest:<slug>`). No limiter configured (missing Upstash env) → `BYPASS_RESULT` (graceful degrade, unchanged precedent). Never throws.

- [ ] **Step 1 (TDD RED):** test — with a mocked limiter, `rateLimitByKey(event,'interest:abc123',{requests:20,window:'1 h'})` calls `limiter.limit('interest:abc123')`; missing env → `BYPASS_RESULT`; limiter throw → `BYPASS_RESULT` (safeLimit). Run → FAIL.
- [ ] **Step 2:** Implement `rateLimitByKey` (reuse `createLimiter`/`safeLimit`). In `contact.post.ts`, after the per-IP limit add `throwIfRateLimited(await rateLimitByKey(event, \`contact:${slug}\`, { requests: 20, window: "1 h" }))` and delete the `TODO(per-slug rate limit)` comment block.
- [ ] **Step 3:** GREEN + type-check + lint. Commit `feat(security): per-slug rate limiter + retrofit Contact endpoint`.

---

### Task 2: `POST /api/public/profile/[slug]/interest` endpoint

**Files:** Create `server/api/public/profile/[slug]/interest.post.ts`; Test `tests/unit/server/api/public/interest.spec.ts` (model on `contact.spec.ts`).

**Zod body:** `{ program: string(1..80), note?: string(1..1000), coachName?: string(1..120), coachEmail?: email, turnstileToken?: string, hp?: string }`. **Guard order (identical to contact, fail-fast):**
1. Slug shape check (`HASH_SLUG_RE`/`VANITY_SLUG_RE`) → 404. Resolve trusted `clientIp` + `userAgent` (reuse the exact chain from `contact.post.ts`).
2. `isHoneypotTripped(body.hp)` → `{ ok:true }` silent (no insert, no notify).
3. `throwIfRateLimited(rateLimitByIp(event,{requests:5,window:"10 m",ip:clientIp}))`.
4. `throwIfRateLimited(rateLimitByKey(event,\`interest:${slug}\`,{requests:20,window:"1 h"}))`.
5. Zod `safeParse` → 422 `.issues[0]?.message`.
6. `verifyTurnstile(body.turnstileToken,{ip:clientIp,expectedAction:"interest"})` → `reason:'disabled'` → `logger.warn`; `!ok` → 403.
7. Resolve player by slug (hash then vanity); `!profile || !is_published` → 404.
8. `matchCoachByEmail(admin,{familyUnitId:profile.family_unit_id,email:data.coachEmail})` → `matchedCoachId | null` (only when email present; NEVER creates).
9. Insert `profile_contacts`: `family_unit_id`, `player_user_id: profile.user_id`, **`type:'interest'`**, `coach_name: data.coachName ?? "A coach"` (column is NOT NULL — default a placeholder for anonymous), `coach_email: data.coachEmail ?? null`, `matched_coach_id: matchedCoachId`, **`program: data.program`**, `note: data.note ?? null`, `ip: toValidInetOrNull(clientIp)`, `user_agent`. (No school fields on interest.)
10. Notify player (fire-and-forget-safe, mirror contact): notification `type:'inbound_interaction'`, title **"New interest from a coach"**, message `\`${coachLabel} expressed interest in your ${data.program} profile.\`` (`coachLabel = data.coachName ?? "A coach"`), `related_entity_type:'profile_contact'`, `related_entity_id: inserted.id`; + `sendNotificationEmail` to the player when `users.email` present. A notify failure must NOT fail the response.
11. Return `{ ok:true }`.

> **NOTE — `coach_name` is NOT NULL** (`profile_contacts.coach_name text not null`). Anonymous interest supplies no name → insert a placeholder (`"A coach"`). Confirm the column constraint before implementing; if Chris prefers a nullable name for interest, that's a migration → STOP and ask.

- [ ] **Step 1 (TDD RED):** unit over mocked admin + mocked deps: honeypot → `{ok:true}`, NO insert, NO notify; bad body (missing `program`) → 422; Turnstile `{ok:false}` → 403; per-slug limit exceeded → 429; unknown/unpublished slug → 404; happy anonymous (program only) → insert `type:'interest'` + `program` + placeholder name + `matched_coach_id:null` + notification minted + `{ok:true}`; happy with matching `coachEmail` → `matched_coach_id` set; response never contains player/coach PII. Run → FAIL.
- [ ] **Step 2:** Implement by cloning `contact.post.ts` structure (keep the trusted-IP + inet-coercion + slug-resolver + notify-safe patterns verbatim). Reuse Task-1 `rateLimitByKey`.
- [ ] **Step 3:** GREEN + type-check + lint. `npm run dev` + `curl` the endpoint (honeypot, missing program → 422, happy path → confirm a `type='interest'` row + a notification land). Commit `feat(api): public Express Interest endpoint (hardened, profile_contacts type=interest)`.

---

### Task 3: `ExpressInterestPopover.vue`

**Files:** Create `components/profile/public/ExpressInterestPopover.vue`; Test `tests/unit/components/profile/ExpressInterestPopover.spec.ts`.

**Interface:** props `{ slug: string; playerName: string; programs?: string[] }` (programs = the athlete's public sport/positions from the card; may be empty), emits `close`, `submitted`. Fields: **program** — a `DesignSystem*` select when `programs?.length`, else a free-text input; optional **note**; optional **coach name** + **coach email**; hidden honeypot `hp` (visually hidden, `autocomplete="off"`, `tabindex="-1"`). Turnstile widget mounts ONLY when `runtimeConfig.public.turnstileSiteKey` is set (mirror `ContactPlayerModal.vue`'s script inject + token capture, `action:"interest"`). Submit → `$fetch(\`/api/public/profile/${slug}/interest\`, { method:"POST", body })`. Success → emit `submitted` + show confirmation ("The player has been notified of your interest"). Error → inline message; 429 → friendly "try again shortly". `<script setup>`, DS primitives, brand tokens, no raw hex.

- [ ] **Step 1 (TDD RED):** test — renders program select when `programs` provided, free-text when empty; renders honeypot; fill + submit → `$fetch` called with `{program, hp:""}`; success → confirmation + `submitted` emitted; Turnstile widget absent when no site key (mock runtimeConfig). Run → FAIL.
- [ ] **Step 2:** Implement. Turnstile script guarded + cleaned on unmount; submit still works if the script fails to load (server no-ops verification when flag off). Client-mirror the Zod min/max for UX (server is source of truth).
- [ ] **Step 3:** GREEN + type-check + audit:tokens. Commit `feat(profile): Express Interest popover (program select + honeypot + optional Turnstile)`.

---

### Task 4: Wire hero `@interest` + "Interest Sent" state

**Files:** Modify `components/profile/PublicProfileCard.vue`; Test extend `tests/unit/components/profile/PublicProfileCard.spec.ts` (or the card's existing spec).

**Interface:** In `PublicProfileCard.vue` (owns `ProfileHero` + `ContactPlayerModal`), add popover open/close state and handle `@interest` → open `ExpressInterestPopover`, passing `slug`, `playerName`, and `programs` derived null-safely from the public payload: `[data.athletic?.primary_sport, ...(data.athletic?.positions ?? [])].filter(Boolean)` deduped. On `@submitted`: set an **"Interest Sent" button state**, persisted per-session in `localStorage` keyed by slug (e.g. `interest-sent:<slug>`), and reflect it on the hero button (disabled + "Interest Sent" label). Server is source of truth; localStorage only suppresses re-submit UX within the session. Heed the **teleport-backdrop-isolate-root** lesson (don't teleport the backdrop over the popover). Close popover only on `@close` (Phase-3 lesson: don't close on `@submitted` before the confirmation paints).

> The hero button label/disabled state needs a prop. Either pass an `interestSent` prop into `ProfileHero` (preferred — keep hero presentational) or read localStorage in the card and swap the emitted button. Keep `ProfileHero` dumb; card owns state.

- [ ] **Step 1 (TDD RED):** test — clicking "Express Interest" opens the popover; `@submitted` sets the "Interest Sent" state + writes localStorage; on remount with the localStorage key set, the hero shows "Interest Sent" disabled; `@close` hides the popover. Run → FAIL.
- [ ] **Step 2:** Implement. Guard localStorage access (SSR-safe / try-catch). No raw hex.
- [ ] **Step 3:** GREEN + type-check + audit:tokens. Commit `feat(profile): wire hero Express Interest + Interest Sent state`.

---

### Task 5: `GET /api/player/profile/contacts` — inbox + monthly counts

**Files:** Create `server/api/player/profile/contacts.get.ts`; Test `tests/unit/server/api/player/profile-contacts.spec.ts`.

**Interface:** authed GET. Resolve the requesting user's family athlete (reuse the repo's existing authed player-context resolver — grep how `server/api/player/**` or `server/api/user/preferences/**` resolves the family/athlete; do NOT trust a client family id). Query `profile_contacts` for that `family_unit_id`, newest-first, with a sane cap (e.g. `limit 100`; add optional `?limit`/`?before` cursor if trivial, else fixed cap). Response:
```ts
{
  leads: Array<{ id; type: "contact" | "interest"; coach_name; coach_email; coach_title; school_name; program; note; matched_coach_id; created_at }>;
  counts: { interestThisMonth: number; contactThisMonth: number; totalThisMonth: number };
}
```
`counts` = rows where `created_at >= start-of-current-month` grouped by `type` (compute in-handler from the fetched set only if the cap safely covers a month; otherwise a small separate `count` query per type — prefer the explicit count query to stay correct under high volume). Never expose `ip`/`user_agent`/`family_unit_id` in the response. Read-only (no mutation).

- [ ] **Step 1 (TDD RED):** unit over mocked admin/context: returns family-scoped leads newest-first; `counts` splits interest vs contact for the current month; unauth/no-athlete → 401/appropriate; `ip`/`ua` never in payload. Run → FAIL.
- [ ] **Step 2:** Implement. Family scope via the existing authed resolver + service-role read (or user-client read that rides the family-read RLS — match how sibling authed player endpoints read family data). Month boundary in UTC (note the web TZ `getFullYear` lesson — use explicit UTC month start).
- [ ] **Step 3:** GREEN + type-check + lint. `npm run dev` + `curl` with an authed session (or document the manual check). Commit `feat(api): player inbound-leads inbox endpoint + monthly counts`.

---

### Task 6: `useProfileContacts` + `ProfileInbox.vue` tab

**Files:** Create `composables/useProfileContacts.ts`; Create `components/profile/ProfileInbox.vue`; Modify `pages/settings/player-details.vue` (add the `inbox` tab entry + `v-show` panel); Tests `tests/unit/composables/useProfileContacts.spec.ts` + `tests/unit/components/profile/ProfileInbox.spec.ts`.

**Interfaces:**
- `useProfileContacts()` → `{ leads, counts, loading, error, fetchContacts }` (standard composable shape; `$fetch('/api/player/profile/contacts')`; try/catch → user-friendly error; `onMounted` auto-fetch).
- `ProfileInbox.vue` — renders: monthly **stat tiles** ("N interest this month" / "N contact this month") using the existing DS stat/tile primitive (grep `docs/design/components.md` + admin `AdminStatTile` for the right web primitive — use the public-app equivalent, NOT the Admin-namespaced one); then a **leads list** (each: contact-vs-interest badge, coach_name, program, school_name, note excerpt, relative date). DS empty state ("No leads yet"), loading skeleton, error state. No raw hex.
- `player-details.vue` — add `{ id: "inbox", name: "Inbox", icon: <UIcon name> }` to `tabs`, and a `<div v-show="currentTab === 'inbox'"><ProfileInbox /></div>` panel mirroring the existing tab panels.

- [ ] **Step 1 (TDD RED):** composable test (mock `$fetch` → leads/counts populate; error path sets `error`); component test (renders tiles from counts, a row per lead with the correct badge, empty state when no leads). Run → FAIL.
- [ ] **Step 2:** Implement. Reuse DS list/badge/tile primitives; badge color: interest vs contact via brand tokens.
- [ ] **Step 3:** GREEN + type-check + lint + audit:tokens. Commit `feat(profile): inbound-leads inbox tab + monthly stat tiles`.

---

### Task 7: E2E — express interest → Interest Sent + lead visible in inbox

**Files:** Create `tests/e2e/profile-interest.spec.ts`.

- [ ] **Step 1:** E2E — anonymous context opens `/p/<slug>` (self-published), clicks Express Interest, selects/enters a program, submits (honeypot empty), asserts the "Interest Sent" state. Turnstile off in test env (no site key) so no widget blocks. Then an authed second context (the player) opens the Public Profile → Inbox tab and asserts the new interest lead + the month count. Follow repo Playwright conventions (storageState, separate anon context, `data-test` selectors, RUN_ID-unique data).
- [ ] **Step 2:** `--list` parses + typecheck/lint clean; run locally if possible, else CI-defer (document the EMFILE block). Do NOT weaken assertions.
- [ ] **Step 3:** Commit `test(e2e): express interest → Interest Sent + inbox lead`.

---

### Task 8: Full gate + phase wrap

- [ ] `npm run type-check && npm run lint && npm run test && npm run audit:tokens` — all pass.
- [ ] `npm run dev` — open a public profile logged-out, submit Express Interest (anonymous AND with a coach email), confirm: `{ ok:true }` with NO PII in the network payload; the player gets an in-app notification; the lead appears in the Inbox tab with the right badge + month count; honeypot + rapid-fire rate-limit behave; "Interest Sent" persists across reload.
- [ ] Confirm the carried **launch gate** is still noted (Turnstile keys + Upstash env before ANY public prod promote of Contact/Interest — Chris's env work, separate). Update `CLAUDE.local.md` + write a Phase-4 handoff.

---

## Self-Review

**Spec coverage (Phase 4 slice):** public interest endpoint hardened (T2) with honeypot+per-IP+**per-slug**+Zod+Turnstile+service-role+no-PII (T1+T2, Global Constraints); one-tap popover with program select + optional coach email (T3); "Interest Sent" state persisted per-session (T4); athlete inbound inbox reading both lead types (T5+T6); thin monthly analytics (T5 counts + T6 tiles); E2E (T7); gates (T8). ✓

**Chris decisions honored:** optional coach email (match-only, never creates); program = select-over-own-sports + free-text fallback (athletic-null-safe); inbox = new tab in player-details; analytics = monthly counts only; per-slug limiter built + Contact retrofitted. ✓

**No migration:** `profile_contacts` already carries `type` + `program` + coach fields + family-read RLS (live `20260909000000`). Verified. ✓

**Deferred / carried:** provisioning real Turnstile keys + Upstash env (launch gate, Chris's env). Phase-3 fast-follows (notification-preference gating for inbound leads, dup-email `maybeSingle`, IPv6 regex). Phase-2 fast-follows (brand social icons, banner host allowlist, committed_school_id ownership). Richer analytics (funnel/breakdown) = future.

**Open items to confirm at build:**
- `profile_contacts.coach_name` is NOT NULL → anonymous interest inserts a `"A coach"` placeholder. If Chris wants a nullable interest name, that's a migration → STOP and ask.
- The authed family-athlete resolver for the inbox endpoint (T5) — grep the exact pattern sibling `server/api/player/**` endpoints use; do not invent.
- The public-app stat-tile primitive (T6) — use the non-Admin DS equivalent; confirm the component name in `docs/design/components.md` before building.
