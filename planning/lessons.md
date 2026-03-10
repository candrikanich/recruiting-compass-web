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
