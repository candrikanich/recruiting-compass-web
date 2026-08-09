# History: Schools

## 2026-03-17 — Smart input enrichment
Replaced free-text high-school/address/social inputs with autocomplete storing canonical IDs/coords (`nces_schools` table, Radar.io proxy, handle normalization).

## 2026-03-16 — Recruiting packet completion
Fixed the packet feature (queried non-existent tables); now reads real athlete data from usePreferenceManager/userStore and added `video_links` + `core_courses` fields.

## 2026-03-15 — School fit signals redesign
Replaced the 4-dimension composite fit score with two honest signals (Personal Fit + Academic Fit via College Scorecard API); removed athletic/opportunity fit and reach/match/safety tiers.

## 2026-02-20 — Display school info fields
Surfaced saved-but-hidden fields (address, mascot, facility, undergrad size, Twitter) in the school detail Information section.

## 2026-02-05 — School testing suite (Phase 1)
Test plan, fixtures, and mock-data factories toward an 80% coverage target; Phases 2-4 never started.
