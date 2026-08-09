# History: UI

## 2026-03-10 — Vue standards refactor & Vue 3 safe fixes
Eliminated 20 Vue/Pinia antipatterns from a vue-specialist audit (Setup Stores, store-delegating composables, no self-fetching components) and applied 10 zero-behavior-change Vue 3 quality fixes (dead imports, VueUse adoption, query/template cleanup).

## 2026-03-10 — Design system spec & token consolidation
Wrote `docs/design/` spec files and consolidated two token systems so `main.css @theme` is the single source of hex values (added missing indigo palette).

## 2026-03-08 — User profile page
Unified `/settings/profile` (identity, security, deletion) for all users with profile PATCH, change-email, and change-password endpoints; retired `account.vue`.

## 2026-03-08 — Dashboard drag-drop layout
WYSIWYG two-column drag-and-drop dashboard editor (vue-draggable-plus, `DashboardLayout` type); dashboard renders dynamically from saved layout, wired to the Settings customization page.

## 2026-03-08 — About page
Authenticated About page with mission statement + structured feedback form (`pages/about.vue` + `POST /api/feedback`, Zod-validated, Resend email).

## 2026-02-16 — Single-row filters
Added a `columns` prop to UniversalFilter; Documents/Events filters constrained to a single 4-col desktop row, responsive.

## 2026-02-16 — Log metric modal
Replaced the inline performance form with `LogMetricModal` (Teleport) supporting event association.

## 2026-02-16 — Documents upload button in header
Moved the Documents upload button into the PageHeader `#actions` slot for cross-page consistency.

## 2026-02-15 — Timeline task-first redesign
Reorganized `/timeline` so tasks are hero content; added `TimelineStatPills` and a collapsible guidance sidebar.

## 2026-02-15 — Summary tiles
Generic `StatsTiles` component + per-domain stat composables placed above filters on schools/coaches/events.

## 2026-02-15 — Interactions card layout
Switched the interactions page from a vertical list to a responsive card grid matching schools/coaches.

## 2026-02-15 — Header standardization
Shared `PageHeader` component (gradient bg, title/description, `#actions` slot) applied across ~12 pages.

## 2026-02-15 — Form standardization
Built reusable `FormInput`/`Select`/`Textarea` and migrated the Event/School/Coach/Interaction forms to them.

## 2026-02-14 — Merge high-school section
Merged the standalone High School section into Basic Info on player-details, replacing the text field with four detailed school fields.
