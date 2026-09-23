# iOS Spec — Web/iOS Parity Pass (A–I)

> **Prepared:** 2026-09-17
> **Web branch:** develop (no web code changes — planning/docs only)
> **Purpose:** Single PR-sized parity pass consolidating open web/iOS drift items A–I into one spec, plus a cross-cutting OpenAPI/shared-contract deliverable and refactor-opportunity items 2/4/5. Supersedes the onboarding-scoped drafts listed under "Superseded Docs" below.
> **Status:** COMPLETE — items A–I, the OpenAPI deliverable, and refactor items 2/4/5 are all specified below. No application code changes were made producing this doc; it remains uncommitted, planning/docs only.

---

## Item A — Collapse iOS post-signup onboarding to 1 step (match web)

### Background

Web's player signup form (`components/Auth/SignupForm.vue`, shipped in PR #761 / `planning/iOS_SPEC_preconfirm-onboarding-step1-2026-09-11.md`) now captures grad year, primary sport, gender, and zip **at signup time**, before email confirmation. On first authenticated session, `useAccountProvisioning.ts`'s `applyPendingOnboardingStep1()` flushes those into real preferences and calls `saveOnboardingStep(1, {...})` — which marks web's post-signup `/onboarding` wizard's Step 1 as already-done. `pages/onboarding/index.vue` is still a 2-step component (`totalSteps = 2`, see lines 271/290), but a player who signed up with these fields pre-filled resumes onboarding **at Step 2** ("Schools to explore") — Step 1 is never shown to them again.

iOS (`planning/iOS_SPEC_onboarding-v2-2026-08-31.md`) has no counterpart to this yet: it currently specs a full 2-step wizard (Step 1 "Tell us about you" + Step 2 "Schools to explore") to be shown to every player post-signup, and per `planning/iOS_SPEC_preconfirm-onboarding-step1-2026-09-11.md`'s "Notes for iOS Claude," iOS's account-provisioning flow (the equivalent of web's `ensureAccountProvisioned()` on every `SIGNED_IN` event) doesn't exist yet at all.

**Decision (this session):** collapse iOS's post-signup onboarding to 1 step to match web's actual behavior — not "build a 2-step wizard," but "capture sport/grad-year/zip at signup (already spec'd in `iOS_SPEC_preconfirm-onboarding-step1-2026-09-11.md`), then show only the schools-carousel step post-signup."

### Acceptance Criteria

- [ ] iOS's `SignupView` captures grad year + primary sport (required) + gender (auto-derived/optional) + zip (optional) at signup, per `iOS_SPEC_preconfirm-onboarding-step1-2026-09-11.md` — this spec's iOS-side flush hook (the "provisioning on every authenticated session" gap it flags) must land as a prerequisite/companion to this item, not be silently skipped.
- [ ] iOS's post-signup onboarding screen shows **only** the schools-recommendation carousel (web's Step 2) — no separate "Tell us about you" screen is shown after signup for a player who already supplied that data at signup.
- [ ] A player who reaches the post-signup flow without pending step-1 data on file (e.g. an existing account whose flush never ran, or a data edge case) still gets asked for sport/grad-year before the schools carousel — the 1-step collapse is conditional on the data already being present, exactly like web's step-resume logic (`Math.floor((progress/100)*totalSteps)+1` in `pages/onboarding/index.vue`), not an unconditional skip.
- [ ] `NuxProgressManager`/`nux_progress.checklist.items.sport` gets marked complete by the signup-time flush, not by a second in-app step, mirroring web's `saveOnboardingStep(1, ...)` call inside `applyPendingOnboardingStep1()`.

### Verification (this session)

Confirmed via code read: `pages/onboarding/index.vue:271,290` (`totalSteps = 2`, `currentStep` resumes based on saved progress); `composables/useAccountProvisioning.ts`'s `applyPendingOnboardingStep1()` flush + `saveOnboardingStep(1, ...)` call (per the existing `iOS_SPEC_preconfirm-onboarding-step1-2026-09-11.md`, already read this session). Not independently re-verified live on QA — the logic is unambiguous from the code and the existing iOS spec's own gap analysis.

---

## Item B — Drop the Turnstile gate on iOS invite-accept signup (match web) — CLOSED, no action

**Resolution (2026-09-17):** Confirmed via Supabase dashboard (Authentication → Attack Protection) that **"Enable Captcha protection" is ON**, provider Turnstile by Cloudflare, on the production project. This is decisive: iOS's `authManager.signup()` calls `supabaseManager.signUp()` → supabase-swift's native `client.auth.signUp(captchaToken:)`, which Supabase enforces server-side at the project level, independent of any application code. Dropping the client-side Turnstile mint (this item's original acceptance criteria) would make every iOS invite-accept signup fail outright.

Web can skip its own captcha check here because web's signup **does not go through Supabase's native client-side `signUp()` at all** — it routes through the app's own `server/api/auth/signup.post.ts`, which creates the account via service-role (not subject to the client captcha requirement Supabase enforces on the public client SDK) and applies its own separate `verifyTurnstile`/`hasValidPendingInvite` check with the invite-token-skip logic described below. iOS's native-SDK signup architecture has no equivalent bypass.

**Real parity would require iOS to route invite-accept signup through that same Nitro endpoint instead of Supabase's native SDK** — a meaningfully larger networking/architecture change than this item's original "drop a client-side call" framing, not a quick fix.

**Decision: leave iOS as-is.** Keep the Turnstile WebView round-trip on `InviteJoinViewModel.signupAndConnect()` — up to ~20s worst-case latency and a real (if rare) `AuthError.captchaFailed` failure surface, but safe, and no architecture change needed. Not revisited unless the cost of that friction becomes a real product problem — if so, the fix is "route through signup.post.ts," not "drop the token."

The acceptance criteria and background below are preserved as the original (now-superseded) research; do not implement them as written.

### Background

**Web changed this 1 day before this session** (PR #877, commit `f4a5886c`, "fix: skip Turnstile captcha on family-invite accept/signup flow"). Before #877, `pages/join.vue`'s signup-and-connect branch rendered an interactive Turnstile checkbox widget and required a token. After #877:

- The **signup branch** of invite-accept (`join.vue`'s `signupAndConnect()`) no longer renders or requires an interactive Turnstile widget at all. Reasoning (from the commit message): a real, unexpired, pending invite token already proves the request isn't a bot — the invite link itself is the filter.
- `server/api/auth/signup.post.ts` now accepts an optional `inviteToken` field in the signup body. Server-side, `hasValidPendingInvite(inviteToken, email, role)` (lines 38–52) looks up the `family_invitations` row by token and only skips `verifyTurnstile` when it's `pending`, unexpired, and the submitted `email`/`role` match the invitation's own `invited_email`/`role` — never on a client-asserted flag.
- `composables/useAuth.ts`'s `signup()` gained a `captchaSkipInviteToken` parameter (distinct from the pre-existing `inviteToken` param, which seeds `pending_invite_token` metadata for a different purpose) that threads through to the request body's `inviteToken` field.
- The **login branch** of invite-accept (an existing user accepting an invite) is **unchanged** — it still mints and passes a Turnstile token via `getFreshTurnstileToken()`/`turnstileToken.value`. This is intentional: `signInWithPassword`'s captcha is a Supabase Auth project-level setting that can't be bypassed per-request from application code, unlike the app's own `verifyTurnstile` check on the signup endpoint.

iOS's `InviteJoinViewModel.swift` (`Features/Family/ViewModels/`) has not caught up:

- `accept()` (line 94) correctly mints a Turnstile token before `authManager.login(...)` — this branch is correct and should **stay as-is** (matches web's unchanged login branch).
- `signupAndConnect()` (line 152) also mints a Turnstile token (`turnstileTokenProvider.getToken()`) before `authManager.signup(...)` and passes it as `captchaToken` — this is the gate that needs to be dropped, mirroring web's #877 change.

### Acceptance Criteria

- [ ] `InviteJoinViewModel.signupAndConnect()` no longer calls `turnstileTokenProvider.getToken()` for the primary signup captcha. Instead, it passes the invite `token` (already held by the view model as `private let token: String`) through to `authManager.signup(...)` as the new skip-eligibility parameter, mirroring `captchaSkipInviteToken` on web.
- [ ] `AuthManager.signup(...)` / `SupabaseManager.signUp(...)` gain a parameter (e.g. `captchaSkipInviteToken: String?`) that gets sent to the server as `inviteToken` in the signup request body — matching `server/api/auth/signup.post.ts`'s `SignupBody.inviteToken` field exactly (same key name).
- [ ] The invisible session-mint Turnstile call inside `signupAndConnect()` — the one needed to satisfy Supabase's own post-signup `signInWithPassword` project-level captcha — is **not** removed. Web kept its equivalent (`getFreshTurnstileToken()` / the invisible `turnstileSessionEl` widget) for exactly this reason; iOS's `signupAndConnect()` already does something similar after `authManager.signup(...)` succeeds implicitly via `authManager.signup`'s internal sign-in — confirm iOS's `AuthManager.signup` internally re-authenticates the same way web's `submitMinorSignup`/`signupAndConnect` do, and if so, that this still gets a fresh captcha token for that step.
- [ ] `InviteJoinViewModel.accept()` (the login branch) is **not** changed — it keeps minting a real Turnstile token via `turnstileTokenProvider.getToken()` before `authManager.login(...)`.
- [ ] Server-side enforcement is unchanged by this item — `hasValidPendingInvite` already exists and is exercised correctly by any client (web or iOS) that supplies a valid `inviteToken`; no new server work is needed here, only the iOS client-side plumbing.
- [ ] Test: signup-and-connect via a valid, unexpired invite token succeeds with no Turnstile challenge ever presented to the user (no WebView flash, no delay from `getToken()`'s network round-trip on that call). Test: signup-and-connect with an **invalid/expired/mismatched** invite token still works (falls back to requiring Turnstile server-side, per `hasValidPendingInvite`'s checks) rather than crashing or hard-failing — confirm iOS's error handling surfaces the server's captcha-required rejection sensibly if this edge case is hit.

### Platform-Limitation Callout — Turnstile is WebView-based on iOS

See the "Platform-Limitation Callout — Turnstile has no native iOS SDK" section below for the general writeup. Specific to this item: iOS's `turnstileTokenProvider.getToken()` (`TurnstileTokenProvider.swift`) round-trips through a shared, always-alive `WKWebView` running Cloudflare's JS widget invisibly (`size: 'invisible'`), with a 10s ready-timeout and a separate 10s challenge-timeout. Dropping this call for the signup-and-connect path removes real, measurable latency (up to ~20s in the worst case) and a real failure surface (`AuthError.captchaFailed` from WebView content-process jetsam, navigation failures, etc.) from the invite-accept-and-signup flow — this is not just a parity nicety, it removes a plausible source of iOS-only invite-flow failures that web already eliminated for itself in #877.

### Verification (this session)

Confirmed via `git show f4a5886c` (full diff read) against `pages/join.vue`, `composables/useAuth.ts`, and `server/api/auth/signup.post.ts`. Confirmed iOS's current (unmodified) behavior via direct read of `InviteJoinViewModel.swift` (`accept()` line 94, `signupAndConnect()` line 152) and `TurnstileTokenProvider.swift` (full file).

---

## Item C — iOS does not consume `onboardingComplete`/`prefill` from the invite-accept response (informational — no fix needed)

### Finding

Traced live via code read, as requested, before finalizing this spec.

- **iOS side:** `FamilyServiceImpl+Invites.swift`'s `acceptInvite(token:)` (line 150) makes the `POST /api/family/invite/[token]/accept` call and does `let (_, response) = try await URLSession.shared.data(for: request)` — **the response body is discarded entirely**, never decoded. Neither `InviteJoinViewModel.accept()` nor `signupAndConnect()` reads anything from the accept call's response.
- The `prefill` data iOS *does* use (`InviteJoinViewModel.loadInvite()` line 75, `savePrefillPreferences(from:)` line 186) comes from the earlier `GET /api/family/invite/[token]` lookup (`InviteDetails.prefill`, captured when the invite screen first loads) — a separate request that happens **before** accept, not from the accept response.
- **Web side:** `server/api/family/invite/[token]/accept.post.ts`'s response shape is `{ success: true, familyUnitId, ...(prefill ? { prefill } : {}) }` (line 197–201). There is **no `onboardingComplete` field anywhere in this response** — it does not exist on web either.

### Conclusion

Nothing to fix. iOS's behavior is not a parity gap relative to what web's accept endpoint actually returns — there is no `onboardingComplete` field to consume, and the `prefill` field the accept response *does* carry is redundant with the `prefill` iOS already captured from the GET lookup one screen earlier (both come from the same `family_units.pending_player_details` source, read at two different times in the flow — see `accept.post.ts` line 157–190 vs the invite-lookup endpoint). No acceptance criteria — this section exists to close out the open question and prevent someone re-opening it as a suspected bug later.

### Verification (this session)

Full read of `InviteJoinViewModel.swift`, `FamilyServiceImpl+Invites.swift`, `server/api/family/invite/[token]/accept.post.ts` and `server/api/family/invite/[token].get.ts`. No live QA check needed — this is a pure code-contract question, not a data/state question.

---

## Item D — AASA gap: `/guardian/claim/*` missing from `apple-app-site-association`

### Finding

`public/.well-known/apple-app-site-association` lists `/invite/*` and `/join` under its applinks paths but **not `/guardian/claim/*`**. iOS's `DeepLinkHandler` already parses a `guardianClaim(token:)` case — the client-side handling is already built — but it can never fire as a universal link today, because iOS/Safari only hands a URL to the app if its path matches an entry in this web-hosted AASA file. A guardian-claim link opens in Safari instead of the app.

This is a **web-repo fix that unblocks already-built, currently-unreachable iOS code** — not new iOS work.

### Acceptance Criteria

- [ ] Add `/guardian/claim/*` to the `applinks.details[].components[].path` (or equivalent, depending on the file's current schema version) array in `public/.well-known/apple-app-site-association`.
- [ ] Verify the served AASA file (`https://<domain>/.well-known/apple-app-site-association`, no extension, served as `application/json`) is not blocked by CDN/caching from picking up the change — Apple caches AASA aggressively on-device, so note in the PR that testers may need to reinstall or wait for Apple's own re-fetch interval to see the new path take effect.
- [ ] Confirm iOS's `DeepLinkHandler`'s existing `guardianClaim(token:)` case actually receives and routes a real `https://<domain>/guardian/claim/<token>` universal link end-to-end once the AASA change ships (this is the "unblocks already-built code" verification, not new code to write).

### Verification (this session)

Carried forward from the original research pass's finding (AASA file content vs. `DeepLinkHandler.swift`'s parsed cases) — not independently re-verified in this drafting session; confirm current AASA file contents and `DeepLinkHandler` case list before implementing.

---

## Platform-Limitation Callout — Turnstile has no native iOS SDK

### Background

Cloudflare Turnstile ships a JS widget for web; there is no native iOS SDK. iOS's entire captcha story (`TurnstileTokenProvider.swift`) is a single shared, app-lifetime `WKWebView` that loads a local HTML shim (`Self.html` inline string), renders Turnstile's `invisible` widget inside it, and bridges `ready`/`token`/`error`/`expired` events back to Swift via `WKScriptMessageHandler`. Every iOS auth flow that needs a captcha token — login, signup, password reset, and (until Item B ships) invite-accept-and-signup — goes through this same WebView bridge, not a native control.

This is a **structural platform limitation**, not a bug: it cannot be "fixed" to match web's native DOM widget, only worked around (as `TurnstileTokenProvider` already does, reasonably robustly — see its jetsam/navigation-failure recovery paths). It is called out here explicitly, as requested, so that:

1. Any future spec item that says "add Turnstile to iOS flow X" is understood to mean "call `TurnstileTokenProvider.shared.getToken()` and thread the token through," not "build a new native equivalent."
2. Any future spec item that says "drop Turnstile from iOS flow X" (like Item B) is understood to have a real latency/reliability payoff on iOS specifically — the WebView round-trip is slower and has more failure modes than not calling it at all — beyond pure code-parity value.
3. iOS-only Turnstile bugs should not be assumed to have iOS analogues of web-side Turnstile bugs (or vice versa) without checking — iOS's shared-singleton-WebView architecture is different enough from web's per-view mounted-widget architecture that the same bug classes don't necessarily translate directly. Conversely, iOS has its own failure modes (WebView content-process jetsam, backgrounded-app WebView suspension) that web has no analogue for.

### Acceptance Criteria

No code changes required by this callout itself — it is a documentation/context note, not a numbered work item. If a future iOS Turnstile bug is filed, check this section first before assuming it's a straight port of a known web-side Turnstile bug.

### Verification (this session)

Full read of `TurnstileTokenProvider.swift` (227 lines, in full).

---

## Item E — Self-serve minor signup never sets `phase_milestone_data.onboarding_complete` — CONFIRMED LIVE on QA

### Finding

**This is a real, live-confirmed bug on the QA database (project `xpxzhqghxecsjhvklsqg`), not a theoretical one.**

Queried QA directly for real accounts that went through the 2026-09-12 guardian-optional-signup-wizard (`docs/superpowers/specs/2026-09-12-guardian-optional-signup-wizard-design.md`) with guardian confirmation:

```
select id, email, role, date_of_birth, guardian_consent_at,
       phase_milestone_data->>'onboarding_complete' as onboarding_complete, created_at
from users
where role = 'player' and date_of_birth is not null
  and date_of_birth > (current_date - interval '18 years')
  and date_of_birth <= (current_date - interval '13 years')
order by created_at desc limit 20;
```

Two real accounts, both created within the last few days and both with `guardian_consent_at` stamped (proving they completed the guardian-claim flow, migration `20260928000005` / `accept_guardian_claim()`):

| email | created_at | guardian_consent_at | `phase_milestone_data.onboarding_complete` |
|---|---|---|---|
| `test.player2029@andrikanich.com` | 2026-09-16 19:58 | 2026-09-16 20:11 | `null` (field absent — `phase_milestone_data` is `{}`) |
| `qa-join-retest-2210@example.com` | 2026-09-14 20:43 | 2026-09-14 20:43 | `null` (field absent — `phase_milestone_data` is `{}`) |

### Root cause (traced via code)

`pages/signup.vue`'s `submitMinorSignup()` (line 406) — the client entry point for the 13-17 guardian-optional wizard — does:

```
POST /api/auth/signup-minor  →  signInWithPassword  →  POST /api/family/create  →  userStore.initializeUser()  →  navigateTo("/dashboard")
```

**None of `server/api/auth/signup-minor.post.ts`, `server/api/family/create.post.ts`, or `composables/useAccountProvisioning.ts` write `phase_milestone_data.onboarding_complete`** — confirmed by grep across all three (no matches for `phase_milestone_data` or `onboarding_complete`/`onboarding_completed` in any of them).

`middleware/onboarding.global.ts`'s `shouldRedirectToOnboarding()` (line 44) gates purely on `phase_milestone_data.onboarding_complete === true`:

```ts
export function shouldRedirectToOnboarding(input: {
  is_admin?: boolean | null;
  onboarding_complete?: boolean | null;
}): boolean {
  if (input.is_admin === true) return false;
  return input.onboarding_complete !== true;
}
```

`/dashboard` is not on the middleware's exempt-path allowlist (only `/onboarding*`, `/verify-email/*`, and public routes are exempt). So a self-serve minor who just landed on `/dashboard` via `submitMinorSignup()`'s explicit `navigateTo("/dashboard")` gets **immediately redirect-looped back to `/onboarding`** on their very next client-side navigation (or the next time the global middleware runs) — despite having already supplied sport, grad year, and zip on the signup wizard's own Step 3 (`docs/superpowers/specs/2026-09-12-guardian-optional-signup-wizard-design.md`'s "Step 3 — Player info"). The player then has to answer the same questions again inside `/onboarding`.

This affects **both** sub-paths of the guardian-optional wizard — a minor whose guardian email was provided (claim created, confirmed later — the two accounts above) and, by the same code path, a minor who skipped naming a guardian entirely (no claim row at all, upsert goes straight through per the design doc's "Omitted" branch) — since neither branch of `signup-minor.post.ts` touches `phase_milestone_data`.

This is a **web bug**, independent of any iOS work — flagged here because it directly affects what iOS's future guardian-optional-signup-wizard port (if/when spec'd) would need to replicate or deliberately diverge from, and because Chris asked for it to be resolved with live verification before any related iOS spec work proceeds.

### Acceptance Criteria (web fix — tracked here, not an iOS deliverable)

- [ ] `submitMinorSignup()`'s flow (or one of the endpoints it calls) sets `phase_milestone_data.onboarding_complete = true` (and ideally `onboarding_completed_at`, matching `useOnboarding.ts`'s `completeOnboarding()` shape at line 165-166) once the signup wizard's Step 3 player-info has been captured — since that step already asks everything `/onboarding`'s Step 1 asks, and the wizard has no Step 2/schools-carousel equivalent of its own yet.
- [ ] Alternative/complementary fix: `middleware/onboarding.global.ts` treats a fresh guardian-optional-wizard completion as equivalent to onboarding-complete without requiring a second write path — implementer's call on which layer owns the fix, but the redirect-loop must not reach real users.
- [ ] Regression test: a minor signup via `/api/auth/signup-minor` (guardian provided or skipped) followed by a simulated dashboard navigation does not redirect to `/onboarding`.
- [ ] Once fixed, re-run the QA verification query above against `xpxzhqghxecsjhvklsqg` (or a fresh test account) to confirm `phase_milestone_data.onboarding_complete` is now `true` for new signups — the two existing affected QA rows can be manually patched or left as known-stale QA data (Chris's call, not a prod-data concern since this DB is QA/dev-only per prod-infra-identity memory: prod is a separate split-off project as of 2026-09-06).

### Verification (this session)

**Live**, via direct `execute_sql` query against Supabase project `xpxzhqghxecsjhvklsqg` (recruiting-compass-qa) — not a code-only inference. Confirmed the `accept_guardian_claim()` function and `guardian_claims` table exist live (migration `20260928000005` is applied). Cross-checked root cause via full reads of `pages/signup.vue` (submitMinorSignup, lines 399-457), `middleware/onboarding.global.ts` (full file), and grep confirmation that `signup-minor.post.ts`/`family/create.post.ts`/`useAccountProvisioning.ts` never touch `phase_milestone_data`.

---

## OpenAPI / Shared-Contract Generation from Zod Schemas (cross-cutting deliverable) — DONE

### Background

The web app already validates ~22 `server/api/**` endpoints with Zod schemas (`grep -rl "from \"zod\"" server/api` → 22 files as of this session, e.g. `server/api/family/invite.post.ts`, `server/api/auth/change-password.post.ts`, `server/api/inbound-drafts/[id]/confirm.post.ts`). No OpenAPI/schema-generation tooling exists yet (`package.json` has no `@asteasolutions/zod-to-openapi` or equivalent). iOS specs today are written by hand-reading each Nitro endpoint's request/response shape and manually porting it to Swift `Codable` structs (see every `iOS_SPEC_*.md` "API Endpoints to Call" / "Data Models (Swift)" sections) — this is a source of iOS/web contract drift in this repo (this spec's own Item C exists partly because the accept-response shape had to be independently re-traced rather than read off a generated contract).

### Implementation (deviated from the original deliverable — deliberately, see below)

**No new dependency was added.** The repo is on `zod@4.4.3`, and zod 4 ships a **native** `z.toJSONSchema()` — no `@asteasolutions/zod-to-openapi`/`zod-openapi` needed at all. OpenAPI 3.0's request-body schema object is JSON-Schema-compatible, so `z.toJSONSchema(schema, { target: "openapi-3.0" })`'s output drops in directly. Verified this works correctly (email format/pattern, enums, optional fields, nested objects all render correctly) before committing to the approach.

**Schema discovery required one prerequisite, done first:** all 22 endpoints defined their request schema as an *unexported* module-scope const (e.g. `const inviteBodySchema = z.object({...})`) — a generator script run as a separate Node process can't reach an unexported symbol. Exported the schema const in all 22 files (2 already were; 20 needed the `export` keyword added — a one-line diff each, no behavior change, confirmed by the endpoints' own existing unit tests staying green).

**`scripts/generate-openapi.ts`** (wired to `npm run generate:openapi`):
- Walks `server/api/**`, pre-filtered to files whose source contains `from "zod"` (avoids ever importing the much larger set of endpoints that rely on Nuxt's auto-imported `defineEventHandler`/etc. with no explicit import — dynamically importing one of those in plain Node throws `ReferenceError` at module-evaluation time, since Nuxt's auto-import globals don't exist outside its own build context).
- Stubs h3's real exports (`defineEventHandler`, `readBody`, `createError`, ...) onto `globalThis` before importing anything — endpoint files call `defineEventHandler(...)` at module top level, but it only builds a handler object, never invokes it, so the real h3 functions satisfy that call harmlessly with zero request-execution risk.
- Dynamically imports each matching file, finds its exported `ZodType`, converts via `z.toJSONSchema`, and infers the route's HTTP method + path from the filename using Nitro's own file-based-routing convention (`[id]` → `{id}`, `index` segment dropped).
- Writes `docs/api/openapi.json` (committed to the repo, not CI-only).

**Response schemas:** out of scope for v1 as planned — none of these endpoints formally declare one with Zod today.

**Not done, as planned:** no Swift client codegen from the spec — flagged as a future, separate decision.

### Acceptance Criteria

- [x] `npm run generate:openapi` produces a valid OpenAPI 3.x document covering all Zod-validated `server/api/**` endpoints' request bodies — **31, not 22** (see PR review round below for why the count moved).
- [x] Document is committed to the repo at `docs/api/openapi.json` — durable and discoverable, not transient.
- [x] `planning/iOS_SPEC_school-recommendations-2026-08-28.md` (an existing, already-in-flight spec covering `POST /api/schools/recommendations/dismiss`) updated to reference `docs/api/openapi.json` for that endpoint's request-body contract instead of hand-transcribing field names — the proof-of-concept this deliverable's acceptance criteria asked for.

### PR review round (5 real issues found, all fixed)

An automated review on PR #894 caught 5 genuine correctness problems in the first pass — not nitpicks, verified each before fixing:

1. **9 endpoints missing entirely.** The original discovery only looked for files containing the literal text `from "zod"`, which misses any endpoint validating via a *shared* schema imported from `~/utils/validation/schemas` (auth password-reset ×2, deadlines ×2, feedback ×2, player-details, video-links ×2). Fixed by resolving the schema through the actual `<symbol>.safeParse(`/`.parse(`/`validateBody(event, <symbol>)` call site — walks back to wherever `<symbol>` is really declared (local or imported), rather than guessing from source text. **Endpoint count: 22 → 31.**
2. **`z.toJSONSchema`'s default (output) mode marks defaulted fields as required** — wrong for a request body, where the caller may omit a defaulted field and get the default; verified empirically (a `.default()` field showed as `required` in output mode, correctly optional with `io: "input"`). Fixed by passing `io: "input"`.
3. **Dynamic routes (`{id}`, `{slug}`) had no matching OpenAPI `parameters` entry** — invalid per the OpenAPI path-templating spec. Fixed: `routeFromFilePath` now also returns the dynamic segment names, and each operation gets a `parameters` array (`in: "path", required: true`) when it has any.
4. **Every operation asserted a `400` validation-error response**, but several handlers (draft confirmation, notification email, contact resolution) actually return `422`. Response shapes are out of scope for v1 regardless, so replaced the guessed status with a single neutral `default` response rather than asserting anything about status codes this generator doesn't actually know.
5. **`npm run generate:openapi` didn't prepare Nuxt first** — on a genuinely fresh checkout with no `.nuxt/tsconfig.json`, the `~/` alias resolution needed to import endpoint files would fail before collecting anything. Added `pregenerate:openapi: nuxi prepare` (same pattern already used by `prelint`); verified by deleting `.nuxt/` and running `npm run generate:openapi` (not `npx tsx` directly) end-to-end.

**Two more findings from the same review were real bugs, but not in this generator** — the generator faithfully reflects what the *current* server schemas accept, and surfaced that iOS already sends two fields the server silently drops: `pending_player_details` on `POST /api/family/invite`, and `phone` on `PATCH /api/user/profile`. Confirmed both server-side (schemas don't declare either field) and iOS-side (`ParentOnboardingWizardViewModel`/`FamilyServiceImpl+ParentFamilies` sends `pendingPlayerDetails`; `ProfileService.updatePersonalInfo` sends `phone`) — real data-loss bugs, not false positives. Deliberately **not fixed in this PR** (out of scope for a docs/tooling change) — filed as separate follow-up work, exactly the kind of drift this deliverable exists to surface.

### Verification (this session)

`npm run type-check` clean, `npx eslint .` clean, `npx vitest run tests/unit/server/api/` — 782/784 pass (2 failures are a pre-existing, unrelated worktree module-resolution quirk affecting a file this work never touched — confirmed by the failure being identical to ones seen earlier in this same session on files with no connection to this change). Spot-checked the generated JSON for `/api/family/invite` — correct types, enum values, string formats/patterns, and required-field list.

---

## Item F — Guardian-optional pivot: NOT matched — iOS client blocks minor signup without a guardian email (real gap)

### Finding

**Correction to an earlier pass of this doc**, which concluded this item was "already matched" based on `GuardianServiceImpl`/DB-level support and the existing superseded-annotation on `planning/2026-08-16-minor-consent-family-invite-plan.md`. That check was too shallow — it confirmed the server/DB model (migration `20260927000000_guardian_link_optional.sql`) but never read the iOS client's actual form-validation and view-model code. A direct code read this session found the opposite of the original conclusion:

- `Features/Auth/ViewModels/SignupViewModel.swift:112-115` — `isFormValid`'s `guardianEmailValid` is computed as `isMinorSignup ? (formValidator.validateEmail(guardianEmail) == nil && guardianEmail != email) : true`, folded unconditionally into the overall `isFormValid` boolean (line 127). There is no skip/opt-out branch anywhere in the file (full file confirmed, lines 1-150+ read directly) — a 13-17 player **cannot submit the signup form on iOS at all** without a valid, distinct guardian email.
- `guardianEmail` itself is a non-optional `String` property (line 29), not an `Optional<String>`.
- `Features/Auth/Views/SignupView.swift:144,399-400` renders the guardian email field unconditionally whenever `viewModel.isMinorSignup` is true — no toggle, checkbox, or "skip for now" affordance exists in the view either.

This directly contradicts web's guardian-optional model, where a 13-17 signup can proceed with the guardian field left empty (web PR #784/#790, `server/api/auth/signup-minor.post.ts`'s "omitted" branch). iOS is not a parity gap in data/DB terms — it's a real, unbuilt client-side gap: the UI itself refuses to let a player leave the field blank.

**Distinct failure mode worth flagging:** this was missed by trusting a planning-doc annotation and a server/migration check as a proxy for "the client caught up too" — those are not the same claim. Future parity passes should verify client code directly for any item concluding "already matched," not just the server/DB side.

### Acceptance Criteria

- [ ] `SignupViewModel.guardianEmail` becomes optional at the type level (or an explicit "guardian email provided" boolean gate is added) so an empty value is a valid, distinct state from an invalid one.
- [ ] `isFormValid`'s `guardianEmailValid` allows an empty `guardianEmail` to pass when `isMinorSignup` is true (a value must still be well-formed and distinct from the player's own email if one *is* entered — the existing validation only applies when non-empty).
- [ ] `SignupView` gets a skip affordance for the guardian email field (e.g. explicit "I'll add a guardian later" copy/toggle, or simply making the field's placeholder/label reflect that it's optional) — implementer's call on exact UX, but it must be discoverable, not just silently-allowed-to-submit-empty.
- [ ] `GuardianService.signupMinor(...)`'s `guardianEmail` parameter becomes optional (`String?`), and the call site (`SignupViewModel.swift:383`) passes `nil`/omits the field when empty, mirroring whatever "omitted" branch `server/api/auth/signup-minor.post.ts` supports server-side (confirm exact request-body shape server expects for the omitted case before wiring the client).
- [ ] Regression test: a 13-17 signup with `guardianEmail` left blank succeeds and reaches the same post-signup state as web's "guardian omitted" path (e.g. no guardian_claims row created, no blocking wait-for-guardian gate applied).
- [ ] Regression test: a 13-17 signup with a **provided** guardian email still behaves exactly as it does today (no change to the non-empty path).

### Verification (this session)

Direct code read: `SignupViewModel.swift` lines 1-150 (in full, via `Read`), `SignupView.swift` lines 144 and 399-400 (via `grep`). No skip/optional path found anywhere in either file. This supersedes the earlier pass's DB/migration-only verification for this item.

---

## Item G — Web code-hygiene drift: inline age-gate duplication

### Finding

`pages/join.vue` has an inline duplicate of the under-13 age check instead of importing the canonical helper from `utils/age.ts`. No functional bug today — both implementations currently agree — but it's drift risk: a future change to the age-boundary rule (e.g. a COPPA-adjacent policy change) only needs to touch `utils/age.ts` to actually take effect everywhere, and an inline duplicate silently stops being "the same rule" the moment one side is edited and the other isn't.

### Acceptance Criteria (web fix)

- [ ] `pages/join.vue` replaces its inline under-13 check with an import from `utils/age.ts` (use the canonical exported function — do not re-derive the boundary math locally).
- [ ] No behavior change: the replaced check must produce identical results for all existing age-boundary unit tests before and after.
- [ ] Bundled with Item 2 below (shared age-boundary fixture) — land both in the same PR since Item 2's fixture is what proves G's replacement is behaviorally identical, not just visually similar.

### Verification (this session)

Not independently re-verified via a fresh grep in this pass — carried forward from the forwarding notes as given. Before implementing, confirm current line numbers in `pages/join.vue` and the exact exported symbol name in `utils/age.ts` (do not assume a name).

---

## Item H — iOS dead code: `OnboardingViewLegacy.swift`

### Finding

`OnboardingViewLegacy.swift` (the old 5-step onboarding version) is superseded by the v2 onboarding container but still sits in the iOS tree, along with presumably-stale references to it.

### Acceptance Criteria (iOS fix)

- [ ] Delete `OnboardingViewLegacy.swift`.
- [ ] Grep the iOS codebase for any remaining references (navigation targets, previews, DI registrations, test targets) and remove them.
- [ ] **Sequencing constraint: do this only after Item A's v2 1-step collapse ships and is verified.** Deleting the legacy view before A lands risks removing a fallback path prematurely if A's rollout hits an issue; deleting it after A is confirmed working removes it once it's provably unreachable.
- [ ] Build gate: `xcodebuild build -quiet` clean after deletion — a stale reference left behind would otherwise surface as a compile error at this step, not a runtime crash, so treat a clean build as sufficient confirmation of a fully removed reference.

### Verification (this session)

Not independently re-verified via a fresh grep of the iOS tree in this pass — carried forward from the forwarding notes as given. Confirm current file path and reference count before starting the delete.

---

## Item I — Session-mint architecture divergence — accepted, not a gap

### Finding

Web now server-mints the session (`tokenHash` + client `verifyOtp`) as a Safari ITP (Intelligent Tracking Prevention) workaround (PR #885). iOS uses a native Keychain-backed session flow via `supabase-swift`, which is not subject to Safari ITP's third-party-cookie restrictions in the first place — the workaround web needed doesn't apply to iOS's native auth stack.

### Conclusion

This is an accepted, deliberate platform divergence, not a parity gap. Documented here for awareness so a future pass doesn't misread the two different session-mint code paths as web/iOS drift needing reconciliation.

### Acceptance Criteria — verification only, no architecture change

- [ ] Confirm `supabase-swift`'s `signUp()` reliably returns a usable `Session` for **both** the adult signup path and the minor (guardian-optional) signup path on iOS — this is the one cheap check worth doing, since Item E already found a real minor-signup-path bug on web in the adjacent "does the post-signup state get finalized correctly" area, and it's worth ruling out an iOS analogue in the session-return path specifically (not the `phase_milestone_data` path, which Item E already covers separately).
- [ ] No web or iOS code changes follow from this item unless the verification check above turns up a real gap — if it does, that becomes its own follow-up item, not silently folded into I.

### Verification (this session)

Carried forward from the forwarding notes as given; the `supabase-swift` `signUp()` return-value check itself has not been executed in this session — it's specified here as the next actionable step, not yet completed.

---

## Superseded Docs

The following two docs are superseded by this consolidated spec (or by the specific items within it) and have been annotated in-place with a one-line pointer back here, per this session's instructions — **not deleted**:

- `planning/2026-08-16-minor-consent-family-invite-plan.md`
- `planning/iOS_SPEC_onboarding-v2-2026-08-31.md`

---

## Notes for iOS Claude

- Items A and B both depend on the iOS "provisioning on every authenticated session" gap flagged in `iOS_SPEC_preconfirm-onboarding-step1-2026-09-11.md`'s "Notes for iOS Claude" section — if that gap is still open, resolve it (or explicitly scope it into this pass) before starting A, since A's acceptance criteria assume the flush hook exists.
- Item D is a real, actionable web-repo fix (AASA file) that unblocks already-built iOS `DeepLinkHandler` code — not documentation-only. The Turnstile platform-limitation note (separate section below Item D) is documentation-only — read it before touching any other Turnstile-related iOS work.
- Item E is a **web-only** fix tracked here for visibility; no iOS code changes follow from it directly today, but if/when the guardian-optional-signup-wizard gets an iOS port, its spec must not repeat this exact bug (i.e., iOS's post-signup dashboard navigation for a self-serve minor must set whatever iOS's onboarding-complete equivalent is, at the same point web's fix will).
- Item F is a real iOS build item (guardian email must become optional client-side) — it is NOT "already matched," despite what an earlier pass of this doc said; verify client code directly, not just server/DB parity, before trusting a "no action" conclusion on any item. Item H (delete `OnboardingViewLegacy.swift`) is sequenced strictly after Item A ships and is verified — don't jump ahead on it.
- Item I is verification-only: run the one `supabase-swift signUp()` session-return check before assuming iOS's divergent session-mint path is fully clean.
- This doc is now complete (A–I, OpenAPI deliverable, refactor items 2/4/5) — build order across items is not prescribed here beyond the explicit sequencing constraints called out per-item (A before H; the provisioning-flush gap before A and B).

---

## Refactor Opportunities — Items 2, 4, 5

*(Item 1 — OpenAPI/shared-contract generation — is the cross-cutting deliverable specified above under "OpenAPI / Shared-Contract Generation from Zod Schemas"; items 2/4/5 below are the remaining refactor-opportunity items from the original draft's refactor-opportunities section.)*

### Item 2 — Shared age-boundary fixture (bundle with Item G)

**Finding:** Web and iOS each hardcode age-boundary constants (13, 18, etc.) and test cases separately — `utils/age.ts` plus whatever iOS's equivalent age-gate logic is — with no shared source of truth for the boundary values or the edge-case scenarios (birthday-is-today, leap-year DOB, exactly-13-vs-13-and-one-day) that both test suites ought to assert identically.

**Recommendation:**
- [ ] Create a JSON fixture (e.g. `shared/fixtures/age-boundaries.json` or similar — exact location is implementer's call, but it must be committed somewhere both platforms' test suites can read from, not duplicated by hand into each) enumerating age-boundary test cases: `{ dateOfBirth, referenceDate, expectedAgeYears, expectedIsMinor, expectedUnder13 }` shape or equivalent.
- [ ] Web's `utils/age.ts` test suite asserts against this fixture instead of (or in addition to) its own hand-written cases.
- [ ] iOS's age-gate test suite asserts against the same fixture (parsed via Swift's `JSONDecoder`, or ported 1:1 by hand if no shared-fixture-loading mechanism exists yet on iOS — implementer's call, but the values must originate from the one committed file, not be retyped).
- [ ] Land together with Item G's `pages/join.vue` fix — the fixture is what proves G's import-based replacement behaves identically to the inline check it replaces.

### Item 4 — Drop iOS's `createFamilyViaDirect` fallback

**Finding:** iOS's `createFamilyViaDirect` fallback path performs direct Supabase table writes when no `API_BASE_URL` is configured, bypassing the server-side race-hardening work already shipped on the Nitro endpoint (PR #859 — family-creation suppression race scoping, and PR #862 — family/create race-loser missing durable membership). A client that takes this fallback path gets none of that hardening; it's re-exposed to the same race classes those two PRs closed on the server side.

**USER DECISION (this session): drop the fallback entirely.** Require `API_BASE_URL` to always be configured on iOS builds — single code path through the hardened Nitro `/api/family/create` endpoint, no direct-Supabase-write escape hatch.

**Acceptance Criteria:**
- [ ] Remove `createFamilyViaDirect` (or the equivalent direct-write code path) from iOS entirely.
- [ ] iOS build/config is audited to confirm `API_BASE_URL` is set in every build configuration that ships (Debug, Release, TestFlight, any staging config) — a missing value should fail fast at build or launch time, not silently fall through to a now-deleted code path.
- [ ] Any existing test coverage that exercised `createFamilyViaDirect` is removed or repointed at the single hardened-endpoint path.
- [ ] Confirm no other iOS call site depends on the direct-write fallback's specific behavior (e.g. offline-first assumptions) before deleting — if one does, that's a blocking dependency to resolve first, not a reason to keep the fallback.

### Item 5 — Remove deprecated `guardian/status.pending` alias (server-side cleanup)

**Finding:** The server keeps `guardian/status`'s deprecated `.pending` field (an alias of `.locked`) alive only because a server-side comment says a currently-deployed iOS build reads `.pending`, not `.locked`.

**Acceptance Criteria:**
- [ ] Verify the current iOS codebase (not a historical/deployed build assumption — the actual code in the repo today) reads `.locked`, not `.pending`, from the guardian-status response.
- [ ] If confirmed, remove the deprecated `.pending` alias from the server response shape (`server/api/.../guardian/status...` — exact endpoint path to confirm at implementation time) and delete the now-stale comment explaining why it was kept.
- [ ] If NOT confirmed — i.e. iOS (or some still-live older build) genuinely still reads `.pending` — do not remove the alias; instead file this as blocked-on-iOS-client-update and leave the server alias in place with an updated comment reflecting the real current reason.
- [ ] This is a server-side-only change; no iOS code changes follow from it unless the verification step above finds iOS still needs the deprecated field, in which case the sequencing is: ship the iOS `.locked`-only client update first, confirm it's live everywhere that matters, then remove the server alias in a follow-up.

---

