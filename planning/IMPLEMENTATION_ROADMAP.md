# Test Failure Fix Implementation Roadmap

**Generated:** 2026-01-26
**Total Failures:** 47 tests across 3 categories
**Expected Outcome:** 0 failures

---

## Executive Summary

Three distinct test failure issues have been diagnosed and documented. Each has a detailed fix plan with implementation steps. This roadmap provides the execution sequence and approval checklist.

| Priority | Category | Failures | Complexity | Est. Risk | Plan |
|----------|----------|----------|-----------|-----------|------|
| 1 | Mock Chain Init | 9 | HIGH | LOW | `FIX_PLAN_MOCK_CHAIN.md` |
| 2 | Teleport Rendering | 28 | HIGH | LOW | `FIX_PLAN_EMAIL_MODAL.md` |
| 3 | Date Boundaries | 1 | LOW | LOW | `FIX_PLAN_DATE_BOUNDARY.md` |

---

## Implementation Sequence

### Phase 1: Fix Mock Chain Initialization (FIRST)
**Why first:** Fixes 9 failures that cascade into other test suites
**Time:** ~1-2 hours implementation + testing
**Files affected:** `tests/unit/composables/useInteractions.extended.spec.ts`
**Production impact:** None (test-only change)

**Steps:**
1. Read and approve `FIX_PLAN_MOCK_CHAIN.md`
2. Create mock factory functions
3. Update beforeEach/afterEach hooks
4. Switch from `vi.mock()` to `vi.doMock()`
5. Run tests individually to verify each passes
6. Run full test suite
7. Verify no cross-test mock pollution
8. Commit

**Success criteria:**
- ✓ All 9 tests in `useInteractions.extended.spec.ts` pass
- ✓ No failures in other test files
- ✓ Tests pass in both isolated and suite contexts

---

### Phase 2: Fix Email Modal Teleport (SECOND)
**Why second:** Largest failure category; independent from mock chain
**Time:** ~30-45 minutes implementation + testing
**Files affected:** `tests/unit/components/EmailRecruitingPacketModal.spec.ts`
**Production impact:** None (test-only change)

**Steps:**
1. Read and approve `FIX_PLAN_EMAIL_MODAL.md`
2. Add Teleport mock to test file
3. Verify existing assertions work with mocked Teleport
4. Add `flushPromises()` where needed for Transition timing
5. Run full test suite
6. Verify 30/30 tests pass
7. Consider adding E2E test to verify Teleport works in browser
8. Commit

**Success criteria:**
- ✓ All 30 tests pass
- ✓ Component file unchanged
- ✓ Teleport still works in production

---

### Phase 3: Fix Date Boundary Logic (THIRD)
**Why third:** Single test, lowest impact; can be done last
**Time:** ~20-30 minutes implementation + testing
**Files affected:** `tests/unit/pages/dashboard.spec.ts`
**Production impact:** Verify production code (see plan for details)

**Steps:**
1. Read and approve `FIX_PLAN_DATE_BOUNDARY.md`
2. **REQUIRED:** Inspect production dashboard code to verify timezone handling
3. Update test to use explicit UTC timestamps
4. Add edge case tests (previous/next month, boundaries, fallbacks)
5. Run test individually to verify pass
6. Run full test suite
7. Commit

**Success criteria:**
- ✓ Test passes consistently (multiple runs, same result)
- ✓ Behavior matches production code
- ✓ Edge cases covered

---

## Parallel Work Possible

**After Phase 1 completes**, you can optionally:
- Run Phases 2 and 3 in parallel if working on different machines/branches
- But single developer: sequential is simpler (Phases 1 → 2 → 3)

---

## Pre-Implementation Checklist

Before starting implementation, verify:

- [ ] Understand the three distinct failure categories
- [ ] Read all three fix plans (15-20 minutes each)
- [ ] Identify any questions/clarifications needed
- [ ] Verify you have permission to modify test files
- [ ] Confirm CI/CD setup (tests should run locally and in CI)
- [ ] Back up or commit current state (git stash or branch)

---

## Implementation Validation

### Per-Phase Validation

**After completing each phase:**

1. **Run individual test file:**
   ```bash
   npm run test -- tests/unit/composables/useInteractions.extended.spec.ts
   # Expected: All tests pass
   ```

2. **Run full test suite:**
   ```bash
   npm run test
   # Expected: No new failures; fixed category should pass
   ```

3. **Check for regressions:**
   ```bash
   npm run test:e2e
   # Expected: E2E tests unaffected
   ```

4. **Verify type checking:**
   ```bash
   npm run type-check
   # Expected: No new type errors
   ```

---

## Post-Implementation Validation

### Full Validation Checklist

```bash
# Type checking
npm run type-check
# ✓ 0 errors

# Linting
npm run lint
# ✓ 0 errors

# Unit tests
npm run test
# ✓ All tests pass (47 fewer failures)

# E2E tests
npm run test:e2e
# ✓ All tests pass

# Build verification
npm run build
# ✓ Build succeeds

# Code formatting
npm run format
# ✓ All files properly formatted (or use --check to verify)
```

### Summary After All Fixes

**Before:**
```
Tests:     47 failures across 3 categories
  - EmailRecruitingPacketModal: 28 failures
  - useInteractions.extended: 9 failures
  - dashboard: 1 failure
```

**After:**
```
Tests:     ✓ All tests pass
  - Total: 0 failures
  - Suite stability: Confirmed (no isolation issues)
```

---

## Common Implementation Questions

### Q1: Should I create a branch?
**A:** Yes. `git checkout -b fix/test-failures` then create feature branch for each phase:
- `fix/mock-chain-initialization`
- `fix/email-modal-teleport`
- `fix/date-boundary-logic`

Or combine all three in one branch if working in isolated session.

### Q2: Can I fix all three at once?
**A:** Technically yes, but not recommended. Sequential approach lets you:
- Verify each fix works independently
- Isolate failures if one fix doesn't work
- Review/commit each fix separately
- Catch regressions earlier

### Q3: What if a test still fails after fix?
**A:** Stop and investigate:
1. Run test in isolation: `npm run test -- path/to/test.spec.ts`
2. Check error message - what's actually failing?
3. Compare with fix plan - did you implement all steps?
4. Add debug logging: `console.log()` in test or composable
5. Ask for help with error-detective agent

### Q4: What if other tests break?
**A:** Likely cross-test mock pollution:
1. Run full test suite with isolation enabled:
   - Edit `vitest.config.ts`: `isolate: true` (all environments)
   - Run: `npm run test`
2. If tests pass with isolation, revert isolation change
3. Document which tests have pollution issues for future fix

### Q5: Do I need to update the component files?
**A:** NO. These are test-only fixes. Component files don't change:
- `components/EmailRecruitingPacketModal.vue` - unchanged
- `composables/useInteractions.ts` - unchanged
- `pages/dashboard.vue` - unchanged (verify, but shouldn't change)

---

## Risk Mitigation

### If Something Goes Wrong

**If mock fix breaks other tests:**
1. Revert changes: `git checkout -- tests/unit/composables/useInteractions.extended.spec.ts`
2. Check if those tests use similar mock patterns
3. May need to fix them too using same approach
4. Review cross-test dependencies

**If Teleport mock breaks component:**
1. Verify: Does component work in browser?
2. If yes: Mock is test-only, doesn't affect production ✓
3. If no: Mock shouldn't affect that (different code path)
4. Check if component has other issues unrelated to test

**If date test still flakes:**
1. Check test environment timezone: `console.log(new Date().getTimezoneOffset())`
2. Verify production code uses same timezone handling
3. May need UTC offset adjustment in test
4. Add timezone-aware test variant

---

## After All Fixes Complete

### Recommended Follow-Up Tasks

1. **Investigate other tests for similar patterns:**
   - Are there other Teleport uses in components?
   - Are there other module-level mocks with closure issues?
   - Are there other timezone-dependent tests?

2. **Enable test isolation in all environments:**
   - Change `vitest.config.ts` to `isolate: true` always
   - Resolves test pollution issues at configuration level
   - May need to optimize for CI performance

3. **Add test helper utilities:**
   - Create `tests/utils/mocks.ts` with mock factories
   - Create `tests/utils/dates.ts` with date creation helpers
   - Create `tests/utils/teleport.ts` with Teleport mocking
   - Reuse across test files

4. **Document test patterns:**
   - Add section to CLAUDE.md: "Common Test Patterns"
   - Document how to mock Supabase
   - Document how to handle Teleport
   - Document timezone-safe date creation

5. **Consider E2E coverage:**
   - Email modal currently tested with mocked Teleport
   - Add E2E test to verify Teleport works in browser
   - Verify modal escape key, focus trapping, etc.

---

## Git Commit Message Template

**Phase 1 (Mock chain):**
```
fix(tests): fix mock chain initialization in useInteractions.extended.spec.ts

- Replace module-level mock with factory function
- Use vi.doMock() for per-test mock registration
- Reset mocks in beforeEach/afterEach to prevent pollution
- All 9 tests now pass in suite context
```

**Phase 2 (Teleport):**
```
fix(tests): mock Teleport for EmailRecruitingPacketModal component tests

- Mock Vue Teleport component to render inline
- Resolves Vue Test Utils happy-dom incompatibility
- All 28 failing tests now pass
- Added flushPromises() for Transition timing
```

**Phase 3 (Date):**
```
fix(tests): use UTC timestamps for timezone-safe date boundary tests

- Replace local time dates with Date.UTC() calls
- Add edge case tests for month boundaries and fallbacks
- Fixes flaky test that failed in some timezones
```

---

## Success Metrics

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Total test failures | 47 | 0 | 0 |
| Suite stability | Failing | Passing | 100% |
| Type errors | 0 | 0 | 0 |
| Lint errors | 0 | 0 | 0 |
| Build success | ✓ | ✓ | ✓ |

---

## Timeline Estimate

- Phase 1 (Mock chain): 1-2 hours
- Phase 2 (Teleport): 30-45 minutes
- Phase 3 (Date): 20-30 minutes
- Full validation: 15-20 minutes
- **Total: ~3-4 hours** (non-sequential)

---

## Support & Escalation

If you get stuck:

1. **Re-read the specific fix plan** - likely contains answer
2. **Check unresolved questions** section at end of each plan
3. **Isolate the test** and add debug logging
4. **Ask for help** with error-detective agent if needed
5. **Document findings** for future reference

---

## Next Steps

1. **Read this roadmap** ✓ (you are here)
2. **Read the three fix plans** (15-20 min each)
3. **Ask any clarification questions** before starting
4. **Choose implementation approach:**
   - Sequential (recommended): Fix 1 → 2 → 3
   - Parallel (if multiple branches): Can do 2 & 3 in parallel after 1
5. **Start Phase 1** when ready
6. **Report progress** after each phase completes
7. **Validate all fixes** with full test suite + build
8. **Commit and push** when complete

---

## Final Checklist Before Implementation

- [ ] I understand the three distinct failure categories
- [ ] I've read all three fix plans and understand the approach
- [ ] I have questions written down (if any)
- [ ] My working directory is clean (git status shows no uncommitted changes)
- [ ] I know how to run the test suite: `npm run test`
- [ ] I know how to run a single test file: `npm run test -- path/to/test`
- [ ] I'm ready to start with Phase 1 (Mock chain initialization)

**Status: Ready to implement** ✓
