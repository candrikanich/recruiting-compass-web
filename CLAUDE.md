# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Baseball Recruiting Tracker** is a Nuxt 3 web application for managing college baseball recruiting interactions, built with Vue 3, TypeScript, TailwindCSS, and Supabase backend.

## Common Development Commands

```bash
# Development
npm run dev              # Start dev server on http://localhost:3000

# Building
npm run build           # Build for production + post-build script
npm run preview         # Preview production build locally

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Auto-fix ESLint issues
npm run type-check      # Run TypeScript type checking
npm run format          # Format code with Prettier

# Testing
npm run test            # Run Vitest (unit tests)
npm run test:ui         # Run Vitest with interactive UI
npm run test:coverage   # Run Vitest with coverage report
npm run test:e2e        # Run Playwright E2E tests
npm run test:e2e:ui     # Run Playwright with interactive UI
```

### Running Individual Tests

```bash
# Run single Vitest file
npm run test -- tests/unit/composables/useSearch.spec.ts

# Run tests matching a pattern
npm run test -- --grep "coach"

# Run E2E tests for specific file
npm test:e2e -- tests/e2e/coaches.spec.ts
```

## Architecture & Code Organization

### Core Stack

- **Framework**: Nuxt 3 (Vue 3) with file-based routing
- **State Management**: Pinia (lightweight, minimal ceremony)
- **Backend**: Supabase PostgreSQL + Auth + Storage
- **API**: Nitro (auto-routes in `/server/api`)
- **Styling**: TailwindCSS + PostCSS
- **Database**: PostgreSQL via Supabase

### Key Directories

```
├── pages/              # File-based routing (automatic route generation)
├── components/         # Vue components (auto-imported, scoped per domain)
├── composables/        # Vue 3 composables with reusable logic
├── stores/             # Pinia stores for state management
├── server/api/         # Nitro API endpoints (auto-routed)
├── middleware/         # Route and server middleware
├── types/              # TypeScript type definitions
├── utils/              # Utility functions and validators
├── assets/css/         # Global CSS and theme
└── tests/              # Unit, integration, and E2E tests
```

### Data Flow Patterns

```
Page Component
  ↓
Composable (useXxx) ← Logic, async operations, data fetching
  ↓
Pinia Store ← Centralized state, persist/share across components
  ↓
Supabase Client / API Endpoint ← External data source
```

**Three-layer principle:**
1. **Composables** (useXxx) - Fetch data, orchestrate logic, return refs/computed
2. **Stores** (Pinia) - Centralized state, getters, actions for mutations
3. **Components** - Consume composables and stores, handle UI/events only

### State Management (Pinia)

Stores define state shape, getters, and actions. Key stores:

- `useCoachStore` - Coaches by school, filtering, CRUD
- `useSchoolStore` - School lookup, caching, filtering
- `useInteractionStore` - Interaction history, logging
- `usePerformanceStore` - Metrics, analytics
- `useUserStore` - Auth user state

Actions handle all mutations; components read from getters. Avoid direct state mutation in components.

### API Structure

Nitro API endpoints at `/server/api/**` follow file-based routing:
- `server/api/schools/[id]/fit-score.get.ts` → `GET /api/schools/:id/fit-score`
- `server/api/suggestions/index.get.ts` → `GET /api/suggestions`
- `server/api/athlete/phase/advance.post.ts` → `POST /api/athlete/phase/advance`

Client calls via `$fetch('/api/endpoint', { method: 'POST', body: {...} })`.

### Composables Pattern

Composables return refs, computed properties, and async functions. Example:

```typescript
export const useMyFeature = () => {
  const data = ref<MyType[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchData = async () => {
    loading.value = true
    try {
      data.value = await $fetch('/api/my-data')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error'
    } finally {
      loading.value = false
    }
  }

  onMounted(fetchData)

  return { data, loading, error, fetchData }
}
```

Used in components:
```typescript
const { data, loading, fetchData } = useMyFeature()
```

## Configuration & Environment

### Environment Variables

Create `.env.local` in project root with:

```env
NUXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NUXT_PUBLIC_COLLEGE_SCORECARD_API_KEY=your_api_key_here
NUXT_PUBLIC_DEBUG_MODE=false
```

Runtime config accessed via `useRuntimeConfig()` in composables/API endpoints.

### Key Configuration Files

- `nuxt.config.ts` - Nuxt framework config, CSS imports, runtime config
- `tailwind.config.js` - TailwindCSS customization
- `tsconfig.json` - TypeScript compiler options
- `eslint.config.js` - Linting rules (ESLint 9 flat config format)
- `vitest.config.ts` - Unit test config with happy-dom environment
- `playwright.config.ts` - E2E test config, runs against dev server

## Code Quality Standards

### TypeScript

- Strict mode enforced; no `any` types except in tests
- Interfaces for data models, types for function signatures
- Use `as const` for enum-like values

### Vue Components

- Use `<script setup>` syntax (Composition API)
- Define props with `withDefaults(defineProps<{...}>(), {...})`
- Emit types with `defineEmits<{...}>()`
- Return reactive state explicitly from composables

### Styling

- TailwindCSS utility classes only; avoid arbitrary CSS
- Component-scoped styles in `<style scoped>` when needed
- Global styles in `assets/css/main.css`

### Testing

**Unit tests** (Vitest): Test composables, stores, utilities in isolation
**Integration tests**: Test composable + store interactions
**E2E tests** (Playwright): Test user flows across pages

Unit test setup file: `tests/setup.ts`
E2E baseURL: `http://localhost:3003`

### Naming Conventions

- **Composables**: `useXxxName` (e.g., `useSchools`, `useCoachAnalytics`)
- **Stores**: `useXxxStore` (e.g., `useCoachStore`)
- **Components**: PascalCase with domain prefix (e.g., `CoachCard`, `SchoolSearch`)
- **Pages**: kebab-case following file path (e.g., `/pages/schools/[id].vue` → `/schools/:id`)
- **Utilities**: camelCase descriptive names

## Common Patterns & Gotchas

### Supabase Client Initialization

Always use `useSupabase()` composable - ensures singleton client:

```typescript
const supabase = useSupabase()
const { data, error } = await supabase.from('coaches').select('*')
```

### Error Handling

Always wrap async operations in try/catch; set error state:

```typescript
try {
  data.value = await fetchData()
} catch (e) {
  error.value = e instanceof Error ? e.message : 'Unknown error'
  console.error(error.value)
}
```

### Avoiding N+1 Queries

- Use `.select()` with specific columns only
- Batch fetch related entities in a single query when possible
- Cache results in Pinia stores to prevent redundant queries

### Component Auto-Import

Components under `/components` are auto-imported by Nuxt; no explicit import needed:

```vue
<template>
  <CoachCard :coach="coach" />  <!-- auto-imported -->
</template>
```

### Reactive State in Stores

Mutate state only in store actions. Never modify state directly in components:

```typescript
// ❌ Wrong - direct mutation
coachStore.coaches.push(newCoach)

// ✅ Right - use action
await coachStore.createCoach(schoolId, coachData)
```

## Testing Guidelines

### Vitest Unit Tests

- Located in `tests/unit/`
- Test composables, stores, utilities in isolation
- Use `happy-dom` environment (no real browser)
- Memory optimizations for CI (2 max workers, isolated tests)

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useMyComposable } from '~/composables/useMyComposable'

describe('useMyComposable', () => {
  it('should return expected value', () => {
    const { data } = useMyComposable()
    expect(data.value).toBe('expected')
  })
})
```

### Playwright E2E Tests

- Located in `tests/e2e/`
- Test user interactions across pages
- Runs against dev server on port 3003
- Retries 2x in CI, no retry locally

```typescript
import { test, expect } from '@playwright/test'

test('should create a coach', async ({ page }) => {
  await page.goto('/coaches')
  await page.fill('[data-testid="coach-name"]', 'John Smith')
  await page.click('[data-testid="create-btn"]')
  await expect(page.locator('text=John Smith')).toBeVisible()
})
```

### Running Tests Before Committing

Run all checks before committing:

```bash
npm run type-check    # TypeScript errors must be 0
npm run lint          # ESLint warnings/errors must be 0
npm run test          # Unit tests must pass
npm run test:e2e      # E2E tests should pass
```

## Deployment

Deployed to **Netlify** from `main` branch:
- Build command: `npm run build`
- Publish directory: `.nuxt/dist`
- Environment variables: Set in Netlify UI

Post-build script (`scripts/create-index.js`) generates index for static files.

## Supabase & Database

### Connection

Client initialized once in `useSupabase()` composable; reused across app via singleton pattern.

### Query Patterns

```typescript
// Select with filters
const { data } = await supabase
  .from('coaches')
  .select('id, first_name, last_name, email')
  .eq('school_id', schoolId)
  .order('last_name', { ascending: true })

// Insert with return
const { data: newCoach, error } = await supabase
  .from('coaches')
  .insert([{ ...coachData }])
  .select()
  .single()

// Update specific fields
await supabase
  .from('coaches')
  .update({ responsiveness_score: 8.5 })
  .eq('id', coachId)
```

### Type Definitions

Database types defined in `types/database.ts` (generated from Supabase schema). Update when schema changes.

## Debugging & Troubleshooting

### Type Errors

```bash
npm run type-check   # See all TypeScript errors
# Fix in editor or use `npm run lint:fix`
```

### Linting Errors

```bash
npm run lint:fix     # Auto-fix ESLint issues (Prettier + rules)
```

### Tests Failing

```bash
npm run test:ui      # Run tests in interactive UI
# Or run single test:
npm run test -- tests/unit/composables/useSearch.spec.ts
```

### E2E Test Debugging

```bash
npm run dev                    # Start app on http://localhost:3003
npm run test:e2e:ui           # Run Playwright in UI mode
# Click into test to debug step-by-step
```

### Supabase Connection Issues

- Verify `.env.local` has correct URL and anon key
- Check Supabase project is active (not paused)
- Test connection: `const supabase = useSupabase(); console.log(supabase)`

## Git Workflow

- Create feature branch from `main`: `git checkout -b feature/my-feature`
- Commit frequently with descriptive messages (conventional commits)
- Run all checks before pushing: type-check, lint, tests, E2E
- Create PR to `main`; merge after review

## Notes for Future Development

- **Composable proliferation**: Many composables (60+); consolidate related logic if it grows further
- **Test coverage gaps**: Some legacy composables lack tests; prioritize new features
- **Component structure**: Organize by domain (Coach/, School/, Interaction/) to avoid naming collisions
- **Store patterns**: Avoid direct state mutation; always use actions for consistency
- **API layer**: Consider creating service functions if API calls become complex
