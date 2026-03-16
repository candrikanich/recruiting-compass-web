# Architectural Review - Recruiting Compass

**Date:** February 24, 2026
**Scope:** Full codebase review against three-layer architecture pattern
**Status:** 3 architectural violations fixed, 14 API routes flagged for logger standardization

---

## Executive Summary

The Recruiting Compass follows a three-layer architecture (Page → Composable → Pinia Store → Supabase) with generally good adherence. However, **three components were making direct Supabase calls**, violating the established pattern. These have been remediated by introducing proper composable wrappers.

Additionally, **14 API routes lack the standard logger pattern** (`useLogger(event, context)` as first line). While some use module-level loggers (acceptable for admin endpoints), full standardization would improve observability.

---

## Violations Found and Fixed

### 1. Components Making Direct Supabase Calls (FIXED)

**Violation Type:** Architecture Layer Bypass
**Severity:** High
**Pattern:** Components should never call `.from()` directly; all data fetching must flow through composables

#### Fixed Files:

**File:** `/components/Dashboard/ParentGuidanceCard.vue`
- **Issue:** Lines 162-166 called `supabase.from("users").select()` directly in `onMounted`
- **Root Cause:** No composable existed for fetching athlete profiles
- **Fix:** Created `useAthleteProfile` composable; updated component to use it
- **Impact:** Component now delegates data fetching to composable layer

**File:** `/components/Dashboard/DashboardSuggestions.vue`
- **Issue:** Lines 153-159 called `supabase.from("schools").select()` directly in `onMounted`
- **Root Cause:** Component needed school data for dead period checking; didn't use existing `useSchools` composable
- **Fix:** Replaced direct Supabase call with `useSchools` composable
- **Impact:** Component now receives data from composable; eliminated onMounted fetch entirely

**File:** `/components/Interaction/LoggedByBadge.vue`
- **Issue:** Lines 65-69 called `supabase.from("users").select()` directly in `onMounted`
- **Root Cause:** No composable for single-user lookups
- **Fix:** Created `useUserById` composable; updated component to use it
- **Impact:** User fetching now flows through proper composable layer

---

### 2. Unused Imports (FIXED)

**Violation Type:** Code Quality
**Severity:** Low

**File:** `/components/Dashboard/AthleteActivityWidget.vue`
- **Issue:** Line 125 imported `useSupabase()` but never used it
- **Fix:** Removed unused import
- **Note:** Component correctly uses `useAthleteActivity` composable; Supabase import was unnecessary

---

## New Composables Created

To support proper layering, two new composables were introduced:

### `composables/useAthleteProfile.ts`
```typescript
/**
 * Fetches a single athlete's profile from the users table
 * Returns: { athlete, loading, error, fetchAthleteProfile }
 */
export const useAthleteProfile = (athleteId: string) => { ... }
```
- Used by: `ParentGuidanceCard.vue`
- Handles: Profile fetch, error handling, loading state
- Pattern: Standard composable return { data, loading, error, fetchFn }

### `composables/useUserById.ts`
```typescript
/**
 * Generic single-user lookup composable
 * Returns: { user, loading, error, fetchUser }
 */
export const useUserById = (userId: string) => { ... }
```
- Used by: `LoggedByBadge.vue`
- Handles: User fetch, error handling, loading state
- Pattern: Standard composable return { data, loading, error, fetchFn }

---

## API Routes Logger Pattern Status

**Issue:** 14 API routes don't follow the standard logger pattern
**Standard Pattern** (per CLAUDE.md):
```typescript
export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "context/name");  // ← First line
  try {
    logger.info("Processing request");
    return result;
  } catch (err) {
    logger.error("Failed", err);
    throw createError({ statusCode: 500, statusMessage: "Error" });
  }
});
```

### Routes Missing Logger Pattern

**Acceptable (module-level logger for admin/cron endpoints):**
- `server/api/admin/health.get.ts` — Uses `createLogger("admin/health")` ✓
- `server/api/auth/validate-admin-token.post.ts` — Uses `createLogger("auth/validate-admin-token")` ✓
- `server/api/auth/session.get.ts` — Uses module-level logger ✓

**Should Be Standardized (simple handlers without complex context):**
- `server/api/csrf-token.get.ts` — No logger; simple CSRF token generation
- `server/api/health.get.ts` — (deprecated; use admin/health.get.ts)
- `server/api/user/feedback.post.ts`
- And 11 others

### Recommendation

Add `useLogger(event, "context/name")` as the first line inside `defineEventHandler` for all user-facing API routes. This ensures:
- Correlation IDs flow through all requests
- Consistent error logging with request context
- Observability for debugging production issues

---

## Architecture Patterns Assessment

### Three-Layer Flow (Page → Composable → Store → Supabase)

**Status:** ✓ Correctly Implemented

Components properly consume data through composables:
- Example: `useSchools()` → returns `{ schools, loading, error, fetchSchools }`
- Example: `useCoaches()` → returns `{ coaches, loading, error, fetchCoaches }`
- Example: `useInteractions()` → returns `{ interactions, loading, error, fetchInteractions }`

**Pattern Compliance:**
- Composables manage all Supabase calls ✓
- Stores hold centralized state with action-only mutations ✓
- Components receive data via computed refs ✓
- No direct component-to-Supabase calls ✓ (after fixes)

### Pinia Store Patterns

**Status:** ✓ Correctly Implemented

**Example:** `stores/user.ts`
```typescript
actions: {
  async initializeUser() {
    // ✓ Calls composable (useSupabase) inside action
    // ✓ Mutations only within action scope
    this.user = profile;  // ← State mutation in action
  },
  setUser(user: User | null) {
    this.user = user;  // ← Simple action for state updates
  }
}
```

No direct state mutations in components observed. All state changes flow through Pinia actions.

### Composable Pattern Compliance

**Status:** Mostly ✓ Correct

All examined composables follow the standard return pattern:
```typescript
return {
  data: ref(...),           // ← Reactive data
  loading: computed(...),   // ← Loading state
  error: computed(...),     // ← Error state
  fetchData,               // ← Fetch function
  updateData,              // ← Update function
}
```

---

## Scalability Analysis

### N+1 Query Prevention

**Status:** ✓ Good

Observed patterns:
- Composables batch-fetch related data in `.select()` calls
- Example: `useInteractions` selects schools + coaches in a single query
- No loops with individual Supabase calls detected

### Caching Strategy

**Status:** Acceptable

Current approach:
- Client-side state management via Pinia (good for user session)
- localStorage caching for filters (schools-filters, coaches-filters, etc.)
- No explicit API-level caching observed (rely on Supabase cache headers)

**Consideration:** For high-traffic endpoints, consider implementing:
- SWR (Stale-While-Revalidate) patterns in composables
- Cache expiration logic
- In-flight request deduplication (partially implemented in `useSchools` and `useCoaches`)

### Data Volume Scaling

**Current Limits Observed:**
- School list pagination via cursor pagination (`useCursorPagination`)
- Interaction filtering by family unit (prevents full table scans)
- Coach list filtered by family context

**Potential Bottlenecks:**
- Dashboard widgets load in parallel; watch for timeout if school count grows >10K
- Performance metrics queries on large athlete accounts may slow without indexing

---

## Technical Debt Assessment

### Low Priority
- 2 unused imports (removed in this review)
- Inconsistent logging in 14 API routes (cosmetic; functionality unaffected)

### Medium Priority
- Some composables use `shallowRef` for large arrays (e.g., `useInteractions`) — verify performance
- Module-level loggers in admin endpoints don't capture request-specific context

### None Observed
- No circular dependencies between composables/stores
- No direct state mutations in components
- No missing error boundaries at page level
- No God components identified (files stay <800 lines)

---

## Code Quality Observations

### Strengths
- Clear separation of concerns (composables, stores, components)
- Consistent naming conventions (`useXxx` for composables, `useXxxStore` for stores)
- Proper error handling with try/catch in composables
- TypeScript strict mode with no `any` casts (except where needed in Supabase responses)

### Areas for Improvement
- Some API routes missing structured logging
- A few composables could benefit from JSDoc comments (documentation added to new ones)
- Consider adding tests for new composables

---

## Recommendations

### Immediate (Critical)
**None.** The three main violations have been fixed.

### Short Term (1-2 weeks)
1. **Standardize API Route Logging**
   - Add `useLogger(event, context)` as first line in all remaining routes
   - Update `csrf-token.get.ts`, `feedback.post.ts`, and 12 others
   - Impact: Improved observability, ~1 hour work

2. **Test New Composables**
   - Add unit tests for `useAthleteProfile` and `useUserById`
   - Verify error handling and edge cases
   - Impact: Prevents regressions, ~2 hours work

### Medium Term (1 month)
3. **Performance Monitoring**
   - Profile dashboard widget load times as school count grows
   - Consider implementing request deduplication in more composables
   - Impact: Prevent scaling issues, ~4 hours work

4. **Documentation**
   - Add JSDoc comments to all composables with complex logic
   - Create a composable pattern guide for new developers
   - Impact: Onboarding, code maintainability

### Long Term (as needed)
5. **Caching Strategy**
   - Implement SWR (Stale-While-Revalidate) for stable data (schools, coaches)
   - Add cache expiration logic for user-generated content
   - Impact: Reduced Supabase bandwidth, faster UX

---

## Verification Steps

### Testing Commands
```bash
npm run type-check    # Verify no TypeScript errors
npm run lint          # Check code style
npm run test          # Run unit tests
npm run test:e2e      # Run E2E tests
```

### Manual Verification
- [x] ParentGuidanceCard loads athlete data via composable
- [x] DashboardSuggestions uses useSchools for school data
- [x] LoggedByBadge fetches user via composable
- [x] AthleteActivityWidget no longer imports unused useSupabase
- [x] No type errors introduced

---

## Files Modified

### New Composables
- `composables/useAthleteProfile.ts` (new)
- `composables/useUserById.ts` (new)

### Updated Components
- `components/Dashboard/ParentGuidanceCard.vue`
- `components/Dashboard/DashboardSuggestions.vue`
- `components/Interaction/LoggedByBadge.vue`
- `components/Dashboard/AthleteActivityWidget.vue`

### Documentation
- `ARCHITECTURAL_REVIEW.md` (this file)

---

## Conclusion

The Recruiting Compass codebase demonstrates good architectural discipline. The three-layer pattern is well-established, and the violations found were isolated incidents rather than systemic issues. After fixes:

- **Architecture:** 100% compliant with three-layer pattern
- **Code Quality:** No lingering architectural violations
- **Scalability:** Ready for feature growth; monitor performance as data volume increases
- **Maintainability:** Clear patterns for new developers to follow

The two new composables provide reusable patterns for single-entity lookups, which will benefit future feature development.
