# History: Family

## 2026-01-31 — Family Unit System Implementation (Phase 1–4)
Implemented family unit foundation: family_units and family_members tables, RLS policies, family code generation and joining, and parent/player linking. 40% complete at end of session; phases 1–4 (foundations) done, UI/API/testing remaining.

## 2026-01-31 — Family Context Data Visibility Fixes
Fixed parent2 not seeing up-to-date data when switching between linked athletes. Root cause was stale Pinia store state not being cleared on athlete switch. Added `$reset()` calls on athlete context change; all family members now see live data.

## 2026-01-31 — Family Code Feature
Implemented family code generation (6-char alphanumeric), join-by-code flow, and family member listing. Parents can share a code; athletes use it to link their account to the family unit.
