# iOS Phase 4 Handoff: Settings & Advanced Features

**Date:** February 8, 2026
**Status:** Specs Complete, Ready for iOS Implementation
**Phase:** 4 of 6

---

## Completed Specs

| #   | Page                  | Spec File                             | Complexity | Est. Time |
| --- | --------------------- | ------------------------------------- | ---------- | --------- |
| 14  | Family Management     | `iOS_SPEC_Phase4_FamilyManagement.md` | High       | 4-5 days  |
| 15  | Preferences (5 pages) | `iOS_SPEC_Phase4_Preferences.md`      | Medium     | 4-5 days  |
| 16  | Notifications         | `iOS_SPEC_Phase4_Notifications.md`    | Low        | 2 days    |
| 17  | Activity Feed         | `iOS_SPEC_Phase4_ActivityFeed.md`     | Medium     | 2-3 days  |

**Total Estimated Time:** 12-15 days

---

## Recommended Build Order

1. **Notifications** (2 days) — Simplest page, establishes notification display pattern
2. **Activity Feed** (2-3 days) — Read-only timeline, establishes multi-source data aggregation
3. **Preferences: Notification Settings** (0.5 day) — Establishes V2 preference API pattern
4. **Preferences: Dashboard** (0.5 day) — Simple toggles, reuses preference pattern
5. **Preferences: Location** (1 day) — Small form + CLGeocoder integration
6. **Preferences: School Preferences** (1.5 days) — Drag-to-reorder, templates, add modal
7. **Preferences: Player Details** (2 days) — Largest form (40+ fields), photo upload
8. **Family Management** (4-5 days) — Most complex: role-based views, code workflow

---

## Key Patterns Established in Phase 4

### V2 Preference API Pattern

All 5 preference pages use the same category-based API:

- `GET /api/user/preferences/[category]`
- `POST /api/user/preferences/[category]`
- Build a shared `PreferenceService` Swift class once, reuse across all pages

### Role-Based Views

Family Management and Player Details show different UI based on user role (player vs parent). This pattern will be reused in future phases.

### Multi-Source Data Aggregation

Activity Feed merges 3 Supabase tables into a unified timeline. Similar pattern can be used for future reporting features.

### Real-Time Subscriptions

Activity Feed dashboard widget uses Supabase Realtime channels. This pattern will be needed for future real-time features.

---

## Dependencies on Previous Phases

- **Phase 1 (Auth):** All pages require authentication
- **Phase 2 (Dashboard):** Dashboard widget displays activity feed and notification count
- **Phase 3 (Detail Pages):** Notification `action_url` navigates to coach/school/interaction detail pages

---

## What Remains After Phase 4

### Phase 5: Reports & Analytics (Week 6-7)

- Performance/Analytics pages (charts)
- Offers Tracking (CRUD)
- Tasks / Recruiting Timeline
- Communication Templates

### Phase 6: Polish & Edge Cases (Week 7-8)

- Social features, Documents, Events, Reports
- Admin pages (likely skip for iOS)
- Legal pages

---

## Known Risks

- **Family Management** is the most complex page in Phase 4 — consider breaking into sub-tasks
- **Player Details** has 40+ form fields — test keyboard management and scroll behavior carefully
- **School Preferences** drag-to-reorder needs iOS-native implementation via `List.onMove`
- **Activity Feed** real-time subscription should be carefully managed to avoid memory leaks
