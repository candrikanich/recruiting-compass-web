# History: E2E

## 2026-05-27 — Skip triage
Fixed 3 heroicons→UIcon unit regressions (green at 7627); proved the 80 E2E failures were seed/auth-infra flake not a regression; retired skip buckets D+A (B+C remain gated on seed infra).

## 2026-05-22 — Playwright rewrite / skipped-tests triage
Tier audit + triage of ~330 skipped E2E tests into buckets to restore suite trustworthiness (kill vacuous assertions/fake skips); superseded by later June/July e2e-reliability work.

## 2026-03-16 — E2E test overhaul
Reworked a 914-test suite into ~600 honest tests using Playwright `storageState` auth; removed shared-email cascades, per-test signups, and vacuous assertions.

## 2026-03-16 — Documents E2E
Added 3 spec files (documents CRUD, sharing, search) — 36 scenarios / 1,435 lines.

## 2026-03-02 — E2E coverage fixes
Fixed stale selectors, broken login/signup/family flows, placeholder tests, and hardcoded BASE_URL.
