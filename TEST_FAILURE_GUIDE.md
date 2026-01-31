# Test Failure Analysis & Fix Guide

## Summary
- **New tests**: 15/15 passing ✅
- **Existing tests**: 2773 passing, 57 failing ⚠️
- **Root cause**: Existing tests not mocking `useActiveFamily` and not setting user role to "student"

## Why Tests Are Failing

The following composables now require:
1. **User role = "student"** - For `useSchools.createSchool()`, `useInteractions.createInteraction()`
2. **Active family context** - For all data queries to be family-scoped

### Example Failure
```
useSchools.spec.ts: "should create a new school"
Error: User not authenticated or family not loaded
  at createSchool (composables/useSchools.ts:138)
```

This happens because:
- Test sets user but doesn't set `role: "student"`
- Test doesn't mock `useActiveFamily`, so `activeFamilyId.value` is null

## Fix Pattern

### Step 1: Add useActiveFamily mock
```typescript
vi.mock("~/composables/useActiveFamily", () => ({
  useActiveFamily: () => ({
    activeFamilyId: { value: "family-123" },
    activeAthleteId: { value: "athlete-123" },
    isParentViewing: { value: false },
    familyMembers: { value: [] },
    getAccessibleAthletes: () => [],
    switchAthlete: vi.fn(),
    loading: { value: false },
    error: { value: null },
  }),
}));
```

### Step 2: Update user setup in beforeEach
```typescript
beforeEach(() => {
  vi.clearAllMocks();
  setActivePinia(createPinia());
  userStore = useUserStore();

  // Add role and other required fields
  userStore.user = {
    id: "user-123",
    email: "test@example.com",
    role: "student",  // ← Required for interactions/schools
    full_name: "Test User",
  } as any;

  // ... rest of setup
});
```

## Files Requiring Updates

### High Priority (Direct test failures)
1. **tests/unit/composables/useSchools.spec.ts**
   - Mock useActiveFamily
   - Set user.role = "student"
   - 1 failing test

2. **tests/unit/composables/useInteractions.spec.ts**
   - Mock useActiveFamily
   - Set user.role = "student"
   - 56 failing tests

### Medium Priority (Related components)
3. **tests/unit/composables/useCoaches.spec.ts**
   - May need useActiveFamily mock
   - Check if tests use family-scoped queries

## Quick Fix Checklist

- [ ] Add `vi.mock("~/composables/useActiveFamily", ...)` to failing test files
- [ ] Update `beforeEach` to set `userStore.user.role = "student"`
- [ ] Ensure mock provides `activeFamilyId.value` = valid UUID
- [ ] Run `npm run test` to verify all tests pass
- [ ] Commit fix with message: `fix(tests): update mocks for family unit context`

## Testing the Fix

After making changes to one test file:
```bash
# Test single file
npm run test -- tests/unit/composables/useSchools.spec.ts

# Test all if verified
npm run test
```

Expected result: `2830 passing, 0 failing` (after all fixes)

## Implementation Effort
- **Estimated time**: 30-45 minutes
- **Files to change**: 3 main test files
- **Pattern**: Same mock setup for all files
- **Complexity**: Low - copy/paste pattern with minor adjustments

## Notes
- These are NOT regressions in the new code
- The new family unit context is working correctly
- Tests just need to mock this new dependency
- All new tests (15) are passing ✅
