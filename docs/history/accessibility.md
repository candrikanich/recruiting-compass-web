# History: Accessibility

## 2026-02-09 — Interactions Page A11y Audit
Full WCAG 2.1 AA audit of interactions page: 16 issues (5 critical, 5 high) covering focus indicators, label associations, skip links, live regions.

## ~2026-02 — Landing Page A11y Audit
Landing page a11y audit: 4 critical, 5 high, 4 medium, 3 low issues (focus indicators, reduced-motion, color contrast, semantic markup). Landing page later redesigned.

## ~2026-02 — School Detail A11y Audit Suite
WCAG 2.1 AA audit of school detail page: ~70% compliant, 14 issues (7 critical, 6 high, 3 medium). Included README index, detailed findings, and fix tracker (14/23 completed at time of archival). Most issues since addressed.

## 2026-03-07 — Accessibility improvements
vitest-axe form tests, SchoolLogo ARIA fallback fix, pa11y WCAG 2.2 upgrade + URL expansion, and keyboard-testing docs.

## 2026-02-19 — WCAG 2.1 AA review
Bottom-up a11y fixes across DesignSystem, layout, and 63 pages plus axe regression tests in Vitest/Playwright (3-tier leverage strategy).

## 2026-02-18 — Dashboard a11y
Landmarks, skip link, and ARIA fixes raising the dashboard from ~25-30% to 75-80% WCAG 2.1 AA.

## 2026-02-17 — Interactions page a11y
All 16 a11y fixes on `/interactions` (skip link, live regions, labels) — WCAG 2.1 AA compliant.

## 2026-02-16 — School-detail a11y implementation
Implemented all critical/high/medium fixes from the school-detail audit (SchoolDocumentsCard etc.), raising ~70% → 95%+ compliance; all tests passing.

## 2026-02-08 — Login page a11y remediation
Raised the login page from ~55% to 98-99% WCAG 2.1 AA — 11 critical/high + 8 medium fixes across 5 commits, plus a testing checklist and CI a11y automation.
