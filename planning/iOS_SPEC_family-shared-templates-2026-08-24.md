# iOS Handoff — Family-Shared Communication Templates

**Source of truth:** web `feat/family-shared-templates`. Parity task.
**Date:** 2026-08-24
**DB:** migration already APPLIED LIVE to `xpxzhqghxecsjhvklsqg` (serves prod+QA). iOS
needs no schema work — only client query/scoping changes.

## What changed & why

`communication_templates` was user-scoped (`user_id` owner only) — a template a
user created was private to that account, invisible even to linked family
members. Product decision: templates belong to the **whole family** so a parent
can proofread/tweak a template the player then sends. This matches every other
domain table (schools, coaches, documents, interactions, athlete_messages) which
are family-symmetric.

## DB shape now (live)

- New column `communication_templates.family_unit_id uuid` → FK `family_units(id)`
  `ON DELETE CASCADE`, indexed.
- `BEFORE INSERT OR UPDATE` trigger `derive_family_unit_id()` stamps it from the
  writer's `user_id` when unambiguous (never raises).
- RLS replaced: **one permissive policy per verb**, all keyed on
  `family_unit_id IN (SELECT family_unit_id FROM family_members WHERE user_id = auth.uid())`.
  - SELECT also OR's `is_predefined = true` (global built-ins stay visible to all).
  - INSERT/UPDATE/DELETE additionally require `is_predefined IS NOT TRUE`
    (users can't create/modify/delete built-ins).
- Predefined rows: `is_predefined = true`, `user_id` NULL, `family_unit_id` NULL.

## iOS changes required

File: `Features/CommunicationTemplates/Services/CommunicationTemplatesService.swift`
(all template Supabase access lives here — confirmed).

### 1. Model — add family_unit_id
`Models/CommunicationTemplate.swift`: add `familyUnitId: UUID?`
(CodingKey `family_unit_id`). Optional/nullable (predefined rows have NULL).

### 2. fetchTemplates() — scope by family, not user
Current `or` filter (lines ~55–57):
```
user_id.eq.<userId>,is_predefined.eq.true
```
Change to family scope. Resolve the **active family unit id** the same way iOS
already does for schools/coaches (the app has an active-family concept for the
parent athlete-switcher — reuse it). Then:
```
family_unit_id.eq.<activeFamilyId>,is_predefined.eq.true
```
If no active family id is resolvable, fall back to `is_predefined.eq.true` only
(don't send an empty/invalid filter). RLS enforces the same scope server-side, so
this filter is for payload tightness + correct behavior, not security.

### 3. create (TemplatePayload) — stamp family_unit_id
Add `family_unit_id: <activeFamilyId>` to the insert payload alongside `user_id`.
The DB trigger also derives it, but stamp explicitly for the parent-writing case
(a parent's `user_id` must resolve to the athlete's family — explicit stamp is
unambiguous). Keep `user_id` = current session user (authorship/audit).

### 4. update / delete — drop any user_id filter
If iOS filters update/delete by `user_id`, remove it — RLS now scopes to the
family. Filter by `id` only (matches web). A 0-row update/delete now means
"built-in or another family," not "not yours."

## Behavior after change (both platforms)

- Any family member (parent or player) sees, edits, deletes any family template.
- Built-in/predefined templates: visible to all, editable by none (customizing
  one creates an owned family copy — web does this in TemplateEditor; verify iOS
  parity if it offers "customize built-in").
- Author (`user_id`) is retained for provenance but no longer gates access.

## Web reference (for exact parity)

- Composable: `composables/useCommunicationTemplates.ts`
  - `loadTemplates` — family-or-predefined `.or()` filter
  - `createTemplate` — stamps `family_unit_id: activeFamily.activeFamilyId`
  - `updateTemplate` / `deleteTemplate` — `id`-only filter, RLS-scoped
- Migration: `supabase/migrations/20260906000000_family_shared_communication_templates.sql`
- Tests: `tests/unit/composables/useCommunicationTemplates.familyScope.spec.ts`

## Verify (iOS)

1. Parent account, switch to athlete → create a template → sign in as that player
   → template appears, is editable.
2. Player creates a template → parent (viewing that athlete) sees + edits it.
3. Two different families do NOT see each other's templates.
4. Predefined built-ins still list for everyone; edit/delete blocked.
