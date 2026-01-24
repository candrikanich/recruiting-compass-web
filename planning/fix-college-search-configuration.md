# Plan: Fix College Search Configuration Issue

## Problem Statement

When adding a new school and entering text in the school name field, an error appears: **"College Search is not configured. Please enter the school manually."**

This prevents the College Scorecard API from being used for school autocomplete and college data lookup.

## Root Cause Analysis

### Current State

1. Environment variable `NUXT_PUBLIC_COLLEGE_SCORECARD_API_KEY` is defined in `.env.example` (line 7)
2. The variable is **NOT** exposed in `nuxt.config.ts` runtime config
3. Runtime config (lines 53-58) only includes:
   - `supabaseUrl`
   - `supabaseAnonKey`
   - ❌ Missing: `collegeScorecardApiKey`

### Impact

- `composables/useCollegeAutocomplete.ts` (line 10): tries to read `config.public.collegeScorecardApiKey` → gets `undefined`
- `composables/useCollegeData.ts` (lines 87-90, 155-158): same issue
- Both composables check for falsy `apiKey` and return the error message
- School autocomplete feature is disabled
- College data enrichment (tuition, admission rates, etc.) is unavailable

### Affected Components

- `components/School/SchoolAutocomplete.vue` - autocomplete search
- `components/School/SchoolForm.vue` - form with college scorecard display
- `pages/schools/new.vue` - add new school page
- Both composables mentioned above

## Solution

### Fix (Single Change)

Add `collegeScorecardApiKey` to the runtime config public object in `nuxt.config.ts`:

**File:** `nuxt.config.ts` (lines 53-58)

**Change:**

```typescript
runtimeConfig: {
  public: {
    supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || "",
    supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || "",
    collegeScorecardApiKey: process.env.NUXT_PUBLIC_COLLEGE_SCORECARD_API_KEY || "",
  },
},
```

### Verification Steps

1. Ensure `.env.local` has `NUXT_PUBLIC_COLLEGE_SCORECARD_API_KEY` set (should already exist)
2. Restart dev server: `npm run dev`
3. Navigate to add new school page (`/schools/new`)
4. Type in school name field (3+ characters)
5. Verify autocomplete dropdown appears with college results
6. Verify college data loads without "not configured" error

## Files to Change

- **Primary:** `nuxt.config.ts` (add 1 line to runtime config)

## Files Already Correct

- `composables/useCollegeAutocomplete.ts` - logic is correct
- `composables/useCollegeData.ts` - logic is correct
- `.env.example` - has the variable defined
- All components using these composables - no changes needed

## Implementation Order

1. Edit `nuxt.config.ts` to add the missing runtime config entry
2. Restart dev server
3. Test the school search flow manually
4. Run E2E tests to ensure no regressions

## Testing

- Manual test: Add new school with autocomplete search
- E2E: `npm run test:e2e -- tests/e2e/search-workflows.spec.ts`
- Type checking: `npm run type-check`
- Linting: `npm run lint`

## Risk Assessment

- **Risk Level:** Very Low
- **Change Scope:** Single configuration line
- **Breaking Changes:** None (only enables existing functionality)
- **Dependencies:** None (uses existing environment variable pattern)
