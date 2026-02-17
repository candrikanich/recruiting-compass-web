# Dead Code Analysis Report
Generated: 2026-02-17
Last updated: 2026-02-17 (after Phase 1 execution + investigation)

Tools used: knip 5.83.1, depcheck 1.4.7

## Phase 1 Completed ✅
Deleted: 3 duplicate "spec 2" test files, `app.css`, `assets/styles/main.css`
Tests after deletion: **5631 passing** (unchanged)

## Phase 2 Completed ✅
Deleted: `stores/notifications.ts`, `stores/interactions.ts`, `stores/performance.ts`, `__tests__/` directory
Tests after deletion: **5631 passing** (unchanged — all confirmed truly dead)

## Key Finding: Knip False Positives in Nuxt
Knip does not follow Nuxt's auto-import for components used in templates. Many flags are invalid:
- `CommunicationPanel.vue` — verified in use by `Dashboard/CoachFollowupWidget.vue`
- All `plugins/` — auto-registered by Nuxt's file-based plugin system (DANGER: do not delete)
- All `scripts/` — invoked externally, not via imports (DANGER: do not delete)
- CSS `assets/styles/theme.css`, `assets/styles/transitions.css` — imported by active `assets/css/main.css`

---

---

## 🟢 SAFE — Low Risk Deletions

### Duplicate Test Files (accidental copies with space in filename)
These files have exact originals alongside them and are never executed by the test runner.

| File | Original |
|------|----------|
| `tests/unit/pages/schools-id-detail-notes.spec 2.ts` | `tests/unit/pages/schools-id-detail-notes.spec.ts` |
| `tests/unit/pages/schools-id-detail-pros-cons.spec 2.ts` | `tests/unit/pages/schools-id-detail-pros-cons.spec.ts` |
| `tests/unit/pages/schools-id-interactions.spec 2.ts` | `tests/unit/pages/schools-id-interactions.spec.ts` |

### Orphaned Root CSS File
`app.css` — root-level file importing assets/styles/*. `nuxt.config.ts` uses `assets/css/main.css` instead. Never registered anywhere.

### Orphaned assets/styles/main.css
`assets/styles/main.css` — only imported by `app.css` (which is itself orphaned). `assets/css/main.css` imports `theme.css` and `transitions.css` directly, bypassing this file.

### Misplaced Test Directories
`__tests__/unit/components/CommunicationPanel.test.ts` and `__tests__/unit/composables/useCommunication.test.ts` — in a `__tests__/` root directory separate from the project's standard `tests/` directory. Vitest config likely doesn't pick these up.

---

## 🟡 CAUTION — Needs Investigation

### Orphaned Pinia Stores
These stores have no callers in the codebase (no `useXxxStore()` calls found). Large files being carried as dead weight.

| Store | Lines | Notes |
|-------|-------|-------|
| `stores/interactions.ts` | 648 | No `useInteractionsStore` calls found outside `.nuxt/` |
| `stores/notifications.ts` | 38 | No `useNotificationsStore` calls found |
| `stores/performance.ts` | 339 | Only self-reference + `.nuxt/` auto-generated |

### Orphaned Composables
Flagged by knip as having no imports anywhere:

- `composables/useAttachments.ts`
- `composables/useCollegeScorecardCache.ts`
- `composables/useCursorPagination.ts`
- `composables/useDocumentFetch.ts`
- `composables/useDocumentSharing.ts`
- `composables/useDocumentUpload.ts`
- `composables/useDocumentValidation.ts`
- `composables/useInteractionAttachments.ts`
- `composables/useNcaaCache.ts`
- `composables/useUserExport.ts`
- `composables/useValidation.ts`

### Orphaned Components
Flagged as never imported or used in templates. Some may be planned/in-progress features.

**Root-level components:**
- `components/AthleteSelector.vue`
- `components/CoachAnalyticsMetrics.vue`
- `components/CoachSelect.vue`
- `components/CommunicationPanel.vue`
- `components/DocumentCard.vue`
- `components/EditCoachModal.vue`
- `components/ExportButton.vue`
- `components/FeedbackButton.vue`
- `components/FileUpload.vue`
- `components/FormPageLayout.vue`
- `components/InteractionAttachments.vue`
- `components/SchoolSelect.vue`
- `components/ServiceUnavailable.vue`
- `components/SkipLink.vue`
- `components/SocialPostCard.vue`
- `components/TemplateEditor.vue`
- `components/TemplateSelector.vue`
- `components/TemplateSendModal.vue`
- `components/Tooltip.vue`
- `components/ViewIndicator.vue`

**Subdirectory components:**
- `components/Auth/AuthPageLayout.vue`, `AuthStatusIcon.vue`, `AuthStatusMessage.vue`, `PasswordRequirements.vue`
- `components/Coach/AddCoachModal.vue`, `OtherCoachModal.vue`
- `components/Dashboard/*` (8 components)
- `components/DesignSystem/*` (11 components + index.ts)
- `components/Document/DocumentForm.vue`
- `components/Event/EventForm.vue`
- `components/Help/HelpIcon.vue`, `HelpModal.vue`, `TooltipGuide.vue`, `helpDefinitions.ts`
- `components/Interaction/InteractionForm.vue`
- `components/Notification/NotificationCenter.vue`
- `components/Performance/MetricCategoryChart.vue`, `PerformanceRadarChart.vue`, `TimelineFilters.vue`
- `components/Recovery/RecoveryModal.vue`
- `components/School/FilterSelect.vue`, `SchoolListCard.vue`
- `components/Schools/FilterPanel.vue`, `SortSelector.vue`
- `components/Search/*` (6 components)
- `components/Settings/ProfilePhotoUpload.vue`
- `components/Suggestion/SuggestionHelpModal.vue`
- `components/Timeline/OverallStatusCard.vue`, `PortfolioHealth.vue`
- `components/Validation/ValidatedInput.vue`

### Orphaned Utilities
- `utils/authGuards.ts`
- `utils/autoTaskCompletion.ts`
- `utils/cache.ts`
- `utils/notificationHelpers.ts`
- `utils/parentMessaging.ts`
- `utils/performance.ts`
- `utils/printExport.ts`
- `utils/templateVariables.ts`

### Orphaned Types
- `types/admin.ts`
- `types/recovery.ts`
- `types/api/index.ts`
- `types/api/schools.ts`
- `types/api/tasks.ts`

### Orphaned Test Files (wrong location or component deleted)
- `tests/components/Event/EventForm.test.ts` — tests `EventForm.vue` which is also flagged as orphaned
- `tests/unit/composables/useValidation.test.ts` — tests `useValidation.ts` which is orphaned
- `tests/unit/validation/sanitize.test.ts`
- `tests/unit/validation/schemas.test.ts`
- `utils/positions.test.ts` — test file in `utils/` rather than `tests/`

### Server Utilities
- `server/utils/emailService.ts` — no API route imports it

---

## 🔴 DANGER — Do Not Delete

### Plugins (Auto-registered by Nuxt)
These are NOT referenced by name in source code but Nuxt auto-registers everything in `plugins/`. Knip cannot detect this pattern.
- `plugins/auth.client.ts`
- `plugins/correlation.client.ts`
- `plugins/error-handler.client.ts`
- `plugins/pinia-init.client.ts`

### Scripts
Build/migration scripts — used externally, not through imports:
- `scripts/apply-migrations.js`
- `scripts/create-index.js`
- `scripts/generate-index.js`
- `scripts/prepare-migrations.js`

### CSS Assets Used Transitively
`assets/styles/theme.css` and `assets/styles/transitions.css` — imported by `assets/css/main.css` (which IS in nuxt.config.ts).

---

## ❌ depcheck False Positives

depcheck cannot understand Nuxt module configs. These are all legitimately used:
- `@nuxtjs/supabase` — in `nuxt.config.ts` modules
- `@pinia/nuxt` — in `nuxt.config.ts` modules
- `autoprefixer` / `postcss` / `tailwindcss` — PostCSS config
- `@vitest/coverage-v8` — vitest coverage reporter
- `eslint-plugin-vue` — ESLint config
- `@types/dompurify` — TypeScript types (even if dompurify was replaced, types may still compile)
- `axe-core` / `pa11y` — accessibility testing tools
- `supabase` — CLI tool, not imported
- `chartjs-plugin-annotation`, `commander`, `vue-leaflet`, `@sindresorhus/is` — INVESTIGATE

---

## Action Plan

### Phase 1: SAFE (no risk)
1. Delete 3 duplicate "spec 2" test files
2. Delete `app.css` (root-level orphan)
3. Delete `assets/styles/main.css` (orphaned CSS)

### Phase 2: CAUTION (verify with tests)
4. Confirm and delete orphaned stores if no dynamic usage
5. Audit and delete orphaned composables
6. Clean up orphaned type files

### Phase 3: Review (needs business context)
7. Component cleanup — confirm each is truly unneeded (not planned feature)
8. Utility cleanup — verify not used via dynamic imports
