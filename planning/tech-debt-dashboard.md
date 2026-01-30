# Technical Debt Dashboard
## The Recruiting Compass - Nuxt 3 Web Application

**Generated:** 2026-01-28
**Overall Health Score:** 6.5/10

---

## Quick Stats

| Metric | Value | Status |
|--------|-------|--------|
| Total LOC | ~80,000 | 📊 |
| Test Files | 143 passing | ✅ |
| Tests | 2,869 passing | ✅ |
| Lint Issues | 0 | ✅ |
| Type Errors | 0 | ✅ |
| Outdated Packages | 17 | ⚠️ |
| Deprecated Composables | 14 | 🔴 |
| Large Files (>500 lines) | 22 | ⚠️ |
| Missing Migration | 1 (017) | 🔴 |

---

## 🔴 CRITICAL ISSUES (Fix Immediately)

### 1. Missing Database Migration (017)

**Severity:** HIGH | **Effort:** 1-2 hours | **Impact:** Data integrity

**Issue:** CLAUDE.md references migration `017_migrate_user_preferences_v1_to_v2` as applied, but the file doesn't exist in `server/migrations/`.

**Migrations present:**
- 016_create_user_preferences_table.sql ✅
- 017_... ❌ MISSING
- 018_add_admin_role.sql ✅
- 019_add_admin_flag.sql ✅

**Action Items:**
- [ ] Verify if migration was applied directly to Supabase without file
- [ ] If applied: Create migration file for documentation
- [ ] If not applied: Create and run migration
- [ ] Update CLAUDE.md to reflect actual state

**File Location:** `server/migrations/`

---

### 2. 14 Deprecated Composables Still Exported

**Severity:** HIGH | **Effort:** 1-2 days | **Impact:** Developer confusion, bundle size

**Issue:** Deprecated composables remain fully functional and exported, causing import confusion.

| Composable | Size | Replacement | Priority |
|------------|------|-------------|----------|
| `useSchoolDuplication` | 3.5 KB | `useSchools` | Remove |
| `useTemplateUnlock` | 9.1 KB | `useCommunicationTemplates` | Remove |
| `useFollowUpReminders` | 7.8 KB | `useInteractions` | Remove |
| `useUserPreferences` | 11 KB | `useUserPreferencesV2` | Remove |
| `useDocuments` | 2.8 KB | `useDocumentsConsolidated` | Remove |
| `useDocumentFetch` | 6.2 KB | `useDocumentsConsolidated` | Remove |
| `useDocumentUpload` | 7.1 KB | `useDocumentsConsolidated` | Remove |
| `useDocumentSharing` | 3.5 KB | `useDocumentsConsolidated` | Remove |
| `useDocumentValidation` | 3.3 KB | `useDocumentsConsolidated` | Remove |
| `useSearch` | 2.8 KB | `useSearchConsolidated` | Remove |
| `useSearchFilters` | 3.6 KB | `useSearchConsolidated` | Remove |
| `useEntitySearch` | 9.9 KB | Evaluate | Keep or merge |
| `useNcaaLookup` | 7.1 KB | Evaluate | Keep or merge |
| `useValidation` | 3.5 KB | `useFormValidation` | Remove |

**Action Items:**
- [ ] Audit all imports of deprecated composables
- [ ] Update consumers to use replacement composables
- [ ] Remove deprecated files or make them re-export wrappers
- [ ] Update tests to use new composables

**Files:** `composables/use*.ts` marked `@deprecated`

---

### 3. Giant Pages (>1000 lines)

**Severity:** MEDIUM-HIGH | **Effort:** 2-3 days | **Impact:** Maintainability, performance

| Page | Lines | Issue |
|------|-------|-------|
| `pages/schools/[id]/index.vue` | 1,255 | Extract child components |
| `pages/schools/index.vue` | 1,148 | Extract filters, list, cards |
| `pages/events/[id].vue` | 1,135 | Extract event details sections |
| `pages/schools/[id]/interactions.vue` | 1,035 | Extract interaction components |

**Additional Large Pages (700-1000 lines):**
- `pages/settings/player-details.vue` - 988 lines
- `pages/reset-password.vue` - 938 lines
- `pages/performance/index.vue` - 881 lines
- `pages/interactions/index.vue` - 857 lines
- `pages/coaches/[id].vue` - 856 lines
- `pages/coaches/index.vue` - 776 lines
- `pages/settings/school-preferences.vue` - 766 lines

**Action Items:**
- [ ] Extract `SchoolDetailSections/` components from `pages/schools/[id]/index.vue`
- [ ] Extract `SchoolListFilters.vue`, `SchoolListCard.vue` from `pages/schools/index.vue`
- [ ] Create sub-page routes for complex pages where appropriate
- [ ] Target: No page > 500 lines

---

## ⚠️ IMPORTANT ISSUES (Plan This Sprint)

### 4. Large Composables (>600 lines)

**Severity:** MEDIUM | **Effort:** 3-5 days | **Impact:** Maintainability

| Composable | Lines | Recommendation |
|------------|-------|----------------|
| `ncaaDatabase.ts` | 964 | Move to data/ as JSON, create thin accessor |
| `useInteractions.ts` | 788 | Split: core CRUD, reminders, export, filters |
| `useSearchConsolidated.ts` | 749 | Split: search, filters, pagination |
| `useDocumentsConsolidated.ts` | 671 | Split: CRUD, upload, sharing, validation |
| `usePerformanceConsolidated.ts` | 626 | Split: metrics, analytics, grades |
| `useCommunicationTemplates.ts` | 577 | Split: templates, unlock, rendering |

**Action Items:**
- [ ] `ncaaDatabase.ts`: Extract static data to JSON file
- [ ] Split large composables following SRP
- [ ] Target: No composable > 400 lines

---

### 5. Large Components (>400 lines)

**Severity:** MEDIUM | **Effort:** 2-3 days | **Impact:** Reusability

| Component | Lines | Action |
|-----------|-------|--------|
| `SchoolForm.vue` | 528 | Extract field groups |
| `DashboardAnalytics.vue` | 515 | Extract chart components |
| `UniversalFilter.vue` | 463 | Extract filter type components |
| `CommunicationPanel.vue` | 459 | Extract message/template sections |

**Action Items:**
- [ ] Break `SchoolForm.vue` into `SchoolBasicInfo`, `SchoolAcademics`, `SchoolAthletics`
- [ ] Extract chart components from `DashboardAnalytics.vue`
- [ ] Target: No component > 300 lines

---

### 6. Component Name Conflicts

**Severity:** LOW-MEDIUM | **Effort:** 1 day | **Impact:** Import confusion

**Duplicate Names (2 versions each):**
- `AthleteSwitcher.vue` - Common/ vs Parent/
- `ExportButton.vue` - Common/ vs Performance/
- `NotificationCenter.vue` - Notification/ vs Header/
- `StatCard.vue` - Performance/ vs Analytics/

**Action Items:**
- [ ] Rename with domain prefix: `CommonExportButton`, `PerformanceExportButton`
- [ ] Or consolidate into single flexible component
- [ ] Update all imports

---

### 7. Outdated Dependencies

**Severity:** MEDIUM | **Effort:** 2-4 hours | **Impact:** Security, features

**Major Updates Available:**

| Package | Current | Latest | Risk |
|---------|---------|--------|------|
| `nuxt` | 3.20.2 | 4.3.0 | 🔴 Major |
| `tailwindcss` | 3.4.19 | 4.1.18 | 🔴 Major |
| `@pinia/nuxt` | 0.5.5 | 0.11.3 | ⚠️ Minor |
| `eslint-plugin-vue` | 9.33.0 | 10.7.0 | 🔴 Major |
| `eslint-config-prettier` | 9.1.2 | 10.1.8 | 🔴 Major |

**Safe Updates (Patch/Minor):**

| Package | Current | Latest |
|---------|---------|--------|
| `@playwright/test` | 1.57.0 | 1.58.0 |
| `@supabase/supabase-js` | 2.89.0 | 2.93.2 |
| `vitest` | 4.0.17 | 4.0.18 |
| `vue` | 3.5.26 | 3.5.27 |
| `zod` | 4.2.1 | 4.3.6 |
| `prettier` | 3.7.4 | 3.8.1 |

**Action Items:**
- [ ] Run safe updates: `npm update`
- [ ] Create branch for Nuxt 4 migration evaluation
- [ ] Create branch for Tailwind 4 migration evaluation
- [ ] Update ESLint 10 configuration

---

## 📋 MINOR ISSUES (Backlog)

### 8. Console Statements (566 total)

**Severity:** LOW | **Effort:** 2-3 hours | **Impact:** Production cleanliness

**Breakdown:**
- `console.error()` - 13+ (mostly legitimate error handling)
- `console.warn()` - 11+ (review for necessity)
- `console.log()` - 8+ (likely debug - remove)
- `console.debug()` - 5+ (should be removed for production)
- `console.group()`/`console.table()` - debug artifacts

**Action Items:**
- [ ] Audit all `console.log()` and `console.debug()` - remove if debug-only
- [ ] Keep `console.error()` for legitimate error handling
- [ ] Consider: Replace with proper logging service

---

### 9. Build Scripts in JavaScript

**Severity:** LOW | **Effort:** 1-2 hours | **Impact:** Consistency

**Files to convert:**
- `scripts/apply-migrations.js` → `.ts`
- `scripts/create-index.js` → `.ts`
- `scripts/generate-index.js` → `.ts`
- `scripts/prepare-migrations.js` → `.ts`

**Action Items:**
- [ ] Convert scripts to TypeScript
- [ ] Update `package.json` scripts to use `tsx` runner

---

### 10. Test Coverage Gap

**Severity:** LOW-MEDIUM | **Effort:** 3-5 days | **Impact:** Confidence

**Missing Coverage Tool:**
```
Cannot find dependency '@vitest/coverage-v8'
```

**Under-tested Areas:**
- Large pages (4 pages >1000 lines with minimal tests)
- Some components lack unit tests

**Action Items:**
- [ ] Install `@vitest/coverage-v8`
- [ ] Add tests for critical pages
- [ ] Target: 80% coverage for business logic

---

## 📊 Debt by Category

```
CATEGORY                 COUNT    PRIORITY    EFFORT
─────────────────────────────────────────────────────
Migration Issues         1        🔴 HIGH     1-2h
Deprecated Code          14       🔴 HIGH     1-2d
Large Pages              11       ⚠️ MEDIUM   3-5d
Large Composables        48       ⚠️ MEDIUM   5-7d
Large Components         13       ⚠️ MEDIUM   2-3d
Name Conflicts           4        📋 LOW      1d
Outdated Deps            17       ⚠️ MEDIUM   2-4h
Console Statements       566      📋 LOW      2-3h
JS Build Scripts         4        📋 LOW      1-2h
Missing Test Coverage    -        📋 LOW      3-5d
```

---

## 🗓️ Recommended Sprint Plan

### Sprint 1: Critical Cleanup (1-2 weeks)

1. **Day 1-2:** Resolve migration 017 issue
2. **Day 2-4:** Remove/consolidate 14 deprecated composables
3. **Day 5-7:** Extract components from 4 largest pages
4. **Day 8-10:** Run safe dependency updates

**Expected Outcome:**
- 0 deprecated exports
- No page > 700 lines
- All packages at latest patch versions

### Sprint 2: Refactoring (2-3 weeks)

1. Break down 6 largest composables (>600 lines)
2. Rename duplicate components
3. Remove debug console statements
4. Convert build scripts to TypeScript

**Expected Outcome:**
- No composable > 400 lines
- No component name conflicts
- Clean production console output

### Sprint 3: Quality & Maintenance (Ongoing)

1. Install coverage tool, achieve 80% on business logic
2. Evaluate Nuxt 4 migration
3. Evaluate Tailwind 4 migration
4. Continue component extraction from medium pages

---

## 🔗 Quick Reference Links

| Resource | Location |
|----------|----------|
| CLAUDE.md | `/CLAUDE.md` |
| Composables | `/composables/` |
| Pages | `/pages/` |
| Components | `/components/` |
| Migrations | `/server/migrations/` |
| Tests | `/tests/` |
| Planning | `/planning/` |

---

## Health Score Breakdown

| Area | Score | Notes |
|------|-------|-------|
| Code Organization | 7/10 | Good domain structure, some large files |
| Test Coverage | 7.5/10 | 2,869 tests, good for logic, weak for pages |
| Type Safety | 8.5/10 | Strict TS, 0 errors |
| Build Health | 9/10 | Clean lint, clean types |
| Dependency Health | 6/10 | 17 outdated, 3 major versions behind |
| Documentation | 8/10 | Comprehensive CLAUDE.md |
| Migration Debt | 5/10 | Missing file, 14 deprecated exports |

**Overall: 6.5/10** - Functional and well-tested, but accumulated migration debt and oversized files need attention.
