# E2E Testing Setup & Execution Plan

## Current State

### ✅ What's Working
- **Playwright Installation**: v1.57.0 installed and configured
- **Playwright Config**: Well-configured (`playwright.config.ts`)
  - Chromium as primary browser
  - Firefox/WebKit for CI only
  - Base URL: `http://localhost:3003`
  - 2 retries in CI, 0 locally
  - HTML reporter configured
  - Auto-starts dev server with 120s timeout
- **Test Files**: 12 test files exist with 100+ individual tests
  - Tier 1 Critical: auth, collaboration, offers, workflow
  - Tier 2 Important: performance, search-and-filters
  - Tier 3 Nice-to-have: error-recovery
  - CRUD workflows: documents, schools
- **Page Objects**: 8 page objects created (AuthPage, CoachesPage, etc.)
- **Test Fixtures**: Test data setup with users, schools, coaches, interactions, offers
- **npm Scripts**: `npm run test:e2e` and `npm run test:e2e:ui` configured

### ❌ Blocking Issues

#### Issue 1: Build Failure - Broken Imports
**Root Cause**: Three files import `FieldError` from wrong path
- **Files affected**:
  - `pages/login.vue`
  - `pages/signup.vue`
  - `components/School/SchoolForm.vue`
- **Problem**: Importing from `~/components/Validation/FieldError.vue`
- **Actual location**: `~/components/DesignSystem/FieldError.vue`
- **Impact**: Build fails → dev server can't start → E2E tests can't run

#### Issue 2: Dev Server Startup Timeout
**Root Cause**: Build failure prevents dev server from starting
- **Config**: 120s timeout in `playwright.config.ts`
- **Current behavior**: Timeout occurs before server starts
- **Impact**: Playwright can't access app → all E2E tests fail

#### Issue 3: Port Configuration
**Note**: Playwright expects dev server on `http://localhost:3003`
- **Current**: `npm run dev` likely uses different port (probably 3000)
- **Solution**: Needs verification/configuration

### 📋 Test Readiness Issues
1. **Supabase Connection**: Tests may need authenticated test user setup
2. **Page Objects**: Some may reference selectors that don't exist in current UI
3. **Test Data**: May need adjustment based on actual database schema
4. **Auth Fixtures**: Need test credentials setup in Supabase

## Implementation Plan

### Phase 1: Fix Build (Priority: Critical)
**Goal**: Get `npm run build` to succeed

1. **Fix FieldError imports** (3 files)
   - Correct import path to `~/components/DesignSystem/FieldError.vue`
   - Files:
     - `pages/login.vue`
     - `pages/signup.vue`
     - `components/School/SchoolForm.vue`

2. **Verify build succeeds**
   ```bash
   npm run build
   ```

### Phase 2: Configure Dev Server Port (Priority: High)
**Goal**: Ensure dev server runs on port 3003

1. **Verify current dev port**
   - Check if `npm run dev` uses port 3000 or 3003
   - Update Nuxt config if needed to use port 3003

2. **Test dev server startup**
   ```bash
   npm run dev
   # Verify server is accessible at http://localhost:3003
   ```

### Phase 3: Run E2E Tests (Priority: High)
**Goal**: Get E2E tests running and identify remaining issues

1. **Run single test** to identify page object issues
   ```bash
   npm run test:e2e -- tests/e2e/schools.spec.ts --workers=1
   ```

2. **Identify missing selectors/components** in page objects
   - Run test in UI mode if needed: `npm run test:e2e:ui`
   - Check for selector mismatches in page objects

3. **Fix page object issues** as they appear
   - Update selectors to match actual UI
   - Add missing methods if needed

### Phase 4: Setup Test Authentication (Priority: High)
**Goal**: Tests can authenticate with real Supabase instance

1. **Check Supabase test user setup**
   - Verify test credentials exist or create them
   - Consider using Supabase test mode if available

2. **Update test data fixture** if needed
   - Adjust test user credentials if they changed
   - Ensure test data matches Supabase schema

3. **Add pre-test setup** if needed
   - Clear test data before each test run
   - Create fresh test users if needed

### Phase 5: Get Tests Passing (Priority: Medium)
**Goal**: All E2E tests pass consistently

1. **Run full test suite**
   ```bash
   npm run test:e2e
   ```

2. **Debug failing tests**
   - Use `npm run test:e2e:ui` for interactive debugging
   - Update tests as needed based on actual app behavior

3. **Stabilize flaky tests**
   - Add appropriate waits/retries
   - Fix timing-dependent assertions

## Success Criteria

- [x] Build succeeds: `npm run build` → 0 errors
- [ ] Dev server starts: `npm run dev` → accessible on http://localhost:3003
- [ ] Tests run: `npm run test:e2e -- --list` → shows all tests
- [ ] Tests pass: `npm run test:e2e` → all tests pass on Chromium
- [ ] Reproducible: Can run tests consistently without manual intervention

## Unresolved Questions

1. **Supabase Test Credentials**: Do test users already exist in Supabase, or need to be created?
2. **Test Data Cleanup**: Should tests create/cleanup their own data, or should there be a setup/teardown fixture?
3. **Auth Flow**: Will tests use email/password auth, or do they need any special test mode?
4. **Page Object Selectors**: Are the current selectors in page objects accurate for the current UI?

## Risk Assessment

- **Low Risk**: Build fixes (just updating imports)
- **Medium Risk**: Dev server setup (port configuration)
- **Medium Risk**: Page object updates (may need multiple selector fixes)
- **Medium Risk**: Test authentication (depends on Supabase setup)

## Estimated Scope

This plan should resolve the blocking issues and get E2E tests running. The main work is:
1. Fix 3 import paths (~5 min)
2. Verify/configure dev server (~10 min)
3. Debug page objects (~30-60 min depending on selector mismatches)
4. Setup test auth (~15-30 min depending on Supabase state)
