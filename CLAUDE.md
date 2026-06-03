# CLAUDE.md

**The Recruiting Compass** — Nuxt 3 web app (Vue 3, TypeScript, Supabase)

Dual codebase: Nuxt/TypeScript web app + SwiftUI iOS app. iOS work: web app spec/implementation = source of truth. Web work: no touch iOS files unless asked.

## Read Before You Touch (progressive disclosure)

Tier-0 (this file) is always loaded. Read the matching file FIRST before working in that domain:

| Touching... | Read first |
|---|---|
| Supabase, migrations, queries, cascade-delete | `claude/database.md` |
| `server/api/**` — logging, error handling | `claude/logging.md` |
| Writing tests | `claude/testing.md` |
| Invite / confirm / multi-step flows + settings pages | `claude/patterns/multi-step-workflows.md` |
| Deploying, build/runtime config | `claude/deployment.md` |
| Commit blocked by hook, `.secrets.baseline` | `claude/git-hooks.md` |
| iOS / SwiftUI (rare here) | `claude/ios.md` |
| Any UI code | `docs/design/tokens.md`, `docs/design/components.md` |

## Workflow

- **Plan mode first** (Shift+Tab twice): iterate plan before auto-accept
- **Verify work**: run `npm test`, `npm run type-check` after code changes
- **Format on commit**: PostToolUse hook auto-formats edits
- **End of multi-phase session**: create handoff doc in `/planning/` (done, remaining, test status, known issues)

## Core Stack

- Nuxt 3 (Vue 3), file-based routing
- Pinia state (no direct mutations in components — bypasses devtools tracking, makes changes untraceable)
- Supabase PostgreSQL + Auth + Storage
- Nitro API endpoints (`/server/api/**`)
- TypeScript strict mode, TailwindCSS

## Architecture

```
Page → Composable (useXxx) → Pinia Store → Supabase/API
```

1. **Composables** — fetch data, orchestrate logic, return refs/computed
2. **Stores** — centralized state, getters, actions (mutate here only)
3. **Components** — UI only, consume composables and stores

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

## UI Code (enforced by `npm run audit:tokens`)

Read `docs/design/tokens.md` + `docs/design/components.md` before any UI work. Enforced rules:

- Never raw hex (`#3b82f6`) or `rgba(...)` in `<style>` blocks or inline `style=`
- Use CSS variables from `theme.css` or Tailwind brand utilities (`bg-brand-blue-600`, `text-brand-slate-700`)
- Chart.js/canvas configs need raw hex — add `// audit-ignore` on those lines
- Use `<DesignSystem*>` components for empty/loading/error states — don't build inline

## Code Quality

- **TypeScript**: strict mode, no `any` (except tests), `as const` for enums. Type fix cascading to 50+ files → prefer targeted `as SomeType` casts or call-site narrowing — don't chase root cause through whole codebase in one pass.
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

## Build & Verification

Fix ALL errors in single pass before rebuilding. Batch fixes.

**Tests passing ≠ code working. Run the thing.**

- [ ] `npm run type-check`, `npm run lint`, `npm run test` pass
- [ ] New/changed API routes: `npm run dev` → `curl` endpoint, check response shape
- [ ] UI changes: open in browser → no blank screen, data loads, no console errors
- [ ] `git push` succeeds (hooks pass)

## Orient Before Acting

Before any feature work — spend 60 seconds:

1. **Confirm feature exists** — grep for the feature name:
   ```bash
   grep -ril "[feature]" pages/ components/ composables/ server/api/ --include="*.{ts,vue}"
   grep -ril "[feature]" /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-ios --include="*.swift"
   ```
2. **Confirm right one** — multiple matches → read most relevant file first. Don't assume identity from name (e.g., "Profile" ≠ "About").
3. **Check for prior spec** — `ls planning/iOS_SPEC_*` before generating new iOS spec.

## Testing

@claude/testing.md

## Learnings

See [planning/lessons.md](./planning/lessons.md) for evolving patterns, recurring issues, anti-patterns.
