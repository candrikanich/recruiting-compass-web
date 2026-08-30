# History: Coaches

## 2026-08-15 — Coach Detail Consolidation
Retired bespoke school-scoped coach detail page, making /coaches/[id] the single canonical detail page with context-aware back navigation and 301 redirect from old route.

## 2026-08-14 — Coach Tile Unification
Unified 3 divergent coach tile renderings into one prop-driven CoachCard.vue with compact/full variants and fixed-order action icons.

## 2026-08-07 — Coach-outreach template migration/build plan
Ordered Phase 0-6 plan for wiring the template library into `communication_templates` — schema decisions, source_path resolver contract, per-phase SQL. All phases shipped to prod; doc records the decisions.
