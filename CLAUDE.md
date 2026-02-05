# CLAUDE.md

**The Recruiting Compass** — Nuxt 3 web app (Vue 3, TypeScript, Supabase)

## Workflow

- **Plan mode first** (Shift+Tab twice): Iterate on plan before auto-accept
- **Verify work**: Run `npm test`, `npm run type-check` after code changes
- **Format on commit**: PostToolUse hook auto-formats all edits

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

```typescript
export const useMyFeature = () => {
  const data = ref<MyType[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchData = async () => {
    loading.value = true;
    try {
      data.value = await $fetch("/api/my-data");
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Unknown error";
    } finally {
      loading.value = false;
    }
  };

  onMounted(fetchData);
  return { data, loading, error, fetchData };
};
```

## Multi-Step Workflows

For sequential workflows (send invitation → accept → confirm):

```typescript
export const useMultiStepFeature = () => {
  const sentItems = ref<Item[]>([]);        // I initiated
  const receivedItems = ref<Item[]>([]);    // Sent to me
  const pendingItems = ref<Item[]>([]);     // Awaiting my confirmation
  const completedItems = ref<Item[]>([]);   // Finalized

  const initiateAction = async (email: string) => { /* Step 1 */ };
  const acceptAsReceiver = async (token: string) => { /* Step 2 */ };
  const confirmAsInitiator = async (itemId: string) => { /* Step 3 */ };
  const determineRelationship = (initiatorRole: string, receiverRole: string) => {};

  return { sentItems, receivedItems, pendingItems, completedItems, ... };
};
```

**Notifications:** Trigger at step 2 (HIGH priority to next actor) and step 3 (MEDIUM to both). Include `action_url` for relevant management page. Don't block workflow if notification fails.

## Settings Page Pattern

Organize by action (what user can DO), not state:

```vue
<!-- Section 1: User must take action (amber=warning) -->
<section v-if="pendingConfirmations.length">
  <h2>⚠️ Pending Confirmations</h2>
  <ConfirmationCard v-for="item in pendingConfirmations" />
</section>

<!-- Section 2: Awaiting user response (blue=received) -->
<section v-if="receivedInvitations.length">
  <h2>📨 Received Invitations</h2>
  <PendingInvitationCard v-for="item in receivedInvitations" />
</section>

<!-- Section 3: User initiated, others responding (gray=sent) -->
<section v-if="sentInvitations.length">
  <h2>⏳ Sent Invitations</h2>
  <SentInvitationCard v-for="item in sentInvitations" />
</section>

<!-- Section 4: Completed (green=done) -->
<section v-if="completedItems.length">
  <h2>✅ Completed</h2>
  <CompletedCard v-for="item in completedItems" />
</section>
```

Use separate card components for each state. Only show relevant action buttons per user role.

## Supabase & Database

**Client:** Always use `useSupabase()` composable (singleton):

```typescript
const supabase = useSupabase();
const { data } = await supabase
  .from("coaches")
  .select("id, first_name, last_name")
  .eq("school_id", schoolId);
```

**Schema changes:** Add columns as nullable, separate data migration into second step. Use CHECK constraints for enum-like VARCHAR fields instead of PostgreSQL enums.

**Types:** Generated in `types/database.ts` from schema. Regenerate after migrations: `npx supabase gen types typescript --local > types/database.ts`

## Code Quality

- **TypeScript**: Strict mode, no `any` (except tests), `as const` for enums
- **Vue**: `<script setup>`, `withDefaults(defineProps<{}>(), {})`, `defineEmits<{}>()`
- **Styling**: TailwindCSS utilities only, component-scoped `<style scoped>` when needed
- **Naming**: Composables `useXxx`, Stores `useXxxStore`, Components `PascalCase`, Pages `kebab-case`

## Common Patterns

- **State mutation**: Only in Pinia actions, never in components
- **Error handling**: Always try/catch async operations, set error state explicitly
- **N+1 queries**: Use `.select()` with specific columns, batch fetch related data, cache in stores
- **Component auto-import**: No import needed for `/components/**`
- **Supabase connection**: Verify `.env.local`, check project isn't paused

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

## Verification Requirements

Before marking code complete:

- [ ] `npm run type-check` passes (no TypeScript errors)
- [ ] `npm run lint` passes (no linting errors)
- [ ] `npm run test` passes (unit tests)
- [ ] Browser test: Changes work as expected in UI
- [ ] `git push` succeeds (pre-commit hooks pass)

## Bug-Driven TDD

When a bug is discovered:

1. **Write a failing test** that reproduces the bug
   - Test should fail with the current code
   - Include comments explaining what the bug was
   - Place test in the appropriate `*.spec.ts` file

2. **Fix the code** to make the test pass
   - Minimal fix for root cause only
   - Don't refactor or add extra features

3. **Verify the test passes** and doesn't break other tests
   - Run full test suite: `npm run test`
   - Ensure coverage doesn't decrease

**Benefits:**

- Prevents regression (bug won't come back)
- Increases test coverage incrementally
- Documents the bug for future developers
- Proves the fix actually works

**Example:** School deletion failing due to missing `family_unit_id` filter in `fetchCoaches` → Added test for `family_unit_id` filter → Fixed `fetchCoaches` → Test passes

## Deployment

- **Host**: Vercel (from `main` branch)
- **Build**: `npm run build`
- **Publish**: `.vercel/output/`
- **Env vars**: Set in Vercel project dashboard
- **Runtime**: Node.js (serverless functions for API routes)

## Learnings

Track evolving patterns discovered in code reviews and PR feedback. Update during PR process when you find recurring issues, gotchas, or anti-patterns.

- (Add learnings as they emerge)
