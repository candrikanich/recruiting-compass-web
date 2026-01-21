# Copilot Instructions for Recruiting Compass

**Project**: Baseball Recruiting Tracker | Nuxt 3 + Vue 3 + Supabase + TypeScript

## Quick Start Commands

```bash
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Build for production (SSG)
npm run lint:fix         # Fix ESLint + Prettier violations
npm run type-check       # Verify TypeScript compilation
npm run test             # Run unit/integration tests (Vitest)
npm run test:ui          # Interactive test UI
npm run test:e2e         # Playwright E2E tests (requires dev server on port 3003)
```

## Architecture Layers (Three-Tier Pattern)

This codebase strictly follows a composable-store-component separation:

1. **Components** (`/components`) - Render UI only, NO business logic
2. **Composables** (`/composables`) - Handle data fetching, async operations, orchestration
3. **Stores** (`/stores`) - Centralized state mutations (Pinia)

**Data Flow**: `Component` → `useXxxx()` (composable) → `useXxxStore()` (Pinia store) → `Supabase`

### When to Use What

- **Composable**: Always use `useSupabase()` for Supabase queries, orchestrate with refs/computed, return reactive state
- **Store**: Persist state across page navigation; provide getters for derived data; actions for mutations only
- **Component**: Bind store getters to template, call composable functions on events, never mutate state directly

**Anti-pattern**: Calling `$fetch()` directly in components or mutating store state outside actions.

## Composable Organization & Patterns

**Core Infrastructure** (singleton/setup composables):
- `useSupabase()` - Singleton Supabase client (ALWAYS use for DB queries, never import directly)
- `useAuth()` - Authentication state & flows
- `useAuthFetch()` - Authenticated HTTP requests with token refresh (use for external APIs)
- `useErrorHandler()` - Centralized error logging and user feedback

**Domain-Specific Data Composables** (organized by entity):

*Schools (recruiting targets)*:
- `useSchools()` - School CRUD, filtering, ranking, matching
- `useSchoolMatching()` - Fit score calculation (90+ lines business logic)
- `useSchoolLogos()` - Logo fetching with caching (TTL: 7 days)

*Coaches (recruiting contacts)*:
- `useCoaches()` - Coach CRUD, availability, responsiveness tracking
- `useCoachAnalytics()` - Metrics by coach (response time, engagement)
- `useCoachAvailability()` - Seasonal availability windows

*Interactions (communication logging)*:
- `useInteractions()` - CRUD, filtering by type/direction/date
- `useInteractionAttachments()` - File uploads with Supabase Storage
- `useCommunication()` - SMS/Email templates & sending
- `useCommunicationTemplates()` - Template management & variables

*Offers & Opportunities*:
- `useOffers()` - Offer tracking, scholarship comparisons
- `useScholarshipCalculator()` - ROI calculations

*Performance Tracking*:
- `usePerformance()` - Metric logging (stats, tournaments, games)
- `usePerformanceAnalytics()` - Aggregation & trend analysis
- `usePhaseCalculation()` - Recruiting phase progression (showcase → recruit → committed)

*Documents & Reports*:
- `useDocuments()` - Highlight film, recruiting materials
- `useDocumentSharing()` - Collaboration & permissions
- `useReports()` - CSV/PDF export of recruiting data

*Search & Filtering*:
- `useSearch()` - Global search across coaches/schools
- `useEntitySearch()` - Specialized entity lookups
- `useCachedSearch()` - Search results caching
- `useSearchFilters()` - Persistent filter state

*External Data & Caching*:
- `useCollegeData()` - College Scorecard API integration
- `useCollegeScorecardCache()` - Cache scores by college (24hr TTL)
- `useNcaaLookup()` - NCAA database lookups
- `useNcaaCache()` - Cache NCAA results (persistent)
- `useCollegeAutocomplete()` - Real-time college suggestions

*Advanced Features*:
- `useEvents()` - Tournament/showcase tracking
- `useFitScore()` - Multi-factor fit scoring
- `useStatusScore()` - Athlete recruiting status
- `useFollowUpReminders()` - Automatic reminder scheduling
- `useSocialMedia()` - Social profile linking & tracking
- `useNotifications()` - Toast/alert UI notifications
- `useOnboarding()` - First-time user experience
- `useUserPreferences()` - User settings persistence

**When adding new features**:
1. Group related composables (don't create one per API endpoint)
2. Extract shared logic (e.g., caching, error handling) into utilities
3. Keep composables focused: data fetching, state management, or calculation—not all three
4. Use `useSupabase()` for all Supabase calls (DO NOT create new Supabase client instances)
5. Document complex business logic with JSDoc comments

## Supabase Integration

**Prefer the Query Service Layer** (`utils/supabaseQuery.ts`) over raw Supabase calls:

```typescript
// ✅ PREFERRED: Use query service layer (Phase 1 refactor)
import { querySelect, queryInsert, querySingle, isQuerySuccess } from '~/utils/supabaseQuery'

const { data: coaches, error } = await querySelect<Coach>(
  'coaches',
  {
    select: 'id, first_name, last_name, email',
    filters: { school_id: schoolId },
    order: { column: 'last_name', ascending: true }
  },
  { context: 'fetchCoaches' }
)

if (error) {
  console.error(error.message)
  return
}

// ❌ OLD: Direct Supabase queries (being deprecated)
const { data, error } = await supabase
  .from('coaches')
  .select('id, first_name, last_name, email')
  .eq('school_id', schoolId)
  .order('last_name', { ascending: true })
```

**Query Service Layer Functions**:
- `querySelect<T>()` - Fetch multiple records with filtering, ordering, limits
- `querySingle<T>()` - Fetch single record; throws if not found
- `queryInsert<T>()` - Insert one or more records; returns created data
- `queryUpdate<T>()` - Update records matching filters
- `queryDelete()` - Delete records matching filters
- `isQuerySuccess()` - Type guard to check if query succeeded
- `isQueryError()` - Type guard to check if query failed

**Benefits**:
- ✅ Centralized error logging (console + context)
- ✅ Type-safe responses
- ✅ Consistent error messages
- ✅ Easy to test (mock single location)
- ✅ Debug context included in logs

## State Management (Pinia)

**Key stores**: `useUserStore`, `useCoachStore`, `useSchoolStore`, `useInteractionStore`, `usePerformanceStore`

**Pattern** (from [stores/coaches.ts](stores/coaches.ts)):
```typescript
export const useCoachStore = defineStore('coaches', {
  state: () => ({ coaches: [], filters: { schoolId: undefined }, isFetched: false }),
  getters: {
    coachesBySchool: (state) => (id: string) => state.coaches.filter(c => c.school_id === id),
    filteredCoaches: (state) => state.coaches.filter(c => /* apply filters */),
  },
  actions: {
    async fetchCoaches(schoolId: string) {
      if (this.isFetchedBySchools[schoolId]) return  // Guard: prevent duplicate requests
      this.loading = true
      try {
        this.coaches = await $fetch(`/api/coaches/${schoolId}`)
        this.isFetchedBySchools[schoolId] = true
      } finally { this.loading = false }
    },
    setFilters(filters: Partial<CoachFilters>) {
      this.filters = { ...this.filters, ...filters }  // Merge, never replace
    }
  }
})
```

**Rules**:
- Never mutate state outside actions
- Use getters for derived/filtered data
- Add `isFetched` flags to prevent N+1 queries
- Components call `coachStore.setFilters()` then read `coachStore.filteredCoaches` getter

## Component Patterns

**File location**: `/components/[Domain]/ComponentName.vue`

**Structure** (from composables/stores):
```vue
<script setup lang="ts">
const schoolStore = useSchoolStore()
const { fetchSchools } = useSchools()

onMounted(async () => {
  await fetchSchools()
})
</script>

<template>
  <div>
    <div v-for="school in schoolStore.filteredSchools" :key="school.id">
      {{ school.name }}
    </div>
  </div>
</template>
```

**Rules**:
- Use `<script setup>` + Composition API only
- Avoid direct state mutations; call store actions
- Prop types: `withDefaults(defineProps<{ schoolId: string }>(), {})`
- Keep component logic in composables
- Auto-import works for components (no explicit import needed)

## File-Based Routing & API Routes

### Pages & Dynamic Routes

- **Pages**: `/pages/[route].vue` auto-maps to `/[route]`
- **Dynamic routes**: `/pages/schools/[id].vue` → `/schools/:id` (access via `useRoute().params.id`)
- **Nested routes**: `/pages/coaches/[schoolId]/[coachId].vue` → `/coaches/:schoolId/:coachId`
- **Catch-all**: `/pages/[...slug].vue` matches any unmatched path (use for 404 fallback)

### Nitro API Endpoints

**File-based routing**: Path maps directly to URL
- `server/api/schools.get.ts` → `GET /api/schools`
- `server/api/schools/[id].get.ts` → `GET /api/schools/:id`
- `server/api/schools/[id]/fit-score.post.ts` → `POST /api/schools/:id/fit-score`
- `server/api/coaches/search.get.ts` → `GET /api/coaches/search`

**Endpoint pattern** (from existing code):
```typescript
// server/api/schools/[id]/fit-score.post.ts
export default defineEventHandler(async (event) => {
  // 1. Auth guard - verify user owns resource
  const user = await requireAuth(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // 2. Parse & validate request body
  const body = await readBody(event)
  const { athleticFit, academicFit, opportunityFit, personalFit } = body
  
  // 3. Query database via Supabase
  const supabase = useSupabase()
  const { data: school, error: schoolError } = await supabase
    .from('schools')
    .select('id, user_id')
    .eq('id', event.context.params.id)
    .eq('user_id', user.id)  // Ownership check
    .single()

  if (schoolError || !school) {
    throw createError({ statusCode: 404, message: 'School not found' })
  }

  // 4. Execute business logic
  const fitScore = calculateFitScore({ athleticFit, academicFit, opportunityFit, personalFit })

  // 5. Update & return
  const { data, error: updateError } = await supabase
    .from('schools')
    .update({ fit_score: fitScore.score, fit_score_data: fitScore.breakdown })
    .eq('id', school.id)
    .select()
    .single()

  if (updateError) {
    throw createError({ statusCode: 500, message: 'Failed to save fit score' })
  }

  return { success: true, data }
})
```

**HTTP Methods**:
- `.get.ts`, `.post.ts`, `.put.ts`, `.delete.ts`, `.patch.ts`
- Access via `$fetch('/api/endpoint', { method: 'POST', body: {...} })`

**Request handling**:
```typescript
const query = getQuery(event)           // ?foo=bar
const body = await readBody(event)      // POST body (JSON)
const headers = getHeader(event, 'auth') // Specific header
```

**Response handling**:
```typescript
// Success: return object (auto-serialized to JSON)
return { data: result, success: true }

// Error: throw createError
throw createError({ 
  statusCode: 400, 
  statusMessage: 'Bad Request',
  data: { field: 'email', message: 'Invalid format' }
})

// Redirect
await sendRedirect(event, '/new-url', 301)

// Stream binary (for exports)
setHeader(event, 'Content-Type', 'application/pdf')
send(event, pdfBuffer)
```

### Client Consumption of API Routes

From components or composables:
```typescript
// GET request
const { data, pending, error } = await $fetch('/api/coaches', {
  method: 'GET',
  query: { schoolId: 'school-123' }
})

// POST request
const result = await $fetch('/api/schools/[id]/fit-score', {
  method: 'POST',
  body: { athleticFit: 30, academicFit: 20, opportunityFit: 15, personalFit: 10 }
})

// Error handling
try {
  await $fetch('/api/data')
} catch (error) {
  if (error.data?.statusCode === 401) console.log('Unauthorized')
  if (error.data?.statusCode === 404) console.log('Not found')
}
```

## Testing Strategy

### Unit Tests (Vitest)

**Test setup** (from [tests/unit/composables/useCoaches.spec.ts](tests/unit/composables/useCoaches.spec.ts)):
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCoachStore } from '~/stores/coaches'

describe('useCoachStore', () => {
  let coachStore: ReturnType<typeof useCoachStore>
  beforeEach(() => {
    setActivePinia(createPinia())
    coachStore = useCoachStore()
  })
  it('should fetch coaches', async () => {
    // Mock supabase
    mockSupabase.from.mockReturnValue(mockQuery)
    await coachStore.fetchCoaches('school-1')
    expect(coachStore.coaches).toHaveLength(1)
  })
})
```

**Mock pattern**: Mock `useSupabase()` with chained query methods (`select().eq().order()`)

**Mocking Supabase queries**:
```typescript
const mockQuery = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: {...}, error: null }),
  order: vi.fn().mockReturnThis(),
}

vi.mock('~/composables/useSupabase', () => ({
  useSupabase: () => ({
    from: vi.fn().mockReturnValue(mockQuery)
  })
}))
```

**Composable tests**: Test refs, computed properties, and async functions in isolation
**Store tests**: Test actions, getters, state mutations independently
**Component tests**: Mount with mocked composables/stores; test user interactions

### E2E Tests (Playwright)

**Runs against**: Dev server on port 3003
**File location**: `/tests/e2e/`

```typescript
import { test, expect } from '@playwright/test'

test('should create a coach', async ({ page }) => {
  await page.goto('/coaches')
  await page.fill('[data-testid="coach-name"]', 'John Smith')
  await page.click('[data-testid="create-btn"]')
  await expect(page.locator('text=John Smith')).toBeVisible()
})
```

**Debugging E2E tests**:
```bash
npm run dev                    # Start app on http://localhost:3003
npm run test:e2e:ui           # Run Playwright in UI mode
# Click into test to debug step-by-step
```

**Local vs. CI**:
- Local: Chromium only, no retries (fast feedback)
- CI: All 3 browsers (Chromium, Firefox, WebKit), 2 retries (stability)

### Run Tests Before Committing

```bash
npm run type-check    # TypeScript errors must be 0
npm run lint          # ESLint warnings/errors must be 0
npm run test          # Unit tests must pass
npm run test:e2e      # E2E tests should pass
```

## Advanced Patterns & Workflows

### Authenticated HTTP Requests (useAuthFetch)

Use `useAuthFetch()` for external APIs that require JWT token + refresh flow:

```typescript
const useMyExternalAPI = () => {
  const { $fetch: authFetch } = useAuthFetch()
  
  const fetchData = async () => {
    try {
      // Token is automatically injected; refreshed if expired
      const data = await authFetch('/external-api/data', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })
      return data
    } catch (error) {
      // 401 triggers automatic refresh, then retries
      if (error.response?.status === 403) {
        console.error('Forbidden - insufficient permissions')
      }
    }
  }
  
  return { fetchData }
}
```

**When to use**:
- NCAA database API lookups
- College Scorecard API (requires API key in header)
- Any external service requiring authentication

### CSRF Protection

Nitro provides CSRF protection automatically for state-changing endpoints:

```typescript
// POST/PUT/DELETE endpoints automatically include CSRF validation
// Client automatically includes CSRF token from Set-Cookie

// In composables that call state-changing endpoints:
const createCoach = async (data: CoachData) => {
  const result = await $fetch('/api/coaches', {
    method: 'POST',
    body: data
    // CSRF token injected automatically by Nitro
  })
  return result
}
```

**No manual CSRF handling needed** - Nitro handles it transparently.

### Document Sharing & Permissions

Use `useDocumentSharing()` for managing who can view/edit documents:

```typescript
const { documents, shareDocument, revokeAccess } = useDocumentSharing()

// Share document with another user
await shareDocument('doc-123', 'user-456', 'view')  // 'view' or 'edit'

// Revoke access
await revokeAccess('doc-123', 'user-456')

// Check if user can edit
const canEdit = (doc) => doc.shared_by?.includes(currentUser.id) || doc.owner_id === currentUser.id
```

**Storage**: Documents stored in Supabase Storage (filesystem-like) + permissions table

### File Uploads with Attachments

Use `useFormValidation()` for all file and form validation (Phase 1 refactor):

```typescript
// ✅ UNIFIED VALIDATION: Form + Files
const { validate, validateFile, errors, fileErrors } = useFormValidation()

// Form validation
const formSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})

const validated = await validate(formData, formSchema)
if (!validated) {
  console.log(errors.value) // Show to user
  return
}

// File validation
try {
  const file = input.files?.[0]
  validateFile(file, 'transcript') // Validates MIME type, extension, size
} catch (err) {
  console.log(err.message) // Show to user
}

// ❌ OLD: Separate validation composables (being consolidated)
const formValidation = useValidation(schema)
const fileValidation = useDocumentValidation() // Deprecated
```

**Validation Features**:
- Form validation via Zod schemas
- File type validation (MIME types + extensions)
- File size limits per document type
- Configurable rules in `FILE_VALIDATION_RULES`
- Batch file validation
- Type-safe error handling

**Supported Document Types**:
- `highlight_video` - MP4, MOV, AVI (up to 500MB)
- `transcript` - PDF, TXT (up to 10MB)
- `resume` - PDF, DOC, DOCX (up to 5MB)
- `rec_letter` - PDF (up to 5MB)
- `stats_sheet` - CSV, XLS, XLSX (up to 10MB)
- `attachment` - Common documents/images (up to 10MB)

## Performance & Caching Patterns

### NCAA Cache (Persistent)

Cache NCAA lookups locally; never expires (NCAA data is static):

```typescript
// composables/useNcaaCache.ts
const useNcaaCache = () => {
  const cached = ref<Record<string, NcaaTeam>>({})
  
  const lookup = async (teamId: string) => {
    // Check cache first
    if (cached.value[teamId]) return cached.value[teamId]
    
    // Fetch from API
    const team = await useNcaaLookup().fetch(teamId)
    
    // Store in cache + localStorage
    cached.value[teamId] = team
    localStorage.setItem(`ncaa-${teamId}`, JSON.stringify(team))
    
    return team
  }
  
  return { lookup, cached }
}
```

**Use when**: Looking up college names, NCAA divisions, conference memberships

### College Scorecard Cache (24hr TTL)

College data changes periodically; cache with 24-hour expiration:

```typescript
// composables/useCollegeScorecardCache.ts
const useCollegeScorecardCache = () => {
  const cache = new Map<string, { data: any; expires: number }>()
  
  const fetch = async (collegeId: string) => {
    const cached = cache.get(collegeId)
    
    if (cached && Date.now() < cached.expires) {
      return cached.data
    }
    
    // Fetch fresh data
    const data = await $fetch(`/api/colleges/${collegeId}`)
    
    // Cache for 24 hours
    cache.set(collegeId, {
      data,
      expires: Date.now() + 24 * 60 * 60 * 1000
    })
    
    return data
  }
  
  return { fetch }
}
```

**Use when**: Fetching admission rates, enrollment, academic stats, location

### Cached Search (Debounced + Memoized)

Global search uses debouncing + result caching to avoid redundant queries:

```typescript
// composables/useCachedSearch.ts
const useCachedSearch = () => {
  const query = ref('')
  const results = ref<SearchResult[]>([])
  const cache = new Map<string, SearchResult[]>()
  let timeoutId: ReturnType<typeof setTimeout>
  
  const search = (q: string) => {
    // Check cache first
    if (cache.has(q)) {
      results.value = cache.get(q)!
      return
    }
    
    // Debounce: cancel previous request
    clearTimeout(timeoutId)
    query.value = q
    
    // Wait 300ms for user to stop typing
    timeoutId = setTimeout(async () => {
      const res = await $fetch('/api/search', { query: { q } })
      cache.set(q, res)
      results.value = res
    }, 300)
  }
  
  return { query, results, search }
}
```

**Use when**: Auto-complete, global search across coaches/schools

### Store-Level Caching with isFetched Guards

Always check `isFetched` flags before fetching to prevent duplicate requests:

```typescript
// In store actions
async fetchCoaches(schoolId: string) {
  // Guard: prevent N+1 queries
  if (this.isFetchedBySchools[schoolId]) {
    return this.coachesBySchool(schoolId)
  }
  
  this.loading = true
  try {
    const coaches = await $fetch(`/api/schools/${schoolId}/coaches`)
    this.coaches.push(...coaches)
    this.isFetchedBySchools[schoolId] = true
  } finally {
    this.loading = false
  }
}
```

**Pattern**:
- Track `isFetched` (boolean) or `isFetchedBySchools` (map)
- Check guard before each fetch
- Set flag after successful fetch
- Clear flags on refresh/logout

## Code Quality Standards

**TypeScript**: Strict mode enforced, no `any` except in tests
- Interfaces for data models: `interface Coach { id: string; name: string }`
- Use `as const` for enum-like values

**Styling**: TailwindCSS utilities only, no arbitrary CSS
- Global styles in `assets/css/main.css`
- Component-scoped `<style scoped>` when necessary

**Naming**:
- Composables: `useXxxName` (e.g., `useSchools`, `useCoachAnalytics`)
- Stores: `useXxxStore` (e.g., `useSchoolStore`)
- Components: PascalCase domain prefix (e.g., `CoachCard`, `SchoolSearch`)
- API endpoints: kebab-case verbs (e.g., `schools/[id]/fit-score.post.ts`)

## Environment & Config

**Required env vars** (`.env.local`):
```env
NUXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NUXT_PUBLIC_COLLEGE_SCORECARD_API_KEY=your_key
```

**Access in code**: `useRuntimeConfig().public.supabaseUrl`

## Common Pitfalls & Solutions

| Issue | Solution |
|-------|----------|
| "Supabase not defined" error | Always use `useSupabase()` composable, never import client directly |
| Store state not updating | Never mutate state outside actions; call actions from components |
| N+1 query problem | Check `isFetched` / `isFetchedBySchools` guard before fetching |
| Component re-rendering too much | Use `storeToRefs()` to destructure store getters (maintains reactivity) |
| Type errors in Supabase queries | Import types from `~/types/models`; use `.select()` with explicit columns |
| Tests failing with "module not found" | Mock composables in test setup; use `vi.mock()` at top of test file |

## Deployment

- **Target**: Netlify (from `main` branch)
- **Build**: `npm run build` (SSG to `.nuxt/dist`)
- **Post-build**: `scripts/create-index.js` generates file index
- **Environment**: Set secrets in Netlify UI (not `.env.local`)

## Large Codebase Notes

- **60+ composables**: New features should consolidate related logic (don't create new composables for every endpoint)
- **Test coverage gaps**: Legacy composables lack tests; prioritize new features with tests
- **Domain organization**: Components grouped by domain (`/Coach`, `/School`, `/Interaction`) to avoid naming collisions
- **Complex calculations**: `useSchoolMatching`, `useFitScore`, `usePhaseCalculation` contain business logic - read before refactoring

## Phase 1 & Phase 2 Refactoring: Migration Guide

**Status**: Phase 1 Complete | Phase 2 In Progress | **Branch**: `refactor/phase-1-query-validation-layer`

### Phase 2: Composable Consolidation (NEW)

**Completed:**
- ✅ Query service layer (`utils/supabaseQuery.ts`)
- ✅ Unified validation (`composables/useFormValidation.ts`)
- ✅ Consolidated documents (`composables/useDocumentsConsolidated.ts`)
- ✅ Consolidated search (`composables/useSearchConsolidated.ts`)
- ✅ API documentation guide (`API_ENDPOINT_DOCUMENTATION.md`)

**New Consolidated Composables:**

1. **useDocumentsConsolidated()** - Unified document management
   - Replaces: `useDocumentFetch`, `useDocumentUpload`, `useDocumentSharing` (gradual migration)
   - Provides: CRUD operations, file uploads, version management, sharing/permissions
   - Features: Integrated with `useFormValidation` for file validation, query service layer
   - Migration: Old composables still available; new code uses consolidated version
   
   ```typescript
   // Before (split across 3 composables)
   const { documents, fetchDocuments } = useDocumentFetch()
   const { uploadDocument } = useDocumentUpload()
   const { shareDocument } = useDocumentSharing()
   
   // After (consolidated)
   const { documents, fetchDocuments, uploadDocument, shareDocument } = useDocumentsConsolidated()
   ```

2. **useSearchConsolidated()** - Unified search with filtering & caching
   - Replaces: `useEntitySearch`, `useSearchFilters`, `useCachedSearch` (gradual migration)
   - Provides: Multi-entity search (schools, coaches, interactions, metrics), filtering, debouncing, result caching
   - Features: Fuzzy search via Fuse.js, integrated filters, cache TTL (5min), auto re-search on filter change
   - Migration: Old composables still available; new code uses consolidated version
   
   ```typescript
   // Before (split across 3 composables)
   const { performSearch, schoolResults } = useEntitySearch()
   const { filters, applyFilter } = useSearchFilters()
   const { getSchoolSuggestions } = useCachedSearch()
   
   // After (consolidated)
   const { 
     performSearch, 
     schoolResults, 
     filters, 
     applyFilter, 
     getSchoolSuggestions 
   } = useSearchConsolidated()
   ```

### Phase 1 Refactoring: Migration Guide

**Status**: Complete | **Branch**: `refactor/phase-1-query-validation-layer`

### New Files (Use These)

1. **`utils/supabaseQuery.ts`** - Query service layer for all Supabase operations
   - Replace raw `supabase.from().select()` calls with `querySelect()`, `querySingle()`, etc.
   - Provides unified error handling and logging
   - Type-safe results with `isQuerySuccess()` guard

2. **`composables/useFormValidation.ts`** - Unified form + file validation
   - Consolidates `useValidation()` (Zod form validation)
   - Consolidates `useDocumentValidation()` (file type/size validation)
   - Single composable for all validation needs

### Deprecated Files (Don't Use)

- ❌ `useValidation()` → Use `useFormValidation()` instead
- ❌ `useDocumentValidation()` → Use `useFormValidation().validateFile()` instead
- ⚠️ `useDocuments()` (wrapper) → Will be consolidated in Phase 2

### Migration Examples

**Before (Direct Supabase)**:
```typescript
// composables/useCoaches.ts
const coaches = ref([])
const error = ref(null)

const fetchCoaches = async (schoolId: string) => {
  try {
    const { data, err } = await supabase
      .from('coaches')
      .select('*')
      .eq('school_id', schoolId)
    
    if (err) throw err
    coaches.value = data
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error'
  }
}
```

**After (Query Service)**:
```typescript
// composables/useCoaches.ts
import { querySelect } from '~/utils/supabaseQuery'

const coaches = ref([])
const error = ref(null)

const fetchCoaches = async (schoolId: string) => {
  const { data, error: err } = await querySelect<Coach>(
    'coaches',
    { filters: { school_id: schoolId } },
    { context: 'fetchCoaches' }
  )
  
  if (err) {
    error.value = err.message
    return
  }
  
  coaches.value = data
}
```

**Benefits**:
- ✅ 30% less boilerplate per composable
- ✅ Consistent error handling
- ✅ Automatic console logging
- ✅ Type-safe results

## References

- [CLAUDE.md](../CLAUDE.md) - Extended guidance for Claude/Copilot
- [README.md](../README.md) - Project overview & setup
- [SCHOOL_TESTING_PLAN.md](../SCHOOL_TESTING_PLAN.md) - Test architecture
- [BUILD_IMPLEMENTATION_GUIDE.md](../BUILD_IMPLEMENTATION_GUIDE.md) - Feature implementation patterns
