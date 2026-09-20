# History: Schools

## 2026-09-20 — School Metadata Enrichment (Enrich/Autocomplete/Backfill Triggers)
Built a shared school-metadata lookup utility (mascot/colors/athletics URL/conference) and wired it into enrich/autocomplete/backfill triggers, completing the one task not already covered by other merged PRs.

## 2026-09-20 — School Metadata Data Source Spike
Investigated Wikidata as a data source for school mascots/colors/athletics URLs, found coverage too low, and recommended a three-source static hybrid (existing ncaaSchools.json, Wikipedia table extraction, NCAA team-colors GitHub dataset) instead - feeding directly into the later School Data Enrichment work.

## 2026-09-20 — School Data Enrichment (Mascot/Colors/Scholarship)
Brought iOS to parity with a merged web change adding editable school mascot/colors, an auto-resolved conference-website link, and a scholarship-limit reference line on the College Data section.

## 2026-09-20 — Researching Status Parity (iOS)
Added the missing "researching" case to iOS's SchoolStatus enum (label, badge color, funnel order) so schools using that live DB status render correctly instead of falling back to Unknown.

## 2026-09-20 — School Status Pipeline Formalization
Formalized the school recruiting-status pipeline into one canonical ordered stage list (researching -> contacted -> visiting -> offer_received -> committed -> not_pursuing) shared by iOS and web, moved "interested" to the favorite flag, and redefined the "Contacted" stat as interaction-derived, with auto-advance triggers and a UI stepper phased in.

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
