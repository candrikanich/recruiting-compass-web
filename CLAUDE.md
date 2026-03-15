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
- Pinia for state management (no direct mutations in components)
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

## Supabase & Database

**Client:** Use `useSupabase()` singleton. Select specific columns, filter with `.eq()`.

**Schema:** Add columns as nullable, separate migration. Use CHECK constraints for enums (not PG enums).

**Types:** `npx supabase gen types typescript --local > types/database.ts` after migrations

## Logging

**In API routes (Nitro handlers):** Always use `useLogger(event, "context")` as the first line inside `defineEventHandler`. This captures the correlation ID and request context automatically:

```typescript
import { useLogger } from "~/server/utils/logger";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "feature/route-name");
  try {
    logger.info("Fetching data");
    return result;
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err; // re-throw H3 first
    logger.error("Failed to fetch data", err);
    throw createError({ statusCode: 500, statusMessage: "Failed to fetch data" });
  }
});
```

**Context name convention:** Match the API route path — e.g., `"tasks"`, `"family/members"`, `"auth/verify-email"`.

**Never expose raw `error.message`** in `statusMessage` — use generic strings.

**Log levels:**
- `logger.error` — unexpected failures (DB errors, unhandled exceptions)
- `logger.warn` — expected but notable conditions (data not found, business rule blocks)
- `logger.info` — meaningful events (request processed, action completed)
- `logger.debug` — verbose data useful only during development

**Correlation IDs flow automatically:** client session ID → `useAuthFetch` injects `X-Request-ID` → correlation middleware reads it → `useLogger(event)` includes it in every log entry.

**Background/cron jobs** (no H3Event available): use `createLogger("cron/job-name")` at module level.

## Code Quality

- **TypeScript**: Strict mode, no `any` (except tests), `as const` for enums. When a type fix would cascade to 50+ files, prefer targeted `as SomeType` casts or narrowing at the call site — do not chase the root cause through the entire codebase in a single pass.
- **Vue**: `<script setup>`, `withDefaults(defineProps<{}>(), {})`, `defineEmits<{}>()`
- **Styling**: TailwindCSS utilities only, component-scoped `<style scoped>` when needed
- **Naming**: Composables `useXxx`, Stores `useXxxStore`, Components `PascalCase`, Pages `kebab-case`

## Common Patterns

- **State mutation**: Only in Pinia actions, never in components
- **Error handling**: Always try/catch async operations, set error state explicitly
- **N+1 queries**: Use `.select()` with specific columns, batch fetch related data, cache in stores
- **Component auto-import**: No import needed for `/components/**`
- **Supabase connection**: Verify `.env.local`, check project isn't paused

### Cascade-Delete Pattern

1. Try simple delete (fast path) 2. Catch FK errors ("Cannot delete", "violates foreign key") 3. Fall back to `/api/[entity]/[id]/cascade-delete` (children first, `confirmDelete: true`) 4. Return `{ cascadeUsed: boolean }` for UX messaging 5. CSRF token required (ensure client uses `useAuthFetch` which auto-injects the token)

**Security:** Use `family_unit_id` for access control (not `user_id`)

**Entities:** schools, coaches, interactions

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

**TDD red-phase:** Before implementing, confirm the test actually fails for the right reason (missing feature, not a typo). A test that passes immediately proves nothing.

**Convert manual findings:** If manual testing reveals a bug, write a failing test reproducing it before fixing it.

## Bug-Driven TDD

Write failing test → Fix code (minimal) → Verify passes. Prevents regression, increases coverage.

## Testing Philosophy

Never write tests that verify what the TypeScript type system already guarantees. Test runtime behavior, business logic, and edge cases — not type constraints.

## Testing After Refactoring

Run full test suite immediately after extracting components. Fix broken element references.

## Deployment

- **Host**: Vercel (from `main` branch)
- **Build**: `npm run build`
- **Publish**: `.vercel/output/`
- **Env vars**: Set in Vercel project dashboard
- **Runtime**: Node.js (serverless functions for API routes)

## iOS / SwiftUI

- Only use APIs and modifiers that actually exist in the target framework version. For SwiftUI, verify any unfamiliar modifier exists before using it. Do not hallucinate APIs like `.accessibilityLiveRegion()`. When unsure, use a Bash command to search Apple documentation or the project's existing usage patterns.
- **xcconfig files are gitignored — always edit `project.pbxproj`**: Many `.xcconfig` files are gitignored and will never reach CI. Before editing any xcconfig, run `git check-ignore -v <file>`. If gitignored, apply the build setting change to `project.pbxproj` instead. Find the right location with `grep -n "SETTING_NAME" TheRecruitingCompass.xcodeproj/project.pbxproj`.
- **Always update both Debug and Release configurations**: Build settings in `project.pbxproj` appear in multiple configuration blocks. After any pbxproj change, verify both configs are consistent: `grep -A2 -B2 "YOUR_SETTING" TheRecruitingCompass.xcodeproj/project.pbxproj`. Patching only Debug causes Release (what CI builds) to fail.
- **Verify Swift feature flag names exactly — never guess**: Wrong flag variant is the #1 cause of multi-round CI fix sessions. Always grep existing project settings first: `grep -r "enable-experimental\|ExperimentalFeature" TheRecruitingCompass.xcodeproj/` before applying any compiler flag fix.

## iOS Simulator Troubleshooting

When the simulator behaves unexpectedly during builds or UI tests, work through this ladder in order:

**Simulator won't boot / shuts down mid-test:**
```bash
sudo xcrun simctl shutdown all
xcrun simctl erase all          # full reset — clears all simulator state
xcrun simctl boot "iPhone 16"   # boot a known-good device
```

**SPM resolution failures or DerivedData corruption:**
```bash
rm -rf ~/Library/Developer/Xcode/DerivedData
rm -rf ~/Library/Caches/org.swift.swiftpm
# Then re-open project and let SPM re-resolve
```

**`xcodebuild` destination not found:**
Try destinations in this order until one works:
```bash
-destination 'generic/platform=iOS Simulator'
-destination 'platform=iOS Simulator,name=iPhone 16'
-destination 'platform=iOS Simulator,name=iPhone 15'
-destination 'platform=iOS Simulator,OS=latest,name=iPhone 16'
```

**Password autofill eating characters in UI tests:**
iOS autofill silently drops characters from `.newPassword` / `.password` fields during `app.typeText()`. Fix:
```swift
// In the text field under test — use clipboard paste instead of typeText
UIPasteboard.general.string = "testPassword123"
field.tap()
app.menuItems["Paste"].tap()
```
Or set `.textContentType(.none)` on the field in test builds (via `#if DEBUG`).

**UI tests fail locally but pass CI (or vice versa):**
Check simulator locale and keyboard settings — CI uses a clean simulator with no custom keyboards. Ensure tests don't depend on autocorrect, predictive text, or locale-specific formatting.

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

## Learnings

See [planning/lessons.md](./planning/lessons.md) for evolving patterns, recurring issues, and anti-patterns discovered during development.
