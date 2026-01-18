# Performance Optimization Testing Strategy

## Overview
This document outlines the testing approach for 5 critical performance optimizations implemented in Nuxt composables. These optimizations focus on database query efficiency and reduce client-side processing.

## Testing Philosophy

### Approach: Unit Testing with Mock Verification
We use **unit tests with deep mock verification** rather than integration tests because:

1. **Composables are isolated** - They interact with Supabase through a mocked interface
2. **Performance gains are deterministic** - We can verify the exact SQL operations executed
3. **Maintainability** - Mocked tests run fast and don't depend on database state
4. **Regression detection** - Tests catch if code reverts to slower patterns

### Key Principle: Assert the Query Chain
Instead of trying to measure actual performance (which is flaky in tests), we verify the **query structure itself**:

- For batch upsert: Assert single `.upsert()` call instead of loop
- For N+1 prevention: Assert single `.in()` query instead of multiple `.eq()` calls
- For SQL filtering: Assert `.gte()` and `.lte()` are chained before data is returned

## Performance Optimization Details

### 1. useSchools.updateRanking() - Batch Upsert
**Optimization:** Single `.upsert()` call with array of updates (28x faster than loop)

**What to test:**
- Verify `upsert()` is called once with all schools
- Verify each school has `ranking: index + 1`
- Verify `updated_at` and `updated_by` are included
- Verify local state updates correctly

**Anti-pattern to catch:**
- Multiple individual `.update()` calls in a loop (performance regression)
- Missing `onConflict: 'id'` option

---

### 2. useCoaches.fetchCoachesBySchools() - N+1 Query Prevention
**Optimization:** Single `.in('school_id', schoolIds)` query instead of fetching each school separately

**What to test:**
- Verify `.in('school_id', schoolIds)` is called with correct array
- Verify only requested fields are selected (projection)
- Verify ordering by school_id then last_name (for consistent grouping)
- Verify empty array input returns empty coaches list

**Anti-pattern to catch:**
- Multiple `.eq('school_id', ...)` calls in a loop
- Fetching all coach fields unnecessarily
- Not handling empty school IDs array

---

### 3. useInteractions.fetchInteractions() - SQL Date Filtering
**Optimization:** Date range filters moved to SQL (`.gte()` and `.lte()`) instead of fetching all data and filtering client-side

**What to test:**
- Verify `.gte('occurred_at', startDate)` filters lower bound
- Verify `.lte('occurred_at', endDate)` filters upper bound
- Verify filters are applied correctly when dates are provided
- Verify filters can be omitted safely

**Anti-pattern to catch:**
- Client-side array filtering on large datasets
- Fetching all interactions then filtering (10x more data transfer)
- Incorrect date field name or comparison operator

---

### 4. useEvents.fetchEvents() - SQL Date Filtering
**Optimization:** Date range filters moved to SQL instead of client-side filtering

**What to test:**
- Verify `.gte('start_date', startDate)` filters lower bound
- Verify `.lte('start_date', endDate)` filters upper bound
- Verify user_id constraint is applied
- Verify date parsing converts strings to ISO format

**Anti-pattern to catch:**
- Client-side filtering after fetching all events
- Missing user_id constraint
- Incorrect date field (should be `start_date` not `created_at`)

---

### 5. usePerformance.fetchMetrics() - SQL Date Filtering
**Optimization:** Date range filters moved to SQL instead of client-side filtering

**What to test:**
- Verify `.gte('recorded_date', startDate)` filters lower bound
- Verify `.lte('recorded_date', endDate)` filters upper bound
- Verify user_id constraint is applied
- Verify proper sorting by recorded_date DESC

**Anti-pattern to catch:**
- Client-side filtering instead of SQL filters
- Missing user_id constraint
- Incorrect date field name

---

## Mock Strategy

### Mock Setup Pattern
```typescript
// Create a chainable query mock
const mockQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
}

// Chain methods return mockQuery for fluent API
Object.keys(mockQuery).forEach(key => {
  mockQuery[key].mockReturnValue(mockQuery)
})

// Final resolution
mockQuery.select.mockResolvedValue({ data: testData, error: null })
```

### Data Factory Pattern
Use factory functions to create consistent test data:
```typescript
const createMockSchool = (overrides = {}): School => ({
  id: 'school-1',
  user_id: 'user-123',
  name: 'Test University',
  ranking: 1,
  // ... other fields
  ...overrides,
})
```

## Test File Organization

### File Structure
```
tests/unit/composables/
├── useSchools.performance.spec.ts      (updateRanking batch upsert tests)
├── useCoaches.performance.spec.ts      (fetchCoachesBySchools N+1 prevention)
├── useInteractions.performance.spec.ts (date filtering optimization)
├── useEvents.performance.spec.ts       (date filtering optimization)
└── usePerformance.performance.spec.ts  (date filtering optimization)
```

### Test Naming Convention
```typescript
describe('useSchools - Performance Optimizations', () => {
  describe('updateRanking()', () => {
    it('should batch update all rankings in single upsert call', () => {
      // Verify single upsert() call
    })

    it('should include ranking index for each school', () => {
      // Verify index + 1 = ranking
    })
  })
})
```

## Coverage Goals

### Batch Upsert (useSchools)
- Verify single `.upsert()` call with full array
- Verify ranking calculation (index + 1)
- Verify timestamp and user tracking fields
- Error handling when upsert fails
- Edge cases: empty array, single school, duplicate schools

### N+1 Prevention (useCoaches)
- Verify single `.in()` call with school IDs array
- Verify field projection (not selecting unnecessary columns)
- Verify empty array handling
- Verify ordering consistency
- Error handling when query fails

### Date Filtering (3 composables)
- Verify `.gte()` and `.lte()` are chained correctly
- Verify date string to ISO format conversion
- Verify filters are optional and omitted safely
- Verify filters work in combination
- Error handling for invalid dates
- Edge cases: same start/end date, boundary dates

## Regression Testing

These tests prevent regressions where code reverts to slower patterns:

1. **Batch Upsert Regression:** If someone changes back to a loop of `.update()` calls, tests will catch it
2. **N+1 Regression:** If coach fetching goes back to individual queries per school, tests fail
3. **Date Filter Regression:** If date filtering moves back to client-side, the mock assertions fail

## Running Tests

```bash
# Run all performance optimization tests
npm run test -- performance.spec

# Run with coverage
npm run test:coverage -- performance.spec

# Watch mode during development
npm run test -- --watch performance.spec
```

## Future Enhancements

1. **Performance Benchmarks:** Could add optional real timing assertions in integration tests
2. **Query Cost Analysis:** Could log mock Supabase query costs
3. **E2E Performance:** Could measure actual page load times with these optimizations enabled
