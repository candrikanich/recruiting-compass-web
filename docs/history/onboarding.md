# History: Onboarding

## 2026-09-20 — Onboarding Funnel Reshape (2-Step Wizard + Dashboard Checklist)
Reshaped onboarding from a 5-step wizard to a 2-step value-first flow with inline school recommendations, a dashboard "Getting Started" checklist, a ProfileCompleteness card, upgraded empty states, and contextual profile prompts.

## 2026-09-20 — Age-Gate & Onboarding Parity
Added COPPA-compliant DOB attestation copy, confirmed a 13+ minimum age, widened the grad-year picker to +5 years, and added an age gate on profile-DOB edits, backed by a live DB trigger enforcing the 13+ floor.

## 2026-08-16 — Bidirectional Onboarding Pre-fill
Web Phases 1-3 built: persist playerDob, hydrateAthleteProfile on invite-accept, onboarding reads canonical prefs. Player-authoritative conflict resolution rule. iOS Phase 4 deferred to separate handoff.

## 2026-08-09 — Position vocabulary normalization
Completed (Phases 1 & 2): consolidated six conflicting position vocabularies into one canonical full-name map (`utils/positions/canonical.ts`), removed "Infielder"/"Outfielder", backfilled the DB, and deleted the dead Screen2 wizard. Only optional vestigial-table drops remain.

## 2026-02-03 — Player onboarding + family linking
Implementation plan for the player onboarding flow and family linking; shipped and live (onboarding pages/composable exist). Retained as historical record.

## 2026-03-01 — Parent onboarding banner
Amber onboarding banner + empty-state card for parents with no connected athlete, guiding them to family-management (`ParentOnboardingBanner` + `ParentNoAthleteEmptyState`).

## 2026-02-04 — Onboarding data prepopulation
Auto-populate Player Details from onboarding data, sport-specific position lookup (`useSportsPositionLookup`), and auto-save form fields on blur (`useAutoSave`).
