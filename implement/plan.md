# Implementation Plan: Fix TypeScript Type Errors for CI

**Created**: 2026-02-02
**Target**: Re-enable type-check in GitHub Actions test pipeline

## Analysis Summary

### Root Cause Identified

The type errors fall into distinct categories:

1. **Composable Return Type Issue** (0 errors - actually working fine!)
   - `useActiveFamily()` returns typed object with all expected properties
   - Components correctly use: `activeFamily.getAccessibleAthletes()`, `switchAthlete()`, `isParent`, `activeAthleteId`, `parentAccessibleFamilies`
   - **Status**: No changes needed - composable is correctly typed

2. **Store Type Gaps** (1 error in PrivateNotesCard.vue)
   - File expects `isAdmin` getter on user store
   - User store has `isParent`, `isAthlete` but missing `isAdmin`
   - **Fix**: Add `isAdmin` getter to user store

3. **Component Pattern Issues** (3 errors in DuplicateSchoolDialog.vue)
   - Using `emit()` instead of `$emit()`
   - Vue 3 Composition API requires `defineEmits()` helper
   - **Fix**: Add `defineEmits()` and change `emit` calls to `$emit`

4. **Icon Import Error** (1 error in ProfileEditHistory.vue)
   - `HistoryIcon` not exported from `@heroicons/vue/24/outline`
   - **Fix**: Find correct icon name or use alternative

5. **Database Schema Mismatches** (2 errors in SchoolMapWidget.vue)
   - `home_location` missing from user profile type
   - Appears to be stored in preferences, not user table
   - **Fix**: Update component to read from correct location

6. **Type Safety Issues** (28+ errors)
   - Date constructor receiving `string | undefined`
   - Function parameter implicit any types
   - Interaction type mismatch ("twitter" vs actual enum)
   - String array vs string type mismatch
   - **Fix**: Add proper null checks and type guards

## Implementation Tasks

- [x] **Task 1**: Add `isAdmin` getter to user store - DONE
- [x] **Task 2**: Fix DuplicateSchoolDialog emit patterns (change emit to $emit) - DONE
- [x] **Task 3**: Fix icon imports (ClockIcon, XMarkIcon) - DONE
- [x] **Task 4**: Export UseActiveFamilyReturn type for injected composable - DONE
- [x] **Task 5**: Add type annotations to inject() calls - DONE
- [ ] **Task 6**: Fix remaining 15 component type errors (see checkpoint)
- [ ] **Task 7**: Run full type-check to verify all fixed
- [ ] **Task 8**: Re-enable type-check in .github/workflows/test.yml
- [ ] **Task 9**: Commit all changes

## Progress Update

**Completed**: 5 tasks
**Remaining**: 4 tasks
**Component errors fixed**: 10/25
**Status**: Ready for handoff - all low-hanging fruit resolved

The remaining 15 component errors are straightforward fixes ready for next session.

## Affected Files

### Priority 1 (Store/Component Logic)

- `stores/user.ts` - Add isAdmin getter
- `components/School/DuplicateSchoolDialog.vue` - Fix emit patterns
- `components/Settings/ProfileEditHistory.vue` - Fix icon import

### Priority 2 (Schema Issues)

- `components/Dashboard/SchoolMapWidget.vue` - Fix home_location access
- `components/Dashboard/ContactFrequencyWidget.vue` - Fix Date type safety
- `components/Dashboard/CoachFollowupWidget.vue` - Fix interaction type

### Priority 3 (Edge Cases)

- `components/School/DocumentUploadModal.vue` - Fix string array type
- `components/Help/HelpModal.vue` - Fix parameter type
- `components/Dashboard/AthleteActivityWidget.vue` - Fix type inference

### Configuration

- `.github/workflows/test.yml` - Re-enable type-check step

## Validation Checklist

- [ ] All type errors resolved
- [ ] `npm run type-check` passes
- [ ] All tests still passing: `npm run test`
- [ ] No new errors introduced
- [ ] Changes committed with clear messages
- [ ] CI pipeline configured correctly

## Rollback Strategy

If issues arise:

1. Git commit `037714f` has clean state (after artifact cleanup)
2. Can revert to that point and take different approach
3. Session state preserved in `implement/state.json`
