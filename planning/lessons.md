# Lessons Learned

Tracks mistake patterns (with recurrence counts) and process insights.

**How to use:**
- When adding a new bug pattern: check if it already exists → increment count → move to Core if count ≥ 2
- When adding article/process insights: add to the Knowledge section at bottom

---

## Core (Recurring — seen 2+ times)

*None yet. Patterns graduate here when they recur.*

---

## Bug & Mistake Patterns

### Dual-Store Drift: FK Column vs. Prefs JSONB for the Same Field

**Times seen:** 1 (two field instances same session: position + sport) | **Last seen:** 2026-08-15
**Context:** `{{position}}` in coach templates rendered a stale "Utility" for Owen. Root cause: the same logical field lives in TWO places that never reconcile — `users.primary_position_id` (FK to `positions` table) vs `user_preferences.data.primary_position` (jsonb string), AND a separate `user_preferences.data.positions[]` array. Onboarding wrote one, the athletics-tab multiselect wrote another, nothing synced them. The SAME split exists for sport (`users.primary_sport_id` FK is null on real accounts; `prefs.primary_sport` is what's actually populated) — so the resolver's sport lookup was silently empty too, degrading position abbreviation.
**Root Cause:** Real accounts populate the prefs JSONB; the relational FK columns (`*_id` / `positions` table) are vestigial and usually empty. Any reader that trusts the FK store gets a blank or stale value. Two write paths for "the same" field with no mirror = guaranteed drift.
**Prevention:**
- Pick ONE source of truth (here: ordered `positions[]`) and MIRROR it onto the legacy field on every save (`primary_position := positions[0]`), so downstream readers can't observe drift.
- When a resolver reads a `*_id` FK for athlete data, add a fallback to the prefs JSONB string — real users populate the jsonb, not the FK.
- Before trusting any `users.<x>_id` FK for display, verify real rows actually populate it (`SELECT count(*) WHERE <x>_id IS NOT NULL`) — these tables were often seeded once and abandoned.
- Grep for EVERY consumer before repointing; a field like "position" renders in ~13 places (templates, packet, public profile, markdown export, API).

### Forked web-to-ios-handoff Latches Onto Stale planning/iOS_SPEC_* Instead of the Current Task

**Times seen:** 1 | **Last seen:** 2026-08-11
**Context:** Fixing the web/iOS dashboard-timeline desync, I dispatched the `web-to-ios-handoff` skill (forked, general-purpose) to write an iOS spec for consuming the new shared endpoints. It instead found an unrelated existing spec (`iOS_SPEC_player-details-tab-reorg`) and produced a parity *grade* of that, never writing the timeline spec I needed. Wasted a 92s fork; I wrote the correct spec myself.
**Root Cause:** The skill's discovery step + `CLAUDE.md`'s "ls planning/iOS_SPEC_* before generating" nudge biases it toward the newest existing spec. With no explicit feature name pinned, it treated the most recent `iOS_SPEC_*` as the subject.
**Prevention:**
- When dispatching the handoff skill, name the feature and the target spec filename explicitly in the prompt ("write NEW spec at planning/iOS_SPEC_<slug>-<date>.md for <feature>; do not grade existing specs").
- For a spec I can write from context already in-session, writing it directly is faster than forking.
- Verify a forked skill's output is about the task I gave it before trusting it — a "READY TO BUILD" verdict on the wrong feature is worse than an error.

### Searching for Existing Tests Must Cover Both .spec.ts AND .test.ts

**Times seen:** 1 | **Last seen:** 2026-08-11
**Context:** Hardening the three `deletion-blockers` endpoints, I wrote three "new" spec files with `Write` — silently overwriting existing suites (`schools` 16 tests, `coaches` 8, `interactions` 5). My discovery grep used `find ... -name '*.test.ts'`, which does not match `.spec.ts`; a subagent also reported "no existing tests." First commit was net **−651 lines** (destroyed coverage). Caught it only in the `git show --stat` diff, recovered old versions from `HEAD~1`, merged old + new, amended.
**Root Cause:** This repo uses `.spec.ts` for unit tests, not `.test.ts`. A single-extension search returns zero hits and reads as "no tests exist." `Write` on an existing file replaces it wholesale with no merge.
**Prevention:**
- Search for existing tests with BOTH extensions: `find ... \( -name '*.spec.ts' -o -name '*.test.ts' \)` or `grep -rl <symbol> tests/`.
- A "fix" commit whose `git show --stat` shows large **deletions** in files you meant to *add* to is a red flag — inspect before trusting the commit.
- Before `Write` on a path that may exist, `ls`/Read it first; prefer `Edit` (append) over `Write` (replace) when augmenting a file.
- Don't trust a subagent's "no existing X" when its search method is unverified — confirm the glob it used.

### Pre-Push Gate Runs Lint + Type-Check but NOT Tests — Run npm test Yourself

**Times seen:** 1 | **Last seen:** 2026-08-08
**Context:** Shipped an SSRF fix to `checkLinkHealth` (added a `resolvesToPublicIp` DNS gate before the fetch) straight to prod. It silently broke 2 existing `video-health-check.spec.ts` tests — their fake hostnames (`ok.example`) don't DNS-resolve, so the new gate returned `broken` before `fetch` was ever called. Prod *code* was correct (real URLs resolve), but `main`'s test suite was red for ~3 commits until caught.
**Root Cause:** `.husky/pre-push` runs `npm run lint` then `npm run type-check` — it does NOT run `npm test`. A test-breaking behavioral change passes the gate and pushes clean. Adding a network/DNS pre-condition to a function is exactly the kind of change unit tests with fake hosts will trip on.
**Prevention:**
- CLAUDE.md already says "run `npm test` after code changes" — actually do it before pushing behavioral changes, don't lean on the pre-push gate.
- When adding a guard/pre-condition to a fetched-URL function, grep for its spec first — fake hostnames/IPs in existing tests will now hit the new gate.
- Minimum before a prod push: run the specs for every file you touched (`npx vitest run <spec>`), not just lint/type-check.

### Nested Worktrees Fail the Pre-Push Lint Gate (looks like a network stall)

**Times seen:** 1 | **Last seen:** 2026-08-08
**Context:** `git push origin develop` kept timing out / appearing to "stall on HTTP/2." Real cause: the `.husky/pre-push` hook runs `npm run lint`, and ESLint reported 24,182 errors, rejecting the push. All errors came from `.worktrees/video-links/` — a nested git worktree (full repo copy) whose `vitest.config.ts` files aren't in `tsconfig.json`, so `parserOptions.project` parse-errors cascaded.
**Root Cause:** ESLint flat config (`eslint.config.js`) does NOT honor `.gitignore`. `.worktrees` was gitignored but still linted. Also `git push … | tail` reports the pipe's exit (tail = 0), masking git's failure — the push looked like it succeeded/stalled rather than being rejected.
**Prevention:**
- `.worktrees` + `.worktrees/**/*` added to the ESLint global `ignores` block (commit `61445a6b`). Worktrees are separate checkouts, never the branch's source — always exclude them.
- Verify a push landed by ref-diff (`git ls-remote origin <branch>` vs `git rev-parse <branch>`), NEVER by the piped exit code.
- Flaky-DNS workaround for this repo's pushes: `git -c http.version=HTTP/1.1 push …`.

### Nuxt Silently Disables Incompatible Modules (and Their Dependents)

**Times seen:** 1 | **Last seen:** 2026-08-06
**Context:** All dashboard tile/button icons blank in production. Prod bundle `entry-CP9JRFg7.js` contained zero heroicon data; `UIcon` wasn't registered at all.
**Root Cause:** Dependabot bumped `@nuxt/ui` 3.3.7 → 4.8.0 (`96a2d29f`). v4 declares `compatibility.nuxt: ">=4.1.0"`; we run Nuxt 3.21.10. Nuxt disabled `@nuxt/ui` with only a `WARN [NUXT_B8013]` and **exit code 0**. `@nuxt/icon` is registered as a `moduleDependency` of `@nuxt/ui`, so it was disabled too — taking `clientBundle` icon bundling with it. Build "succeeded," prod shipped broken.
**Prevention:**
- `experimental.enforceModuleCompatibility: true` in `nuxt.config.ts` — turns the WARN into a fatal ERROR. Verified it fails the build under `@nuxt/ui` 4.8.0.
- A module bump can break things the module doesn't own. Check `moduleDependencies` in the module's `dist/module.mjs` before accepting a major.
- Grep the built bundle, not the source, when prod-only rendering breaks: `grep '"icon-name":{' .vercel/output/static/_nuxt/entry-*.js`. Source having the name proves nothing.
- Reproduce prod by building the exact deployed SHA in a worktree — the delta vs. local main is the answer.

---

### Dependabot Security Updates Bypass Major-Version Ignores

**Times seen:** 1 | **Last seen:** 2026-08-06
**Context:** `.github/dependabot.yml` ignores `dependency-name: "*"` for `version-update:semver-major` and sets `target-branch: develop`. A major still landed directly on `main` and deployed to prod.
**Root Cause:** Dependabot **security** updates are a separate mechanism from version updates. They ignore `target-branch` (always the default branch) and are not filtered by `update-types` ignores. So a security advisory can push a breaking major straight to prod, skipping `develop` and review entirely.
**Prevention:**
- Version-range ignores DO apply to security updates: `- dependency-name: "@nuxt/ui"` + `versions: [">=4.0.0"]`. Use these to fence packages that can't cross a major.
- Per-package fencing is whack-a-mole — the real fix is not auto-merging security PRs onto `main`. Review branch protection on the default branch.
- Before accepting a security bump, check whether the advisory even applies. Ours was `UAuthForm`/`UForm` SSR markup omitting `method`; we use neither component and run `ssr: false`. Zero exposure, real breakage.

---

### Teleport Components Must Be Client-Only in Nuxt SSR

**Times seen:** 1 | **Last seen:** 2026-02-16
**Context:** Production error "TypeError: Cannot read properties of null (reading 'ce')" on login page during SSR
**Root Cause:** `<Teleport to="body">` components render during SSR where the body element isn't available the same way as on client. This causes Vue to encounter null VNodes and crash trying to access internal 'ce' property
**Prevention:**
- ALWAYS wrap `<Teleport>` components in `<ClientOnly>` wrapper
- Pattern: `<ClientOnly><Teleport to="body">...</Teleport></ClientOnly>`
- This prevents SSR rendering and ensures teleport only runs in browser
- Example: Toast notifications, modals, popovers that teleport to body

**Sentry Issue:** JAVASCRIPT-NUXT-4

---

### Nuxt 3 Auto-Import Component Naming

**Times seen:** 1 | **Last seen:** 2026-02-14
**Context:** Vue failed to resolve `ProfileEditHistory` and `ProfilePhotoUpload` components despite files existing in `/components/Settings/`
**Root Cause:** Nuxt 3 auto-import requires folder prefix for nested components. Components in `/components/Settings/` must be referenced as `SettingsComponentName`, not just `ComponentName`
**Prevention:**
- When creating components in subdirectories of `/components/`, always use the folder prefix
- Pattern: `/components/FolderName/ComponentName.vue` → `<FolderNameComponentName />`
- Example: `/components/Settings/ProfileCard.vue` → `<SettingsProfileCard />`
- Alternative: Explicitly import components if you want to use custom names

---

### Cross-Repo Agent with isolation:worktree Edits the Wrong Repo's main

**Times seen:** 1 | **Last seen:** 2026-08-25
**Context:** Web session dispatched an iOS-parity agent with `isolation:worktree`. The agent got a worktree of the WEB repo, then edited the iOS repo directly at its absolute path — landing uncommitted parity work on the shared iOS `main`, tangled with a concurrent iOS widget-reorder session's staged changes.
**Root Cause:** `isolation:worktree` worktrees the CURRENT (dispatching) repo only. For cross-repo work the "isolation" is fake — the agent edits the target repo's live checkout, which another session may own.
**Prevention:**
- Never dispatch an `isolation:worktree` agent to edit a repo other than the session's own.
- Cross-repo (iOS-from-web) work: run it from a session in that repo, OR have the agent `git worktree add` IN the target repo and `cd` there. Never edit the target's `main`.
- Recovery pattern when it happens: `git stash push -u` (safety backup) → `git merge --ff-only origin/main` → branch off clean main → `git checkout stash@{0} -- <only your files>` → build-verify → commit.
- iOS build from a non-Xcode shell: `DEVELOPER_DIR=/Applications/Xcode-beta.app/Contents/Developer xcodebuild build -destination 'generic/platform=iOS Simulator' -quiet` (CommandLineTools can't build; a named sim can silently fall back to My Mac and exit 0 without building).
- Enforced by the dirty-main PreToolUse guard hook (added 2026-08-25).

---

## Template (for new bug patterns)

```markdown
### [Brief description]

**Times seen:** 1 | **Last seen:** YYYY-MM-DD
**Context:** What went wrong
**Root Cause:** Why it happened
**Prevention:** Rule to prevent recurrence
```

---

## Knowledge (Process & Tool Insights)

### 7 AI Tools Developers Actually Use in 2026 — 2026-03-10
Source: Nebula blog, Mar 6 2026

- **Automated PR review before humans**: Inserting an AI reviewer (e.g. CodeRabbit) as the first pass on every PR reduces human reviewer cognitive load — they focus on architecture and product logic, not null checks or inconsistent error handling; setup is GitHub Marketplace, under 5 minutes.
- **Docs-in-PR-workflow**: Generating API docs from code (e.g. Mintlify) and triggering doc staleness checks on PR merge keeps Nitro endpoint documentation accurate without a separate sprint task — point it at `server/api/**` routes and let it diff on change.
- **AI tool layering overhead**: Misused or unintentionally stacked AI tools increase task time by 19% (not decrease it) — each tool must solve a specific, named workflow problem; adding tools without a clear bottleneck they address creates net overhead.

---

### Expose Your Design System to LLMs — 2026-03-10
Source: https://hvpandya.com/llm-design-systems

- **Three-layer token indirection**: Never use raw hex/px values in Vue templates or CSS — use `--ds-*` upstream tokens → `--color-*` project aliases with fallbacks → component Tailwind utilities. Example: `--color-primary: var(--ds-primary, #3B82F6)` then `text-[--color-primary]` in Tailwind.
- **Design spec files in version control**: Create `docs/design/` markdown files per component that define when to use each variant, token, and spacing — these feed LLM session context and prevent visual drift across sessions far better than code alone.
- **CI audit script for hardcoded values**: Add a script that greps `.vue` and `.css` files for raw hex colors (`#[0-9a-fA-F]{3,6}`) and arbitrary Tailwind values (e.g. `bg-[#...]`) and exits with code 1 — makes token violations a failing CI check rather than a review comment.
- **LLM session amnesia is a design token problem**: Visual drift across AI coding sessions (prototype "feels off" by session 5–10) is caused by the LLM fabricating plausible values instead of referencing actual tokens — spec files + audit enforcement eliminates this class of inconsistency entirely.

---

### Boris Cherny's Claude Code Tips — 2026-03-10
Source: https://x.com/bcherny/status/2007179852047335529

- **Pre-allow safe bash commands**: Use `/permissions` to allowlist known-safe bash commands in `.claude/settings.json` rather than reaching for `--dangerously-skip-permissions` — check it into the repo so the whole team benefits.
- **Team-shared MCP config**: Check `.mcp.json` into version control so all devs and CI share the same MCP server configuration without each person setting it up manually.
- **Stop hook for long-task verification**: Add an agent `Stop` hook that runs verification deterministically when the task ends — more reliable than prompting Claude to self-verify.
- **Verification loop is the highest-leverage practice**: Giving Claude a way to verify its own work (run tests, type-check, curl an endpoint) produces 2–3x better final results.
- **Opus is net-faster than Sonnet for complex tasks**: Despite being slower per token, Opus requires less steering — faster end-to-end than switching to a smaller model that needs more corrections.
- **CLAUDE.md is a living team document**: Every time Claude does something wrong in a PR review, add a correction to CLAUDE.md as part of that PR.
- **`.claude/commands/` for team-shared slash commands**: Project-specific slash commands live in `.claude/commands/`, are checked into git, and can be invoked by Claude itself during a session.

---

### Agent Skills for Code Review — 2026-03-15
Source: Jen-Hsuan Hsieh / Medium, Feb 14 2026

- **Progressive disclosure is why skill bodies stay lean**: Skill metadata loads every session; the SKILL.md body only loads when triggered — keep bodies focused because they consume main-context tokens on every invocation.
- **Skills vs sub-agents — context isolation**: Skills share the main agent's context (no isolation, cheaper); sub-agents get isolated context + separate tool permissions (better for heavy, contained tasks).
- **Paired skill + sub-agent pattern for reviews**: For tasks that need both domain standards and isolated execution, trigger both simultaneously: `Skill("standards")` + `Task(subagent_type="specialist-agent")`.
- **Encode mandatory paired-tool rules in memory**: Add explicit "must call X and Y simultaneously" rules to CLAUDE.local.md to prevent accidentally doing only one.

---

### Git-Backed Agent Memory (pi-self-learning) — 2026-03-18
Source: pi newsletter

- **Frequency + recency ranking surfaces what matters**: A flat lessons log treats all mistakes equally — ranking by recurrence count separates noise (one-off edge cases) from signal (systematic blind spots worth injecting into every session).
- **Core vs. long-term split**: Inject only top-N recurring lessons into every session context; keep full history in the archive. Prevents the lessons file from growing so large it becomes overhead.
- **Auto-extraction vs. manual**: Relying on the agent to notice and save lessons misses things. A post-task hook that prompts reflection catches patterns before they're forgotten.

---

### 10 Backend Mistakes That Reveal Inexperience — 2026-03-23
Source: pasted content (Gopi C K)

- **Pagination on every list endpoint**: Never return unbounded result sets from Nitro list handlers — default to `?limit=20&offset=0` unless the dataset is provably small (≤ 50 items max). Example: `server/api/schools/index.get.ts` must accept and apply `limit`/`offset` query params.
- **Index new filter columns in migrations**: Every Supabase migration that adds a column used in `.eq()`, `.order()`, or `.match()` calls should include a `CREATE INDEX` in the same migration file — missing indexes degrade silently as rows grow.
- **Failure-first Supabase queries**: Treat Supabase as a flaky external service — always chain `.throwOnError()` or explicitly check `error !== null` after every query. Silent `null` returns (`.maybeSingle()` without null checks) cause downstream crashes with no useful error context.
- **Standardized Nitro error response shape**: All `createError()` calls should follow the same shape: `{ statusCode, statusMessage }` — no raw `error.message` leakage (already in CLAUDE.md), no ad-hoc response objects. Consistency enables predictable client-side error handling.

---

### HTML5 Native Features That Replace Vue Abstractions — 2026-03-31
Source: pasted content (Mahad Nadeem)

- **`<dialog>` eliminates Teleport modals**: Native `<dialog>` renders in the browser's top layer automatically — no `<Teleport to="body">`, no SSR crash risk, no custom backdrop/ESC/focus-trap logic. Audit existing modal components and replace with a thin `<dialog>`-based Vue wrapper. Example: `dialogRef.value?.showModal()` / `dialogRef.value?.close()`.
- **`<details>/<summary>` for collapsible UI**: Any Vue component that uses `v-show`/`v-if` solely to toggle visibility of a section (filters, FAQ, advanced options) can be replaced with `<details>/<summary>` — keyboard accessible, zero JS, zero state.
- **`<progress>` for async job feedback**: Native `<progress value="N" max="100">` handles background job / data-fetch feedback with no CSS animation, no custom component. Update `.value` reactively from a Pinia store.
- **Layer native form constraints with Zod**: HTML5 `required`, `min`, `max`, `minlength`, `type="email"` provide instant in-browser feedback *before* Zod/server validation runs — they don't replace Zod but reduce unnecessary server round-trips and improve mobile UX on forms.
- **Excess ARIA signals wrong base HTML**: If a Vue component needs more than 1–2 ARIA attributes to be accessible, the underlying element choice is probably wrong (e.g., `div` + `role="button"` instead of `<button>`). Treat ARIA accumulation as a code smell and audit the semantic element first.

---

### Form Automation Tips for Happier Users and Clients — 2026-03-31
Source: https://css-tricks.com/form-automation-tips-for-happier-user-and-clients/

- **Normalize form data before submission**: Lowercase email, title-case name, strip non-digit characters from phone — do this in a composable before the Nitro call, not server-side. Prevents duplicate Supabase records caused by casing inconsistencies ("JOHN SMITH" vs "john smith"). Example: `email.trim().toLowerCase()`, `phone.replace(/\D/g, '')`.
- **Disable submit atomically with a `submitting` ref**: Use `const submitting = ref(false)` — set `true` before the `$fetch` call, reset in `catch` only (not `finally`). `finally` re-enables the button even on success, which invites double-submissions on slow connections; only re-enable on recoverable error.
- **Include `source` and `timestamp` in Nitro-bound form payloads**: Add `{ source: 'app_form_name', timestamp: new Date().toISOString() }` to every form payload sent to Nitro endpoints — makes Supabase audit trails queryable and any downstream webhook (email, Zapier) reliable without post-processing.
- **Specific error messages replace generic ones**: Nitro `createError()` `statusMessage` should name the actual failure — `"Email already registered"`, `"Phone number format invalid"` — not `"Something went wrong"`. Pair with a specific success message that sets expectations: `"Sent. You'll hear back within 24 hours."` instead of `"Success!"`.

---

### Autonomous Code Review Bot with Claude Code Hooks — 2026-04-06
Source: pasted content (Vikas Sah)

- **PreToolUse hooks for deterministic safety gates**: Claude Code PreToolUse hooks (exit 2 = block, stderr = feedback to Claude) enforce rules the LLM cannot bypass — use them to block lock file edits, CI workflow modifications, `.env`/`.pem` access, and destructive git commands. Unlike prompt guardrails, hooks are deterministic and always fire.
- **PostToolUse hooks for anti-pattern detection**: PostToolUse hooks run linters/greps after every Edit/Write and surface warnings via `systemMessage` JSON — Claude sees the feedback in context and self-corrects on next turn. Example: flag `console.log`, bare `any` types in non-test files.
- **Auto-review PR trigger complements on-demand @claude**: Our `claude.yml` only fires on `@claude` mentions — adding `pull_request: [opened, synchronize]` as a trigger with a scoped review prompt (security, correctness, performance, error handling + "don't invent problems") catches issues before a human reviewer opens the PR.
- **Scope AI reviews narrowly to prevent cry-wolf effect**: Teams abandon AI review tools when false positive rate is high — limit the review prompt to 3-4 specific categories the LLM reliably detects (security vulns, common bugs, missing error handling) rather than reviewing "everything". Include "if everything looks good, say so" to suppress noise.
- **Lock down allowedTools in CI review jobs**: Use `--allowedTools` to restrict what Claude can do in GitHub Actions — read diffs and post comments only, never modify code or push. Example: `"Bash(gh pr comment:*),Bash(gh pr diff:*),Bash(gh pr view:*)"`

---

### Simple CSS Tricks to Make Your Forms Look "Pro" — 2026-04-21
Source: pasted content (Tushar Kanjariya / Medium)

- **`focus-visible` over `focus` for keyboard accessibility**: Use Tailwind's `focus-visible:ring-2 focus-visible:ring-brand-blue-600` instead of `focus:ring-*` on all inputs — `focus-visible` only shows the ring for keyboard navigation, not mouse clicks, which is the correct WCAG behavior. Audit existing form components for bare `focus:ring` usage.
- **`autocomplete` attributes on every form input**: Add explicit `autocomplete` values (`"email"`, `"name"`, `"tel"`, `"current-password"`, `"new-password"`, `"given-name"`, `"family-name"`) to all `<input>` elements — browsers use these for autofill and password managers, and they're required for WCAG 1.3.5 (Identify Input Purpose). Audit the coach/athlete registration and login forms.
- **`accent-color` for branded checkboxes/radios**: Add `accent-color: var(--brand-blue)` to our global `theme.css` for `input[type="checkbox"], input[type="radio"]` — one line makes native checkboxes match brand color with zero custom component overhead. Tailwind does not apply this by default.
- **Exclude checkbox/radio from generic input selectors**: Any global `input { ... }` or Tailwind `@apply` block targeting `input` without a type qualifier will apply padding/sizing to checkboxes and radios too — always scope to `input:not([type="checkbox"]):not([type="radio"])` in any global CSS targeting text inputs.

---

### vibe-guard-skills: AI-Author-Specific Bug Patterns — 2026-05-08
Source: pasted content (Vikas Sah)

- **AI-shaped N+1 in Supabase "cleanup" refactors**: When Claude rewrites `users.map(...)` flows, it tends to convert a single `.in()` batch query into a list-comprehension that calls `.single()` per iteration — same return shape, N queries instead of one. Treat every new `.map()`/`for` loop containing a Supabase call as a review red flag. Example anti-pattern: `users.map(u => supabase.from('posts').select().eq('id', u.last_post_id).single())` should be `supabase.from('posts').select().in('id', users.map(u => u.last_post_id))`.
- **`runtimeConfig.public` is a client-bundle leak (Nuxt's `NEXT_PUBLIC_*`)**: Anything placed in `runtimeConfig.public` ships into the JS bundle and is readable by any browser. Never put Supabase service-role keys, Stripe secret keys, Resend API keys, or any auth secret there — only use `runtimeConfig` (server-only). AI commonly mis-routes secrets to `public` because the variable name "looks like config." Audit `nuxt.config.ts` `runtimeConfig.public` block for any key containing `SECRET`, `PRIVATE`, `KEY`, `TOKEN`, or `PASSWORD`.
- **Timing-safe comparison in Nitro auth handlers**: Replace `===` with Node's `crypto.timingSafeEqual()` when comparing API tokens, HMAC signatures, CSRF tokens, or password hashes in `server/api/**` — `===` short-circuits on first byte mismatch and leaks signal under timing analysis. Both args must be `Buffer` of equal length: `timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'))`. Wrap in length check first to avoid `RangeError`.
- **Idempotency keys on side-effect Nitro mutations**: Any POST handler that triggers a charge, email, push notification, or invitation must accept an `Idempotency-Key` header and short-circuit on replay — clients on flaky mobile networks retry, and our family invitation / Stripe-style endpoints will fire twice. Pattern: hash key into a Supabase `idempotency_keys` table with a unique constraint, return cached response on conflict.
- **Migrations need backward-compatible intermediate state**: Never drop a column and add its replacement in the same migration — Vercel runs old and new code concurrently during a rolling deploy and the old runtime will crash on the missing column. Use expand-then-contract: (1) add new column nullable, (2) backfill in a separate migration, (3) switch reads, (4) switch writes, (5) drop old column in a later deploy. Single-migration rename is a guaranteed brief-but-real production outage.
- **Test fixtures are where AI drops real-shaped credentials**: Models reach for placeholder credentials like `sk_test_abc123` in test files because the training corpus is full of them — don't exclude `**/*.test.ts` from `detect-secrets` scanning to "speed up" the hook. The current baseline scans test files; keep it that way. If a test genuinely needs a credential-shaped string, mark it inline with `# pragma: allowlist secret` rather than excluding the directory.
- **`rejectUnauthorized: false` is a one-line catastrophe**: AI sometimes adds this to a Node `https.Agent` or `fetch` config when a dev environment hits a self-signed cert — it disables TLS verification entirely and ships to production undetected. Ban it via grep in CI: `grep -rE "rejectUnauthorized:\s*false" server/ utils/` should fail the build. Same for `NODE_TLS_REJECT_UNAUTHORIZED=0` in any committed env file.

---

### HTML vs Markdown for Claude Artifacts — 2026-05-22
Source: pasted content (Marco Kotrotsos, "Writing HTML For Documentation Instead of Markdown is a Game-Changer")

- **Route artifacts by reader, not by default**: Ask "is this for someone to read or someone to edit?" Read-once human-facing surfaces (session recaps, status overviews, weekly summaries, client-style reports) → invoke `visual-explainer` for self-contained HTML. Edit targets (handoff docs, `planning/*.md`, `COMPLETED_WORK.md`, `CLAUDE.md`, lesson files, anything future-Claude will re-read) → stay markdown — HTML parses worse for LLMs and resists incremental edits.
- **Self-contained HTML or it's not portable**: When generating an HTML artifact, inline all CSS in a `<style>` block, inline all SVG, no external fonts/CDN/JS unless genuinely interactive. The file must survive being emailed, dropped into Slack, or archived without breaking. `visual-explainer` already enforces this — don't hand-roll a competing pattern.
- **Don't blanket-flip the default**: Most artifacts in this repo are read by future-Claude (handoffs, lessons, planning docs), so a global "HTML-first" rule would actively hurt. The win is narrow: recaps and dashboards meant for Chris-on-a-phone, not for the next agent loading context.

---

### Verify-First Before Fixing Audit Findings — 2026-06-22
Source: this session (WCAG a11y audit of dashboard / invite / settings / forms)

- **Read the cited line before fixing any audit finding**: LLM audit subagents (Explore/general-purpose) produce confident `file:line` findings with a real false-positive rate. Across this session ~6 of ~24 "criticals" were wrong — text buttons flagged as "icon-only with no accessible name" (visible text *is* the name), inputs flagged "unlabeled" that were `<label>`-wrapped, `outline-hidden` flagged as missing focus when `focus:ring-2` sat on the same element. One quick `Read` of the exact lines kills these before they waste edit/test/commit cycles. Never fix straight off an audit table.
- **Bake false-positive guards into the audit prompt itself**: Tell the subagent up front: "a button with text content HAS an accessible name; a `<label>`-wrapped input is labeled; `focus:ring-*` replaces a removed outline — do not flag these." Shrinks the false-positive set before it reaches you, but does not replace the read-back.
- **Parallelize independent audit surfaces, gate every commit the same way**: 3 areas (forms/settings/invite) → 3 Explore agents in one message. Each fix batch passed the same gate: `type-check` + `audit:tokens` + full `vitest` (7665) before commit. Attribute-only a11y edits still need type-check (catches the `watch`/`ref` import) and the token audit (no raw hex slipped in).
- **Attribute fixes are static-verifiable; logic fixes need the running app**: aria-label / role / id-for changes are confirmed by type-check + tests. The one fix with real logic — `watch(currentStep)` → `focus()` step region — required driving the actual page (Playwright + e2e `storageState`, Node 22, dev port 3003 to match the storageState origin). The decisive probe: blur focus to `<body>` first, *then* click the nav button — focus still landed on the `role=region` div, proving the watcher (not click bubbling) moved it. A click can't focus a div; only `focus()` can.
- **Skill beats static checklist for a11y**: the existing `accessibility` skill surfaced ~18 real `file:line` fixes across 4 surfaces in one session — what a copy-into-repo markdown ruleset (e.g. A11Y.md) cannot do. Don't install static a11y doc repos; run the skill.

---

## The Goldilocks select height — 2026-07-07
Source: https://jakearchibald.com/2026/goldilocks-select-height/

- **`calc-size()` unlocks intrinsic sizes in math**: `min()`/`clamp()` reject intrinsic keywords (`fit-content`, `stretch`), so you can't clamp a content-sized box directly; wrap it — `max-block-size: calc-size(stretch, min(size, var(--max-size)))` — where `size` is the intrinsic result. Chrome-only right now; Firefox/Safari have open tickets.
- **Customizable-select picker sizing is three custom props**: for `appearance: base-select` pickers, drive UX with `--viewport-margin` (safety buffer, e.g. `1em`), `--min-size` (min usable height ~`12em`), `--max-size` (max comfortable ~`30em`) instead of hardcoded heights — self-documents intent and stays tweakable.
- **`@supports not (...)` gates bleeding-edge CSS**: guard `calc-size()` behind `@supports not (min-block-size: calc-size(fit-content, min(size, 1px)))` and ship a degraded fallback (drop min-size, cap at `fit-content` for short lists) — critical here since our targets aren't all Chrome. Prefer feature queries over UA sniffing.
- **`position-try-fallbacks` + margin flipping**: anchor-positioned poppers reposition with `position-try-fallbacks: flip-block, flip-inline, flip-block flip-inline`; Chrome/Safari flip the margin with the box, Firefox does not — verify margin behavior per-browser when a popover flips above vs below its trigger.
- **`max-block-size: stretch` needs a `100%` fallback**: `stretch` prevents viewport overflow on Chrome/Safari but is unsupported in Firefox — supply `max-block-size: 100%` as the fallback declaration before the `stretch` one.

---

## Structure a Log (Sentry) — 2026-08-04
Source: https://blog.sentry.io/structure-a-log/

- **Low-cardinality result field missing on our logs**: Sentry recommends every log carry a `succeeded`/`failed`/`retried`/`canceled` field for easy grouping/alerting. Our `logger.info/error` calls pass free-text messages + ad-hoc data objects (`server/api/tasks/index.get.ts:121` etc.) with no consistent outcome field — can't group-by-result in a log aggregator today. Gap, not yet fixed.
- **`domain.action` event names vs free text**: Sentry's convention is stable low-cardinality names like `payment.capture` with dynamic values pushed into attributes. Our messages are English sentences ("Feedback submitted", "Failed to cascade delete interaction") — fine for human reading, worse for aggregation/alerting by event type since the same logical event has slightly different phrasing per callsite.
- **What we already do right**: `sanitizeLogData`/`sanitizeData` (`server/utils/logger.ts:167`, `utils/logger.ts:19`) already flatten+redact by `SENSITIVE_FIELDS`, matching the article's "no raw request/response bodies, PII, or nested payment data" rule. `eslint.config.js:182` bans raw `console.*` outside the logger files, matching their "lint to enforce" recommendation — we already have the enforcement layer they suggest.
- **No snake_case/dot-notation key convention enforced**: article wants `payment.failure.reason_code` style scoped snake_case keys; our data objects use plain camelCase (`{ feedbackType, userId }`) with no scoping convention. Low priority — matters more once we're querying logs in an aggregator, not just grepping.

---

## How to Design URLs: Routing, Query Parameters, and Fragments — 2026-08-10
Source: https://www.jstools.space/blog/url-design-routing-query-parameters-fragments/

- **Path = identity, query = optional state**: Never encode transient UI state (sort, view mode, open panel) in the Nuxt path. Example: prefer `/schools?sort=fit&view=grid` over `/schools/sort/fit/view/grid` — path stays a stable, linkable resource.
- **Hybrid slug+ID route params**: For renameable resources use `/[id]-[slug]` and extract the canonical ID with a regex, redirecting stale slugs. Example: `const m = /^(\d+)(?:-|$)/.exec(route.params.segment)` — title can change without breaking the link.
- **SPA fallback must not 200 real 404s**: Nuxt/Nitro catch-all shell fallback should exclude asset files, `/api/**`, and genuinely-missing resources — otherwise broken URLs return `200 OK` instead of a useful 404 (hurts crawlers + monitoring).
- **Parse query values, never trust them**: Every query value is a string and is user input even when our own UI generated it — validate/convert at the boundary (Zod or a `readPositiveInteger` helper with `Number.isSafeInteger(v) && v > 0`), and clamp caps like `Math.min(limit, 100)`.
- **Presence vs empty: use `!== null`, not truthiness**: `URLSearchParams.get()` returns `""` for `?sort=` and `null` for a missing key; both `?preview` and `?preview=` yield `""`. Gate on `params.get('sort') !== null` so an explicitly-empty value isn't silently dropped.
- **Repeated keys for array params**: Prefer `?tag=a&tag=b` (native `params.getAll('tag')`) over comma-joined values — avoids ambiguity when a value itself contains a comma; document the chosen format so client and Nitro parse it identically.
- **Use the `URL`/`URLSearchParams` API, never string-split**: Splitting on `/`, `?`, `&` breaks on encoded values, credentials, IPv6 hosts, and nested URLs — construct with `new URL(...)` and read `.pathname`/`.searchParams`.
- **Fragments never reach the server, and aren't secret**: `#...` is stripped from the HTTP request, so it's useless for SSR-required state; and despite not being sent, it still leaks via history, copied links, extensions, and screenshots — never put tokens there.

---

## Why You Should Never Split Text Field Inputs — 2026-08-17
Source: https://uxmovement.medium.com/why-you-should-never-split-text-field-inputs-28d7dc977092

- **One field + mask, not N boxes**: Format-heavy values (phone, zip, card) belong in a single `<input>` with a localized mask — split boxes force extra tabs, kill mobile numeric-keyboard flow, and make typo-fixing worse.
- **Keep first/last split when you consume the parts**: Coach `first_name`/`last_name` drive templates (`Hi Coach {{last_name}}`), sort, and "Email Jane" CTAs — merging then parsing is worse than the article's split-name problem. User `full_name` is already a single column; signup's two boxes just concatenate.
- **Native `type="date"` beats a text mask**: Player DOB is already one field with `type="date"` + `max` for COPPA — don't replace it with an MM/DD/YYYY mask; the picker localizes and blocks invalid dates.
- **Phone mask is the gap**: Four `type="tel"` fields (CoachForm, EditCoachModal, SchoolInformationCard, PlayerDetailsBasicsTab) accept free text; `phoneSchema` is US 10-digit and `formatPhone` only runs on CommunicationPanel display. Format-as-you-type `(XXX) XXX-XXXX`, store digits.
- **Don't invent Address 2**: Campus address and onboarding zip are already single fields — never add a sibling apartment/suite box; if a multi-line address is needed, use a textarea with "(apartment/suite if any)" in the label.
- **Autocomplete is the cheap anti-split**: `autocomplete="given-name"` / `family-name` / `tel` / `postal-code` lets the browser fill the right box so users don't dump the whole value into the first field — SignupForm has name tokens; InviteSignupForm and coach/phone fields mostly don't.

## Vercel `env rm` deletes the var across ALL environments — 2026-08-18

- **`vercel env rm NAME <environment>` ignores the environment arg for scoping** — it removes the entire variable (Production + Preview + Development), not just the named target. Wiped `NUXT_PUBLIC_ADMIN_HOST` + `PUBLIC_BASE_URL` from Production while trying to change only Preview. Live site survived only because the SPA had already baked the old values at build; the next prod build would have shipped missing values.
- **To change one environment's value:** just `vercel env add NAME <env>` (add is per-environment and overwrites that target). Do NOT `rm` first on a multi-env var. If you must remove, re-add every other scope immediately and verify with `vercel env pull --environment=production`.
- **Sensitive vars mask on pull** (`[SENSITIVE]`) so you can't read the value back — recover known values from code defaults (`nuxt.config.ts`) or the live baked bundle before deleting anything.

## Your SPA Is Leaking Memory — Soak-Test It — 2026-08-20
Source: https://denodell.com/blog/your-spa-is-leaking-memory-soak-test-it

- **SPAs accumulate leaks across navigation**: persistent JS context (our `ssr:false` app) never reloads, so a small leak compounds until the tab crashes/reloads; 86% of 500 studied repos leaked via unremoved listeners/timers/subscriptions, 44% from abandoned `setTimeout()`. Audit `onUnmounted`/`onBeforeUnmount` cleanup for every `addEventListener`, `setInterval`, and Supabase realtime subscription.
- **Soak test = repeat one flow N× in a single browser context**, compare DOM node + listener counts before/after via Playwright CDP session: `page.context().newCDPSession(page)` → `Performance.getMetrics` reads `Nodes` and `JSEventListeners`.
- **Double `HeapProfiler.collectGarbage` before each reading**: one GC pass left detached DOM in ~17% of readings (false positives); call it twice to force full collection.
- **Warm up before baseline**: run the flow ~5× first so lazy-loaded chunks + API responses land in heap once — otherwise legit one-time allocation reads as a leak. Baseline after warmup, measure again after ~200 loops.
- **Assert listeners `<=` baseline, nodes `< baseline + 100`**: leaks show as monotonically climbing counts; use a fixed node allowance (not a percentage) since small views have high relative variance.
- **Fake the clock to trigger timer leaks**: 200 fast loops fire polling timers only ~4× instead of ~120×; use `page.clock.install()` + `page.clock.runFor(ms)` per loop. Mock the network (`page.route(... route.fulfill)`) and `await page.waitForResponse()` before advancing, or real async `fetch` decouples from the fake clock.
- **Run soak nightly, not per-PR**: readings vary run-to-run (unstable in CI gates); packaged fixture `playwright-soak-test` (npm) wraps the boilerplate. Diagnose failures via DevTools Memory tab → filter "Detached" → inspect retainers.

## Soak-test debugging: cold-compile masquerades as "won't hydrate" — 2026-08-20
Source: session work (memory soak-test for athlete switcher)

- **Cold dev-server compile blows short Playwright timeouts — and looks like a hydration/auth bug**: the first `page.goto` to a route compiles it (10–25s in `npm run dev`); a 15s `toBeVisible` races it and fails "element not found" with ZERO network requests, which reads exactly like a dead session. It is not — on a WARM server the same injected-storageState parent session fetches `/rest/v1/users` and `/api/family/accessible` normally. Always retest on a warm server (or `NITRO_PRESET=node-server` preview, which is precompiled) before blaming auth/hydration. Give the first assert on a freshly-navigated route a 45s+ timeout.
- **Browser `console.log` does NOT reach Playwright stdout** without a `page.on("console", ...)` forwarder. Instrumenting app code with `console.log` and seeing "nothing" proves nothing until a forwarder is attached — the earlier "initializeFamily never runs" conclusion was a capture artifact; with a forwarder it clearly ran (`role parent, isParent true → fetching`).
- **`defineEmits` is a compile-time macro — never call it inside a handler**: `Parent/AthleteSwitcher.vue` had `const emit = defineEmits<Emits>()` INSIDE the change handler (plus a discarded top-level call). At runtime the emit silently no-ops, so selecting an athlete never fired `athlete-changed` → `switchAthlete` never ran → the native `<select>` snapped back. Fix: capture `const emit = defineEmits<Emits>()` once at top level, use it in the handler. Symptom in tests: `toHaveValue(next)` fails after `selectOption`.
- **Parent-only switcher gate**: `Parent/AthleteSwitcher` renders its `<select data-testid="athlete-select">` only when `linkedAthletes.length > 1`, fed by `/api/family/accessible` via `useActiveFamily`. Seed a 2nd athlete into the parent's family unit (family_members role=player + users upsert) so the endpoint returns ≥2.
- **Player `/tasks` needs `graduation_year` set**: tasks are grade-derived server-side; a player without `users.graduation_year` shows an empty list. Seed it in `beforeAll` (`update({graduation_year: 2028})`) for any spec asserting on task items standalone.

## Athlete-switcher flow leaks DOM nodes + listeners — root-caused via heap snapshot — 2026-08-20
Source: session work (soak test `tests/e2e/athlete-switcher-soak.spec.ts`)

- **Confirmed leak, found by the first soak test**: on `/tasks`, cycling the parent athlete switcher leaks DOM nodes + listeners per switch (60 loops pre-fix: nodes 2536→11737, listeners 281→959, heap +9MB), measured after double-GC so genuinely retained.
- **Root cause (heap-snapshot retainer trace)**: the detached nodes were the **task-item subtrees**, retained by `native_bind` closures — i.e. Vue `<Transition>` `transitionend`/`animationend` handlers bound to leaving elements. Trigger: `fetchTasksWithStatus` flips `loading=true` on *every* athlete-switch refetch, so `pages/tasks/index.vue`'s `v-if="loading"` skeleton **replaces the whole `v-else` task list** — the list unmounts/remounts wholesale each switch, tearing down the per-item `<Transition>` (line ~592) mid-flight and stranding its bound listeners + detached DOM.
- **How it was found**: CDP heap snapshot → parse `nodes`/`edges`/`strings`, flag `detachedness===2`, histogram boundary retainers. Top holder was `object "Object" --property:el-->` (Vue VNode `.el`), and climbing up, `closure "native_bind"` held 900/908 leaked vnodes. Script: `scratchpad/analyze-heap*.mjs`. `DOM.getDetachedDomNodes` named the subtree roots (`task-item`, `deadline-badge`).
- **Fixes**: (1) `pages/tasks/index.vue` — gate the skeleton on `loading && filteredTasks.length === 0` so the list stays mounted on refetch and keyed v-for diffs instead of unmounting wholesale; (2) removed a redundant double `fetchTasksWithStatus` per switch (handleAthleteChange called it AND `watch(currentAthleteId)` did) which alone cut the leak ~40%; (3) `Parent/AthleteSwitcher.vue` `defineEmits`-in-handler bug (separate, see above).
- **Verification gotcha**: could not re-measure cleanly on the local dev server — every standalone `npx playwright test` spins a fresh dev server, and first-route compile (10–120s under machine load) races the switcher assert. Re-measure runs in the nightly `soak.yml` (preview build = precompiled, warm, full-suite seeded).
## Modal vs Drawer vs Page — pick by task shape, and the drawer recipe — 2026-08-20
Source: session work (CommunicationPanel email composer → right drawer, commit 6c43a717)

- **Decision heuristic** (r/webdev "UI Opening Patterns"): **Modal** = short self-contained task where losing page context is fine (confirm, delete, save-search, single field). **Drawer** = task where the user still needs the current screen visible (compose against a coach, filters against a result list, log a metric beside the list). **Page** = multi-step workflow / large form / its own destination. Our audit: 23 modal files, **0 drawers** — we default everything to modal, so compose/context flows are the mismatch, not the confirm dialogs (those are correct as modals).
- **The whole modal→drawer swap is markup/CSS only — zero logic risk**: a centered modal and a right drawer differ only in the *frame*. Everything inside `[role=dialog]` (fields, focus trap, `role`/`aria-modal`/`aria-labelledby`, all script/props/emits) is byte-identical. That's why tsc + a11y + unit tests pass unchanged — you moved the frame, not the contents.
- **Recipe** (see `CommunicationPanel.vue` email block + `pages/coaches/[id]/index.vue` wrapper): (1) backdrop drops `flex items-center justify-center p-4`, keeps `fixed inset-0`, lighten `bg-black/50`→`bg-black/40`, add `@click.self="close"` so empty-area click closes; (2) panel becomes `absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto border-l` (was `max-w-2xl max-h-[90vh] rounded-xl` — edge-anchored, full height, narrower so the page peeks left); (3) wrap the panel in a **second** `<Transition name="drawer">` inside the existing `fade` backdrop transition, with `.drawer-enter-from/.drawer-leave-to { transform: translateX(100%); }` — backdrop fades while panel slides. Two nested transitions, not one.
- **Kill nested-modal stacking by matching drawer widths**: if a hub modal opens a composer modal, both centered = modal-on-modal. Make the hub AND the composer the same-width right drawer (`max-w-lg`) — the composer then opens *exactly over* the hub, reading as a step/content-replace, not a second layer. (Coach page: the `Quick Communication` wrapper and the email composer are now both `max-w-lg` drawers.)
- **Presentation chrome is NOT a parity item**: this is web CSS layout. iOS presents the same flow with a native `.sheet` (already the platform-idiomatic "drawer") — nothing to replicate. Parity tracks data/fields/UX-capability, not modal-vs-drawer container styling. No field, option, or feature changed here.
- **Deferred debt this exposed**: (1) text composer + template manager in `CommunicationPanel` still centered modals (same 3-line recipe when wanted); (2) the wrapper still renders its own "Quick Communication" header above the panel's own — dedup needs a prop since the panel renders standalone in 3 other pages; (3) the real file-size win is extracting the shared compose/resolve/guardrail state into a `useCoachComposer` composable so email+text are thin child drawers — a tested refactor, not a frame swap.
