# History: iOS

## 2026-09-20 — Timeline Shared-Endpoint Sync
Fixed a scoring/task divergence between web and iOS dashboards by having iOS consume shared web API endpoints (/api/athlete/phase, /status, /what-matters-now) instead of recomputing status locally, eliminating a duplicated/buggy scoring implementation.

## 2026-09-20 — Player Details Tab Reorg & Multi Travel Teams
Confirmed the Basics/Academics tab reorg was already done on iOS, then specified the one real remaining gap: multiple travel teams (a repeatable array replacing scalar fields), plus minor video-platform and ID-helper-link follow-ups.

## 2026-09-20 — Gymnastics & Beach Volleyball Sport Parity
Extended the canonical sport vocabulary from 17 to 19 sports (added Gymnastics, Beach Volleyball) across iOS positions/metrics/calendar registries to match a shipped web change.

## 2026-09-20 — Coach Tile & Detail Consolidation (iOS)
Unified two divergent iOS coach-tile components into one variant-driven CoachCardView (compact/full), removed tile-level delete, fixed the action-row icon order/colors, and wired compact tiles to push to coach detail, matching a shipped web consolidation.

## 2026-08-15 — iOS Positions Ordered Specificity
iOS delta spec for ordered positions + recruiting specificity parity: remove Utility from baseball/softball, treat positions[] as ordered (index 0=primary), add sport-scoped abbreviation helper.

## 2026-02-28 — iOS Family Unit Symmetric Redesign
iOS implementation plan for symmetric family unit redesign matching web: invite-accept universal links, FamilyUnit model migration from playerUserId to createdByUserId.

## ~2026-02 — iOS Page Priority & Sequencing
iOS app page priority plan: 57 pages across 4-5 phases (8-10 weeks), foundation/auth → core → advanced → polish. Early planning superseded as iOS app progressed.

## 2026-02-10 — iOS Phase 6 Specs (Documents, Reports, Social)
Seven Phase 6 iOS page specs completed: Document Detail, Document Viewer, Documents List, Reports Dashboard, Social Analytics, Social Media Monitoring, and Recruiting Timeline Report. All specs follow the established iOS page spec template and define data requirements, navigation, and SwiftUI component patterns.

## 2026-02-05 — iOS Architecture Mirroring Strategy
Established iOS architecture patterns that parallel the Nuxt/Vue web structure: ViewModel ↔ Composable, SwiftUI View ↔ Vue Component, @EnvironmentObject ↔ Pinia Store. Team can reason about both codebases using the same mental models.
