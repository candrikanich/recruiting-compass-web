# Lessons Learned

This file tracks patterns, mistakes, and corrections to prevent recurring issues.

## Template

```markdown
## Pattern: [Brief description]

**Date:** YYYY-MM-DD
**Context:** What went wrong
**Root Cause:** Why it happened
**Prevention:** Rule to prevent recurrence
```

---

## Lessons

## Pattern: Teleport Components Must Be Client-Only in Nuxt SSR

**Date:** 2026-02-16
**Context:** Production error "TypeError: Cannot read properties of null (reading 'ce')" on login page during SSR
**Root Cause:** `<Teleport to="body">` components render during SSR where the body element isn't available the same way as on client. This causes Vue to encounter null VNodes and crash trying to access internal 'ce' property
**Prevention:**
- ALWAYS wrap `<Teleport>` components in `<ClientOnly>` wrapper
- Pattern: `<ClientOnly><Teleport to="body">...</Teleport></ClientOnly>`
- This prevents SSR rendering and ensures teleport only runs in browser
- Example: Toast notifications, modals, popovers that teleport to body

**Sentry Issue:** JAVASCRIPT-NUXT-4

## Pattern: Nuxt 3 Auto-Import Component Naming

**Date:** 2026-02-14
**Context:** Vue failed to resolve `ProfileEditHistory` and `ProfilePhotoUpload` components despite files existing in `/components/Settings/`
**Root Cause:** Nuxt 3 auto-import requires folder prefix for nested components. Components in `/components/Settings/` must be referenced as `SettingsComponentName`, not just `ComponentName`
**Prevention:**
- When creating components in subdirectories of `/components/`, always use the folder prefix
- Pattern: `/components/FolderName/ComponentName.vue` → `<FolderNameComponentName />`
- Example: `/components/Settings/ProfileCard.vue` → `<SettingsProfileCard />`
- Alternative: Explicitly import components if you want to use custom names

## 7 AI Tools Developers Actually Use in 2026 (Beyond Copilot) — 2026-03-10
Source: pasted content (Nebula blog, Mar 6 2026)

- **Automated PR review before humans**: Inserting an AI reviewer (e.g. CodeRabbit) as the first pass on every PR reduces human reviewer cognitive load — they focus on architecture and product logic, not null checks or inconsistent error handling; setup is GitHub Marketplace, under 5 minutes.
- **Docs-in-PR-workflow**: Generating API docs from code (e.g. Mintlify) and triggering doc staleness checks on PR merge keeps Nitro endpoint documentation accurate without a separate sprint task — point it at `server/api/**` routes and let it diff on change.
- **AI tool layering overhead**: Misused or unintentionally stacked AI tools increase task time by 19% (not decrease it) — each tool must solve a specific, named workflow problem; adding tools without a clear bottleneck they address creates net overhead.

## Expose Your Design System to LLMs — 2026-03-10
Source: https://hvpandya.com/llm-design-systems

- **Three-layer token indirection**: Never use raw hex/px values in Vue templates or CSS — use `--ds-*` upstream tokens → `--color-*` project aliases with fallbacks → component Tailwind utilities. Example: `--color-primary: var(--ds-primary, #3B82F6)` then `text-[--color-primary]` in Tailwind.
- **Design spec files in version control**: Create `docs/design/` markdown files per component that define when to use each variant, token, and spacing — these feed LLM session context and prevent visual drift across sessions far better than code alone.
- **CI audit script for hardcoded values**: Add a script that greps `.vue` and `.css` files for raw hex colors (`#[0-9a-fA-F]{3,6}`) and arbitrary Tailwind values (e.g. `bg-[#...]`) and exits with code 1 — makes token violations a failing CI check rather than a review comment.
- **LLM session amnesia is a design token problem**: Visual drift across AI coding sessions (prototype "feels off" by session 5–10) is caused by the LLM fabricating plausible values instead of referencing actual tokens — spec files + audit enforcement eliminates this class of inconsistency entirely.

## Boris Cherny's Claude Code Tips (2–13) — 2026-03-10
Source: https://x.com/bcherny/status/2007179852047335529 (content pasted by user)

- **Pre-allow safe bash commands**: Use `/permissions` to allowlist known-safe bash commands in `.claude/settings.json` rather than reaching for `--dangerously-skip-permissions` — check it into the repo so the whole team benefits from the same reduced-friction permissions profile.
- **Team-shared MCP config**: Check `.mcp.json` into version control so all devs and CI share the same MCP server configuration (Slack, Sentry, analytics CLIs, etc.) without each person setting it up manually.
- **Stop hook for long-task verification**: For long-running Claude Code tasks, add an agent `Stop` hook that runs verification deterministically when the task ends — more reliable than prompting Claude to self-verify, since it runs regardless of how the session ends.
- **Verification loop is the highest-leverage practice**: Giving Claude a way to verify its own work (run tests, type-check, curl an endpoint) produces 2–3x better final results — prioritize closing that feedback loop over any other Claude Code optimization.
- **Opus is net-faster than Sonnet for complex tasks**: Despite being slower per token, Opus requires less steering and handles tool use better — Boris uses it for everything and finds it faster end-to-end than switching to a smaller model that needs more back-and-forth corrections.
- **CLAUDE.md is a living team document**: Every time Claude does something wrong in a PR review, add a correction to CLAUDE.md as part of that PR — use the Claude Code GitHub Action (`/install-github-action`) to tag `@.claude` in review comments and have it update CLAUDE.md automatically.
- **`.claude/commands/` for team-shared slash commands**: Project-specific slash commands live in `.claude/commands/` (not `~/.claude/skills/`), are checked into git, and can be invoked by Claude itself during a session — not just the human — making them composable building blocks for inner-loop automation.
- **`--teleport` for terminal-to-web session hand-off**: Background a local Claude Code terminal session with `&` and resume it at `claude.ai/code` using `--teleport` — useful for monitoring long-running tasks on the web UI or continuing work across environments without losing session state.

## Create Agent Skills for Code Review — 2026-03-15
Source: pasted content (Jen-Hsuan Hsieh / Medium, Feb 14 2026)

- **Progressive disclosure is why skill bodies stay lean**: Skill metadata (name/description) loads every session; the SKILL.md body only loads when the skill is triggered — keep SKILL.md bodies focused because they consume main-context tokens on every invocation, unlike sub-agents which get isolated context.
- **Skills vs sub-agents — context isolation**: Skills share the main agent's context (no isolation, cheaper for small knowledge injection); sub-agents get their own isolated context + separate tool permissions (better for heavy, contained tasks that should not pollute the main window).
- **Paired skill + sub-agent pattern for reviews**: For tasks that need both domain standards and isolated execution, trigger both simultaneously in one message: `Skill("standards")` + `Task(subagent_type="specialist-agent")` — using only one of the two is a known failure mode.
- **Encode mandatory paired-tool rules in memory**: Add explicit "must call X and Y simultaneously" rules to the session memory/CLAUDE.local.md to prevent Claude from accidentally doing only one — the explicit rule overrides default single-tool behavior on every future invocation.
