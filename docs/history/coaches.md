# History: Coaches

## 2026-09-20 — Coach Outreach Template Schema Reconciliation
Investigated the coach-outreach template seed's assumed schema against the live DB, found major mismatches (metrics stored numeric vs. required text, ~18 assumed columns actually living in a user_preferences jsonb blob), and documented that the feature already ships via communication_templates with an ad-hoc, non-registry-driven resolver.

## 2026-09-20 — Questionnaire Gating & Metric Form Parity (iOS)
Added per-school recruiting-questionnaire gating (a new questionnaireNote template variable) plus log-metric unit-dropdown and 3-decimal-precision fixes on iOS, mostly confirmed shipped in a follow-up audit.

## 2026-09-20 — Coach Detail Redesign (iOS)
Ported the web Coach Detail redesign to iOS: two new DB fields (tags/source), a 9-section vertical layout, and the ported useCoachInsights scoring logic.

## 2026-09-20 — Coach Detail Follow-ups (iOS)
Five polish follow-ups to the iOS coach detail screen: school-logo avatar, formatted phone, days-since-contact from interaction history, filter-bar confirm-only, and a boxed Send-Profile card - building on the shipped web redesign.

## 2026-09-20 — Coach Outreach Compose UX (Slice 5)
Designed the coach-outreach compose UX overhaul: a full variables panel, live preview with bolded unresolved tokens, a send gate blocking half-templated sends, and inline/linked editing of profile, computed, and authored template variables, phased 5a through 5e. Superseded in later phases by the Unified Missing-Info Step work.

## 2026-09-20 — Coach Detail Header & Analytics Card
Follow-up to the initial Coach Detail redesign: added the full-width Coach Detail header toolbar, a "Communication History & Analytics" card with sent/received and response-rate gauges, and encoded KPI rings on the stat cards, matching the fuller Figma frame the first pass only partially shipped.

## 2026-09-20 — Coach Detail Communication Consolidation
Fixed the web coach-outreach template resolver bug (optional-segment gate wrapper leaking into rendered messages), moved the text-composer from a modal to a side-panel to match the email drawer, and folded the separate Analytics/Communications pages into the Coach Detail page.

## 2026-09-20 — Public-Profile Inbound-to-Interaction Linking
Closed the gap where inbound public-profile coach messages (Contact/Express Interest) never became tracked CRM interactions - added a new "interest" interaction type, auto-created a coach-linked interaction when the coach's email matches an existing CRM contact, and added a human "Assign coach" dedup gate in the inbox for unmatched leads.

## 2026-09-20 — Coach Detail Page Redesign (Web)
Rebuilt the web Coach Detail page to a two-column Figma layout, adding persisted tags/source fields on coaches and a derived-insights composable (overdue alerts, preferred channel, response rate) rendered via new left-rail/right-column components, retiring the old detail sub-components.

## 2026-09-20 — Unified Missing-Info Compose Step
Brought the web coach-outreach composer to parity with iOS's unified "Complete your info" step - a single ordered, missing-only info-gathering stage inserted between compose and preview, replacing scattered questionnaire/metric/variable prompts, and adding a new intendedMajor template variable.

## 2026-08-15 — Coach Detail Consolidation
Retired bespoke school-scoped coach detail page, making /coaches/[id] the single canonical detail page with context-aware back navigation and 301 redirect from old route.

## 2026-08-14 — Coach Tile Unification
Unified 3 divergent coach tile renderings into one prop-driven CoachCard.vue with compact/full variants and fixed-order action icons.

## 2026-08-07 — Coach-outreach template migration/build plan
Ordered Phase 0-6 plan for wiring the template library into `communication_templates` — schema decisions, source_path resolver contract, per-phase SQL. All phases shipped to prod; doc records the decisions.
