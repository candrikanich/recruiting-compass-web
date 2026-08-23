# History: Onboarding

## 2026-08-09 — Position vocabulary normalization
Completed (Phases 1 & 2): consolidated six conflicting position vocabularies into one canonical full-name map (`utils/positions/canonical.ts`), removed "Infielder"/"Outfielder", backfilled the DB, and deleted the dead Screen2 wizard. Only optional vestigial-table drops remain.

## 2026-02-03 — Player onboarding + family linking
Implementation plan for the player onboarding flow and family linking; shipped and live (onboarding pages/composable exist). Retained as historical record.

## 2026-03-01 — Parent onboarding banner
Amber onboarding banner + empty-state card for parents with no connected athlete, guiding them to family-management (`ParentOnboardingBanner` + `ParentNoAthleteEmptyState`).

## 2026-02-04 — Onboarding data prepopulation
Auto-populate Player Details from onboarding data, sport-specific position lookup (`useSportsPositionLookup`), and auto-save form fields on blur (`useAutoSave`).
