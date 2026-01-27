# Refactor Plan - Major Issues Analysis
**Date:** 2026-01-26
**Scope:** Entire Project Analysis
**Status:** Planning Complete

---

## Executive Summary

Found **15 major issues** across the codebase ranging from **CRITICAL security/stability problems** to **HIGH performance/maintainability concerns**.

**Critical Issues (Must Fix):**
- Deprecated code still active in production
- Incomplete session management (auth middleware has TODO)
- In-memory rate limiting (resets on deploy)

**High Priority Issues (1-2 weeks):**
- 74 composables with heavy duplication
- Missing async cleanup (memory leak risk)
- localStorage used for sensitive data (28 files)
- Insufficient test coverage on critical paths

---

## Issues by Severity

### 🔴 CRITICAL (2 issues)

#### 1. Deprecated Code Still Active in Production
- **Files:** `composables/useSearch.ts`, `composables/useDocuments.ts`
- **Problem:** Deprecated composables emit console warnings, wrapping logic still in production
- **Risk:** Maintenance confusion, unclear which code path to maintain
- **Impact:** All development sessions see deprecation warnings
- **Fix Approach:**
  - Create strict deprecation policy with removal dates
  - Move runtime warnings to build-time only
  - Create migration guide and checklist for all imports
- **Estimated Effort:** 1 week

#### 2. Incomplete Session Management (Auth)
- **Files:** `middleware/auth.ts`, `composables/useAuth.ts`
- **Problem:** Auth middleware has TODO comments, no route protection enforced
- **Risk:** All routes unprotected, anyone can access any data
- **Impact:** Security vulnerability - no access control
- **Fix Approach:**
  - Implement auth middleware protecting sensitive routes
  - Move session validation server-side (HTTP-only cookies)
  - Remove session data from localStorage
  - Document protected routes
- **Estimated Effort:** 5-7 days

### 🟠 HIGH (5 issues)

#### 3. Composable Proliferation & Duplication
- **Files:** 74 composables in `/composables/`
- **Problem:** 4 search composables, 7 document composables, unclear consolidation path
- **Risk:** Developer confusion, maintainability nightmare, increased bundle size
- **Impact:** Cognitive overload, duplicated logic, slow development
- **Fix Approach:**
  - Audit all 74 and categorize by domain
  - Create consolidation roadmap
  - Document which composable to use per scenario
- **Estimated Effort:** 2-3 weeks

#### 4. Missing Async Cleanup (Memory Leaks)
- **Files:** 8+ composables using setTimeout/setInterval without cleanup
- **Problem:** Event listeners and timers not removed on unmount
- **Risk:** Memory leaks, performance degradation over time
- **Impact:** Long-running sessions become slow/unstable
- **Fix Approach:**
  - Add `onBeforeUnmount` handlers to all timer-using composables
  - Create `useTimer` helper for automatic cleanup
  - Audit for removeEventListener calls
- **Estimated Effort:** 3-4 days

#### 5. Rate Limiting Not Persistent
- **Files:** `server/api/recruiting-packet/email.post.ts`
- **Problem:** In-memory Map resets on server restart, ineffective across distributed servers
- **Risk:** Rate limits bypassed on deployment, no abuse protection
- **Impact:** Spam vulnerability, resource exhaustion risk
- **Fix Approach:**
  - Implement Redis-based rate limiting
  - Or use Supabase table with TTL
  - Add audit trail and abuse alerts
- **Estimated Effort:** 2-3 days

#### 6. localStorage Used for Sensitive Data
- **Files:** 28 composables storing session/filter/preference data
- **Problem:** Session state, filter criteria, user preferences unencrypted in localStorage
- **Risk:** XSS attacks steal data, shared computers expose info
- **Impact:** Security vulnerability for sensitive recruiting data
- **Fix Approach:**
  - Move session prefs to Supabase user metadata
  - Store filters server-side tied to user account
  - Use HTTP-only cookies for auth tokens
  - Add CSP headers
- **Estimated Effort:** 5-7 days

#### 7. Insufficient Test Coverage
- **Files:** Multiple critical composables (usePhaseCalculation, useFitScore, etc.)
- **Problem:** Edge cases not tested, critical recruiting logic unprotected
- **Risk:** Regression bugs, refactoring becomes dangerous
- **Impact:** Unreliable recruiting phase/fit calculations
- **Fix Approach:**
  - Add integration tests for end-to-end flows
  - Test error scenarios (network failures, null values)
  - Add E2E tests for recruiting packet sending
  - Target >80% coverage on critical paths
- **Estimated Effort:** 2-3 weeks

---

### 🟡 MEDIUM (8 issues)

| # | Issue | Files | Impact | Effort |
|---|-------|-------|--------|--------|
| 8 | Type Safety Gaps (any types) | 15+ pages | Lost IDE help, runtime errors | 5-7 days |
| 9 | Query Optimization (select *) | 10+ composables | 2-5x slower queries | 3-5 days |
| 10 | Event Listener Leaks | useSessionTimeout.ts | Memory accumulation | 1 day |
| 11 | Input Validation Missing | 5+ API endpoints | Invalid data persisted | 3-4 days |
| 12 | Concurrent Request Handling | 8+ composables | Race conditions, data inconsistency | 3-5 days |
| 13 | Direct State Mutations | coaches.ts, schools.ts | Hard to debug, audit trail lost | 2-3 days |
| 14 | NCAA Data Hardcoded | ncaaDatabase.ts | Stale data, not scalable | 3-5 days |
| 15 | Silent Error Handling | 10+ files | No error tracking, poor UX | 3-4 days |

---

## Recommended Fix Priority

### Week 1 (Immediate - Critical/Security)
- [ ] Disable deprecated composables (feature flag)
- [ ] Add event listener cleanup to all composables
- [ ] Move rate limiting to Redis or Supabase
- [ ] Implement auth middleware properly

### Weeks 2-3 (High Impact)
- [ ] Add input validation to all API endpoints
- [ ] Enable `noImplicitAny` TypeScript check
- [ ] Create deprecation roadmap with timeline
- [ ] Start composable consolidation audit

### Weeks 4-6 (Stability)
- [ ] Move session/filter data from localStorage
- [ ] Add test coverage for critical paths
- [ ] Fix query optimization (remove select *)
- [ ] Add concurrent request deduplication

### Weeks 7-8 (Optimization)
- [ ] Consolidate composables
- [ ] Move NCAA database to Supabase
- [ ] Fix direct state mutations
- [ ] Improve error handling/logging

---

## Validation Checklist

- [ ] Build passes without errors: `npm run build`
- [ ] All tests pass: `npm run test`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] No lint warnings: `npm run lint`
- [ ] All deprecated code removed or feature-flagged
- [ ] Auth middleware protecting all sensitive routes
- [ ] Session data moved from localStorage
- [ ] Rate limiting persistent across deploys
- [ ] No memory leaks in async composables
- [ ] All API endpoints validated

---

## Next Steps

Choose your priority area and I'll create a detailed implementation plan:

1. **Security First** - Fix auth, rate limiting, sensitive data
2. **Stability First** - Fix memory leaks, test coverage, async cleanup
3. **Code Health** - Fix deprecation, composable duplication, type safety
4. **Performance** - Fix query optimization, concurrent requests
5. **All at Once** - Create comprehensive refactoring roadmap

**What would you like to focus on first?**
