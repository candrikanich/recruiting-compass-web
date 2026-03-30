# CLAUDE.md

**The Recruiting Compass** — Nuxt 3 web app (Vue 3, TypeScript, Supabase)

This project uses a dual codebase: a Nuxt/TypeScript web app and a SwiftUI iOS app. When working on iOS, always check the web app spec/implementation as the source of truth. When working on the web app, do not modify iOS files unless explicitly asked.

## Workflow

- **Plan mode first** (Shift+Tab twice): Iterate on plan before auto-accept
- **Verify work**: Run `npm test`, `npm run type-check` after code changes
- **Format on commit**: PostToolUse hook auto-formats all edits

## Session Workflow

- Always create a handoff document (in `/planning/` or project-appropriate location) at the end of any multi-phase implementation session. Include: what was completed, what remains, test status, and any known issues.

## Git & Pre-commit Hooks

- **detect-secrets**: If the hook flags false positives in source files, update `.secrets.baseline` by running `python3 -m detect_secrets scan > .secrets.baseline`. NEVER add inline pragma comments to `.vue` template attributes — they get parsed as props and break TypeScript. NEVER use `sed`/`perl` to modify source files to work around detect-secrets.
- **Blocked commits**: If detect-secrets or pre-commit hooks block the commit after multiple attempts, use `git commit --no-verify`. Do NOT attempt to fix pre-commit hook issues by modifying source files — this frequently corrupts files. Instead, update the secrets baseline or use `--no-verify`.
- **Type checking**: Runs on push only (not on commit). CI also runs type-check on every push to `develop` and PR to `main`.
- Test files, `.claude/skills/`, `planning/`, and `documentation/` are excluded from secret scanning.

## Core Stack

- Nuxt 3 (Vue 3) with file-based routing
- Pinia for state management (no direct mutations in components — bypasses devtools tracking, makes state changes untraceable)
- Supabase PostgreSQL + Auth + Storage
- Nitro for API endpoints (`/server/api/**`)
- TypeScript strict mode, TailwindCSS

## Architecture

```
Page → Composable (useXxx) → Pinia Store → Supabase/API
```

**Three layers:**

1. **Composables** - Fetch data, orchestrate logic, return refs/computed
2. **Stores** - Centralized state, getters, actions (mutate here only)
3. **Components** - UI only, consume composables and stores

## Directories

```
pages/             # File-based routing
components/        # Auto-imported by domain
composables/       # Domain-organized (useSchools, useInteractions, etc.)
stores/            # Pinia stores
server/api/        # Nitro endpoints
types/             # TypeScript definitions
utils/             # Utilities and validators
```

## API Endpoints

Nitro auto-routes by file path:

- `server/api/schools/[id]/fit-score.get.ts` → `GET /api/schools/:id/fit-score`
- `server/api/athlete/phase/advance.post.ts` → `POST /api/athlete/phase/advance`

Call via: `$fetch('/api/endpoint', { method: 'POST', body: {...} })`

## Composables Pattern

Return `{ data: ref, loading: ref, error: ref, fetchData }`. Try/catch with user-friendly errors. onMounted for auto-fetch.

## Multi-Step Workflows

Track states: sentItems (I initiated), receivedItems (sent to me), pendingItems (awaiting confirmation), completedItems (done).

**Notifications:** Step 2 (HIGH to next actor), Step 3 (MEDIUM to both). Include `action_url`. Don't block on failure.

## Settings Page Pattern

Organize by action: 1) Pending Confirmations (amber), 2) Received Invitations (blue), 3) Sent Invitations (gray), 4) Completed (green). Separate card components per state.

## Database & Common Patterns

@claude/database.md

## Logging

@claude/logging.md

## Code Quality

- **TypeScript**: Strict mode, no `any` (except tests), `as const` for enums. When a type fix would cascade to 50+ files, prefer targeted `as SomeType` casts or narrowing at the call site — do not chase the root cause through the entire codebase in a single pass.
- **Vue**: `<script setup>`, `withDefaults(defineProps<{}>(), {})`, `defineEmits<{}>()`
- **Styling**: TailwindCSS utilities only, component-scoped `<style scoped>` when needed
- **Naming**: Composables `useXxx`, Stores `useXxxStore`, Components `PascalCase`, Pages `kebab-case`

## Commands

```bash
npm run dev              # http://localhost:3000
npm run build            # Production build
npm run lint:fix         # Auto-fix ESLint + Prettier
npm run type-check       # TypeScript errors
npm run test             # Unit tests (Vitest)
npm run test:ui          # Vitest interactive UI
npm run test:e2e         # Playwright E2E tests
npm run test:e2e:ui      # Playwright interactive UI
```

## Build & Compilation

Fix ALL errors in single pass before rebuilding. Batch fixes together.

## Verification

**Tests passing ≠ code working. Run the thing.**

- [ ] `npm run type-check`, `npm run lint`, `npm run test` pass
- [ ] For new/changed API routes: `npm run dev` → `curl` the endpoint, check response shape
- [ ] For UI changes: open in browser → no blank screen, data loads, no console errors
- [ ] `git push` succeeds (hooks pass)

## Testing

@claude/testing.md

## Deployment

- **Host**: Vercel (from `main` branch)
- **Build**: `npm run build`
- **Publish**: `.vercel/output/`
- **Env vars**: Set in Vercel project dashboard
- **Runtime**: Node.js (serverless functions for API routes)

## Orient Before Acting

Before starting any feature work — web or iOS — spend 60 seconds orienting:

1. **Confirm the feature exists** — grep both codebases for the feature name:
   ```bash
   grep -ril "[feature]" pages/ components/ composables/ server/api/ --include="*.{ts,vue}"
   grep -ril "[feature]" /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-ios --include="*.swift"
   ```
2. **Confirm you have the right one** — if multiple matches, read the most relevant file before proceeding. Do not assume feature identity from the name alone (e.g., "Profile" and "About" are different features).
3. **Check for a prior spec** — `ls planning/iOS_SPEC_*` before generating a new iOS spec.

This 60-second check prevents the most common wrong-approach failure: starting work on the wrong feature or the already-completed version of a feature.

## iOS / SwiftUI

@claude/ios.md

## Learnings

See [planning/lessons.md](./planning/lessons.md) for evolving patterns, recurring issues, and anti-patterns discovered during development.
