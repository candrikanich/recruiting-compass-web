# Plan: Codebase Audit Remediation

> Source PRD: `prd/audit-remediation.md` (2026-07-27). File:line findings: `planning/audit-2026-07-27-findings.md`.

## Architectural decisions

Durable decisions that apply across all phases:

- **Authorization model**: `family_units` / `family_members` is the single authoritative access model. Legacy `account_links`-era RLS policies, helpers, and composables are removed, not maintained. Server-side ownership checks remain mandatory on every service-role endpoint.
- **Schema**: `task` gains a stable unique `slug` column (seeded); `users.current_phase` is the single source of truth for recruiting phase (grade-derived default); `notification` gains `action_url`; audit-reference FKs to users become `SET NULL`, data-owning FKs `CASCADE`. All schema changes ship as guarded, idempotent migrations.
- **Invite policy** (product decision, confirmed): invite acceptance requires authenticated email == invited email. Unauthenticated invite preview returns family name only.
- **Auth lifecycle**: one orchestrator owns auth-state transitions; every domain store exposes a `reset()`; fetch-guard flags are keyed by family id; logout always includes provider sign-out.
- **Dates**: one shared local-date utility for parsing/formatting/comparing date-only strings; date-range upper bounds are exclusive (`< end + 1 day`); "today" always derives from local date parts. Direct `new Date(dateOnlyString)` is lint-restricted.
- **Errors**: composables surface mutation errors as state; user-visible failures render through design-system error/toast components with retry; native `alert()`/`confirm()` are banned in favor of the design-system dialog. Supabase errors are always checked; 0-row writes are failures.
- **Types**: generated Supabase types are regenerated after every schema change; `(supabase as any)` casts are a lint smell, not a pattern.
- **Modals**: the remediated dialog pattern (role=dialog, aria-modal, Escape, focus trap composable, focus restore) is the only modal pattern.
- **Testing**: every phase lands with tests for what it fixes (bug-driven TDD: failing test first). Tautological tests are deleted, never imitated. Verification gate per phase: `npm run type-check`, `npm run lint`, `npm test`, plus phase-specific manual/e2e verification.

---

## Phase 1: RLS security hotfix

**User stories**: 1, 2, 6, 7

### What to build

One migration set closing the active RLS holes: events policies lose the `school_id IS NULL` escape (ownership predicate instead); the athlete-status RPC either checks caller identity internally or loses public EXECUTE; family-unit updates get a WITH CHECK preventing owner reassignment; interaction inserts force attribution to the authenticated user. Also remove the admin-signup console.log that dumps the auth payload. Applied to QA first, then prod via normal deploy.

### Acceptance criteria

- [ ] Authenticated user A cannot select/update/delete user B's school-less events (proven by direct DB test as both roles)
- [ ] `rpc('get_athlete_status', other_user_id)` fails for non-family callers (anon and authenticated)
- [ ] Family member cannot change `created_by_user_id`; interaction insert with forged `logged_by` is rejected or overridden
- [ ] No auth tokens/session objects logged anywhere in signup flow
- [ ] RLS regression tests exist for each policy touched; full gate passes

---

## Phase 2: Invite hardening

**User stories**: 3, 4

### What to build

Invite acceptance rejects when the authenticated email doesn't match the invited email (clear user-facing message offering sign-in with the right account). The unauthenticated invite preview endpoint returns only the family name — child PII (name, grad year, sport, position) moves behind acceptance.

### Acceptance criteria

- [ ] Accepting an invite with a mismatched email returns a 4xx with friendly message; family membership unchanged
- [ ] Unauthenticated token GET response contains no athlete PII fields
- [ ] Invite accept flow e2e (family-invite bucket) still passes; mismatch path has a new test
- [ ] Full gate passes

---

## Phase 3: GDPR deletion end-to-end

**User stories**: 5, 50 (cron portion)

### What to build

Make scheduled account deletion actually complete: migrations move blocking FKs to SET NULL (audit columns) or CASCADE (owned data); the deletion cron checks every step's error, aborts per-user before auth-record deletion on failure, covers all referencing tables, and reports real per-user outcomes. Integration tests cover success, FK-blocked, and partial-failure paths using the established mutable mock-server pattern.

### Acceptance criteria

- [ ] Deleting a user in every family topology (solo, family creator with members, invitee) completes fully on a QA clone
- [ ] Cron response distinguishes deleted / failed / skipped truthfully; failures logged with cause
- [ ] No orphaned application rows and no orphaned auth records after runs
- [ ] Integration tests for the cron's success and failure paths; full gate passes

---

## Phase 4: Auth lifecycle

**User stories**: 12, 13, 30, 31

### What to build

A single auth-change orchestrator: on logout or account switch it resets every domain store (each gains a reset action), clears module-scope singletons, and always performs provider sign-out (including the inactivity timeout path). Session duration honors the stored remember-me expiry instead of a hardcoded window. Fetch guards become family-keyed so athlete switches rebuild state.

### Acceptance criteria

- [ ] Logout → login as different account in same tab shows zero prior-account data (schools, coaches, offers, family header) — verified in browser
- [ ] Inactivity timeout followed by reload does NOT restore the session
- [ ] Non-remember-me session expires per its stored expiry
- [ ] Parent athlete-switch rebuilds dashboards with no stale flash of prior athlete's data
- [ ] Unit tests for orchestrator + each store reset; full gate passes

---

## Phase 5: Phase system repair

**User stories**: 14, 15, 50 (advance portion)

### What to build

Reconcile milestone identity: seed migration adds unique slugs to tasks; milestone definitions resolve slugs to task ids at evaluation time; phase read and advance endpoints both operate on stored `users.current_phase` (grade-derived default for users who never advanced). Endpoint tests cover advance authorization, milestone gating, and read-after-write consistency.

### Acceptance criteria

- [ ] Completing the required milestone tasks enables advancement in the real app (browser-verified with a seeded athlete)
- [ ] After advancing, phase read endpoint and UI reflect the new phase immediately and after reload
- [ ] Milestone progress percentage is nonzero for partially-complete athletes
- [ ] Advance endpoint has tests (authz, gating, idempotency); full gate passes

---

## Phase 6: Parent-view identity

**User stories**: 17, 18, 19, 26

### What to build

Thread the viewed-athlete identity consistently: athlete-tasks endpoint accepts and authorizes the athlete id parameter (same resolution helper as tasks); events fetch/update/delete use the data-owner id with a null guard before insert; the task read-only guard rewires to the active-family context and the dead legacy composable is deleted; the accessible-families payload populates graduation year so default-athlete selection works.

### Acceptance criteria

- [ ] Parent viewing athlete sees the athlete's true task completion states
- [ ] Parent-created event persists across reload and is visible to the athlete
- [ ] Parent cannot toggle athlete task completion from the timeline (guard active)
- [ ] Multi-athlete parent lands on closest-to-graduation athlete by default
- [ ] Cross-account authz tests for the athlete-id parameter; full gate passes

---

## Phase 7: Date/timezone class fix

**User stories**: 22, 23

### What to build

One shared local-date utility (parse date-only as local, day-granularity compare, local "today"); sweep every date-only consumer — formatters, exports, deadlines, reminders, offers, dashboards, event stats, datetime-local defaults — onto it. Range filters become exclusive upper bound. Lint rule restricts direct date-only string construction.

### Acceptance criteria

- [ ] With system TZ set to America/New_York (and verified again in America/Los_Angeles): deadlines, offer expirations, reminders, and event dates display the calendar day stored — never a day early
- [ ] A reminder due today is not "overdue" the prior evening; today's events appear in dashboard/upcoming all day local time
- [ ] Date-range filter including end day returns end-day records; same-day range non-empty
- [ ] Unit tests run assertions under non-UTC TZ; lint rule active; full gate passes

---

## Phase 8: Correctness batch

**User stories**: 16, 20, 21, 24, 27, 28, 29, 32

### What to build

The verified functional bugs, each with a failing test first: deadlines response-envelope fix; notification schema alignment (add `action_url`, align type/priority enums) plus notification list reactivity; search pushes the term into the DB query before limiting; college-search cache key includes requested shape; status recalculation propagates query errors instead of persisting zeroed scores; 0-row deletes/updates reported as failures; latest-wins sequence tokens in typeaheads and domain fetches; compound pagination cursor; auto-save flush on unmount. Dead ghost-schema code paths found alongside (entity search columns, collaboration table, family-code lookups) are deleted here if not already gone.

### Acceptance criteria

- [ ] Deadlines page loads, renders, and deletes entries without error
- [ ] Notification create succeeds for every zod-accepted payload; unread badge updates without navigation
- [ ] Search finds a matching record beyond the first 20 rows
- [ ] Transient DB error during recalculation leaves stored score unchanged
- [ ] RLS-blocked delete shows an error and the item remains in the list
- [ ] Rapid typing/athlete switching never renders stale results (sequence-token unit tests)
- [ ] Each fix has its bug-reproducing test; full gate passes

---

## Phase 9: Error-surfacing UX

**User stories**: 33, 34, 35

### What to build

Standardize mutation failure visibility: every save/delete path (interactions, offers, timeline toggles, settings auto-save, attachments) surfaces a visible, plain-language error with input preserved and retry where sensible. Native alert/confirm sites migrate to the design-system dialog; raw technical messages stop reaching users. Design-system empty/error/loading states adopted on every surface this phase touches.

### Acceptance criteria

- [ ] Simulated network failure on each named mutation shows a visible error; entered data survives; no silent console-only paths remain in those flows
- [ ] Zero native `alert()`/`confirm()` calls in pages/components
- [ ] Error copy contains no raw error objects/Postgres text
- [ ] Component tests assert error rendering per flow; full gate passes

---

## Phase 10: Type regeneration & consolidation

**User stories**: 25, 42–48

### What to build

Regenerate Supabase types after adding genuinely-missing tables/columns to the schema; remove the `(supabase as any)` cast class. Consolidation migration drops legacy account-links-era RLS policies (family model now authoritative — verified against phase 1–6 behavior). Delete dead code: duplicate coaches route, legacy composables, ghost features, empty auto-completion triggers. ESLint `no-console` lands with the remaining logger migration; server-only utilities move out of client bundles; file-validation logic collapses to one configurable utility; the three god-pages decompose into composables/components under the size limit.

### Acceptance criteria

- [ ] Non-test `any` count reduced by an order of magnitude; no `(supabase as any)` remains
- [ ] Exactly one permissive policy set (family model) per verb per table; access behavior unchanged for legitimate users (RLS test suite from phase 1 still green)
- [ ] `no-console` lint active and passing; dead route/composables gone; no server-utils imports from client code
- [ ] All three god-pages under the 800-line max with behavior intact
- [ ] Full gate passes; e2e smoke on schools/tasks/dashboard/family flows green

---

## Phase 11: Test debt

**User stories**: 49–53

### What to build

Delete all tautological tests in one honest commit. Then write real coverage, prioritized: parent access control (integration), auth/onboarding flow, athlete-access authz helper, remaining cron jobs, then untested endpoints (preferences, suggestions surface, admin delete, export) and high-risk composables (notifications, document upload/sharing). CSRF middleware exports its predicates; its test imports them. Every bare e2e skip gains a reason string.

### Acceptance criteria

- [ ] Zero `expect(true).toBe(true)` in the suite; test count drop documented in the commit
- [ ] Parent access control, auth/onboarding, athlete-access helper, and all cron jobs have real behavioral tests
- [ ] CSRF test fails when middleware exemption list changes (proven by temporary mutation)
- [ ] Zero reason-less `test.skip()` in e2e
- [ ] Coverage thresholds raised to current honest floor; full gate passes

---

## Phase 12: Accessibility sweep

**User stories**: 36–41

### What to build

Apply the remediated dialog pattern to all twelve non-compliant modals; accessible names for the task checkbox, icon-only buttons, and preview images; keyboard/focus/role semantics for clickable cards and search tabs; live regions for search results and toasts; expanded-state attributes on disclosures; text or icon supplements everywhere status is color-only (timeline dots, offer comparison); fix the dead backdrop-opacity class. Design-token drift (stock green/yellow/gray → brand palette) normalized on touched files; chart hex literals gain sanctioned audit-ignore annotations.

### Acceptance criteria

- [ ] Every modal: Tab cycles inside, Escape closes, focus returns to trigger, announced as dialog (manually verified with keyboard + VoiceOver on a sample)
- [ ] No icon-only control without an accessible name in the audited set; images have alt
- [ ] Search operable and announced end-to-end with keyboard only
- [ ] All status indicators carry a non-color cue
- [ ] `npm run audit:tokens` reports 0 errors and 0 warnings; full gate passes
