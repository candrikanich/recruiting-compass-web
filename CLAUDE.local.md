# CLAUDE.local.md

Project-specific history, completed work, and future notes. Not loaded in main sessions but useful for context during reviews.

## Platform Migration: GitLab → GitHub & Netlify → Vercel ✅

**Completed February 1, 2026**

### Repository Migration

- Source: GitLab (candrikanich/recruiting-compass) → GitHub (candrikanich/recruiting-compass-web)
- History preserved, all commits intact
- Branch: `main` (default)

### Deployment Migration

- Source: Netlify → **Vercel** (production)
- Live URL: https://recruiting-compass-web-a9wx.vercel.app
- Status: All API routes functional, family management verified working

### Key Deployment Fixes

1. **Build Command Fix** (4f2093a)
   - Changed: `nuxi generate` → `nuxi build`
   - Enables Nitro `vercel` preset (serverless functions)
   - API routes now deploy as Lambda functions

2. **Dependency Exclusion** (2e0576d)
   - Excluded: `isomorphic-dompurify` (jsdom - client-only)
   - Bundle size: 11.6 MB → 4.27 MB
   - Prevents ESM/CommonJS conflicts in serverless runtime

3. **Security Header Fix** (c376ccb)
   - Added: `'unsafe-inline'` to production CSP for scripts
   - Nuxt 3 SPA mode requires inline script execution
   - Page now initializes without errors

### Cleanup Done

- Deleted: `.gitlab-ci.yml`, `netlify.toml`, `.netlify/` directory
- Deleted: `/documentation/build/` (outdated planning docs)
- Updated: README.md with Vercel deployment info
- Updated: CLAUDE.local.md with migration summary

### Verification

- ✅ CSRF token endpoint: 200 OK
- ✅ Family members endpoint: 401 Unauthorized (expected, auth required)
- ✅ Family Management page: Renders and loads data correctly
- ✅ Parent appears in family members list (migration verified)

---

## Phase 4: User Preferences Migration ✅

Complete migration from monolithic V1 preferences to category-based V2 (January 27, 2026).

**Database:** Migration 017 converted all 283 V1 records → 287 V2 category records. Backup table: `user_preferences_v1_backup`. RLS policies configured.

**Composables:** `usePreferenceManager` (high-level API) + `preferenceValidation.ts` (type-safe validators).

**Consumer pages (9 total updated):**

- `settings/notifications.vue`, `settings/location.vue`, `settings/player-details.vue`, `settings/school-preferences.vue`, `settings/dashboard.vue`
- `settings/index.vue`, `schools/index.vue`, `schools/[id]/index.vue`
- `composables/useSchoolMatching.ts`

**API endpoints:**

- `POST /api/user/preferences/history` - Record changes
- `GET /api/user/preferences/[category]/history` - Fetch history with pagination

**Benefits:** Type safety, automatic audit trail, category-level API ops, scalability.

## Phase 3: Composable Consolidations ✅

Reduced from 60+ to 57 composables by merging related logic:

1. **useSchoolDuplication → useSchools**
   - Merged: `findDuplicate`, `hasDuplicate`, `isNameDuplicate`, `isDomainDuplicate`, `isNCAAAIDuplicate`
   - Rationale: Duplicate detection is school validation

2. **useTemplateUnlock → useCommunicationTemplates**
   - Merged: `checkUnlockCondition`, `checkTemplateUnlocked`, `getTemplatesWithUnlockStatus`
   - Merged types: `UnlockCondition`, `UnlockConditionGroup`, `TemplateWithUnlockStatus`
   - Rationale: Unlock conditions determine availability

3. **useFollowUpReminders → useInteractions**
   - Merged: `loadReminders`, `createReminder`, `completeReminder`, `updateReminder`, `deleteReminder`, `formatDueDate`
   - Merged computed: `activeReminders`, `overdueReminders`, `upcomingReminders`, `completedReminders`, `highPriorityReminders`
   - Rationale: Reminders tightly coupled to interactions

All deprecated composables marked `@deprecated` in source files. Scheduled for removal in next major version.

## Key Composables

**Schools Domain** (`useSchools`)

- CRUD, filtering, ranking, duplicate detection, favorites, search

**Communication Domain** (`useCommunicationTemplates`)

- Template CRUD for email/messages/phone scripts
- Variable substitution, unlock conditions, filtering by type/tag

**Interactions Domain** (`useInteractions`)

- CRUD (logs, notes, attachments), audit logs, reminders
- CSV export, inbound alerts, notification creation

**Coaches Domain** (`useCoaches`)

- CRUD by school, filtering, ordering, search

**Tasks Domain** (`useTasks`)

- Phase tasks with dependencies, locking, grade requirements

**Performance Domain** (`usePerformanceAnalytics`)

- Metrics, grades, fit score calculation

**Account Linking Domain** (`useAccountLinks`)

- Multi-step verification (send → accept → confirm)
- Relationship type determination, notification integration

## Deprecated Files

Marked `@deprecated`, scheduled for removal:

- `composables/useUserPreferences.ts` (V1)
- `composables/useSchoolDuplication.ts`
- `composables/useTemplateUnlock.ts`
- `composables/useFollowUpReminders.ts`

## Notes for Future Development

- **Composable organization**: Currently ~57; continue consolidating related logic into domain-focused composables
- **Test coverage**: Maintain >80% for core features (enhanced during Phase 3)
- **Component structure**: Organize by domain (Coach/, School/, Interaction/) to avoid naming collisions
- **Store patterns**: Mutations only in actions; no direct component mutations
- **API layer**: Consider service functions if API calls become complex
- **Major version tasks**: Remove deprecated composables, audit codebase for unused functions
