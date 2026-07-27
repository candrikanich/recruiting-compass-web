# PRD: Codebase Audit Remediation

**Date:** 2026-07-27
**Source:** Six-domain parallel audit (Vue/Nuxt standards, SQL/Supabase, security, correctness, testing, UX/a11y). Detailed findings with file:line anchors: `planning/audit-2026-07-27-findings.md`.

## Problem Statement

The Recruiting Compass has accumulated debt across two architectural generations (the legacy linked-accounts model and the current family-units model), and that duality — plus stale generated database types and missing lifecycle discipline — has produced real user-facing breakage:

- Athletes literally cannot advance recruiting phases: the milestone system compares seeded UUID task ids against hardcoded slugs that exist nowhere in the database, so advancement is permanently blocked while unit tests stay green.
- Families see wrong or stale data: logging out and back in as a different account shows the previous account's schools, coaches, and offers; parents viewing an athlete can see every task as "not started"; parent-created events vanish on reload.
- Every date-only value in the app (deadlines, offer expirations, reminders, event dates) displays or fires one day early for US users because date strings are parsed as UTC midnight.
- Row-level security has holes: any authenticated user can read, modify, or delete another user's school-less events, and anyone can probe any athlete's recruiting status by UUID.
- GDPR account deletion silently fails — foreign keys block the delete, the cron swallows the error and reports success — leaving user data retained after a deletion request.
- Saves fail silently across interactions, offers, settings, and attachments: errors go to the console, users believe their data persisted.
- Screen-reader and keyboard users cannot operate ten modal dialogs, the task checkbox, or search result cards.
- The safety net is partly fake: ~208 tests assert `expect(true).toBe(true)` while appearing to cover auth, onboarding, and parent access control; the account-deletion cron and the athlete-access authorization helper have no tests at all.

## Solution

A phased remediation program, ordered by user harm:

1. **Stop active data exposure and data-integrity failures** — close the RLS holes, lock down the SECURITY DEFINER status function, fix GDPR deletion end-to-end, and enforce invite email matching.
2. **Fix broken core features** — phase advancement (slug/UUID reconciliation and single source of truth for current phase), deadlines page crash, parent-view task status, event ownership, search result correctness, and the notification-creation schema mismatch.
3. **Establish missing lifecycle discipline** — one auth-change orchestrator that resets all stores and truly signs out; a shared local-date parsing helper replacing every UTC-midnight parse; visible error surfacing for all mutations.
4. **Consolidate the two architectural generations** — retire legacy linked-accounts RLS policies, dead composables, ghost tables/columns, and the dead duplicate route; regenerate database types to eliminate the cast layer hiding schema drift.
5. **Rebuild trust in the test suite** — delete or implement the tautological tests, cover the untested security primitives and destructive jobs, and stop the CSRF test from testing a hand-copied duplicate.
6. **Close the accessibility and UX-consistency gap** — apply the existing remediated dialog pattern to all modals, name every control, surface status in text as well as color, and unify confirmation/empty/error state handling on the design system.

## User Stories

### Security & privacy

1. As an athlete, I want my events to be visible and editable only by me and my family, so that strangers cannot read, alter, or delete my recruiting calendar.
2. As an athlete, I want my recruiting status (task completion, school count, last contact) to be unqueryable by arbitrary users, so that my progress is private to my family.
3. As a parent, I want a family invite to be usable only by the email address it was sent to, so that a forwarded link cannot give a stranger access to my child's data.
4. As a parent, I want the invite preview shown before sign-in to reveal the minimum necessary, so that my child's name, graduation year, sport, and position are not disclosed to anyone holding the link.
5. As a user who requested account deletion, I want my data actually deleted on schedule, so that the product honors its GDPR obligations rather than silently failing while reporting success.
6. As a family member, I want family ownership to be non-reassignable by other members, so that no one can hijack ownership and cascade-delete the family's data.
7. As a player, I want interaction records to always be attributed to the person who logged them, so that attribution cannot be forged.
8. As a platform operator, I want rate limiting keyed to a trusted client IP, so that attackers cannot bypass brute-force protection by spoofing forwarded headers.
9. As a platform operator, I want the admin-token validation endpoint rate-limited and the token scheme rotatable, so that admin self-promotion is not brute-forceable.
10. As a user, I want file uploads validated on the server (type, size, sanitized names), so that client-side bypass cannot plant unexpected content in storage.
11. As a user viewing an exported report, I want all user-entered text HTML-escaped, so that a crafted school or coach name cannot execute script when the report is opened.
12. As a user on a shared computer, I want the inactivity timeout to fully sign me out of the auth provider, so that reloading the page does not silently restore my session.
13. As a user who chose a short "remember me" duration, I want my session to actually expire on that schedule, so that my choice is honored rather than defaulting to 30 days.

### Core feature correctness

14. As an athlete, I want phase advancement to work when I complete the required milestones, so that my recruiting timeline reflects my real progress.
15. As an athlete, I want my advanced phase to persist and display consistently, so that advancing doesn't silently revert on the next page load.
16. As an athlete, I want the deadlines page to load without crashing, so that I can see what's due.
17. As a parent viewing my athlete, I want task completion status to reflect my athlete's actual records, so that I don't see everything as "not started."
18. As a parent, I want events I create for my athlete to remain visible after reload, so that calendar entries don't vanish.
19. As a parent, I want the read-only guard to actually prevent me from toggling my athlete's task completion, so that view-as-parent means viewing.
20. As a user, I want search to find matching records regardless of how many I have, so that "Stanford" is found even when I track more than twenty schools.
21. As a user, I want notifications to be created successfully and the unread badge to update immediately, so that I don't miss coach activity.
22. As a user, I want every date in the app — deadlines, reminders, offer expirations, event dates, "today" — computed in my local timezone, so that nothing fires or displays a day early.
23. As a user, I want date-range filters to include the full end day, so that a same-day range returns that day's records.
24. As an athlete, I want my status score never silently corrupted by transient database errors, so that a blip doesn't permanently downgrade my standing.
25. As a user, I want family-code join and validation to work against the real schema, so that valid codes are never rejected.
26. As a multi-athlete parent, I want the default selected athlete chosen sensibly (closest to graduation), so that I land on the right child's data.
27. As a user, I want typeahead and domain fetches to ignore stale out-of-order responses, so that fast typing or athlete switching never shows the wrong results.
28. As a user, I want pagination to never silently skip records that share a timestamp, so that infinite scroll is complete.
29. As a user, I want auto-save to flush pending edits when I navigate away, so that "auto-save" never loses my last change.

### Data lifecycle & state

30. As a user logging out and back in as a different account on the same tab, I want zero data from the previous account visible, so that family data never leaks across sessions.
31. As a parent switching athletes, I want all dashboards, stores, and cached flags rebuilt for the new context, so that stale data from the prior athlete never renders as current.
32. As a user, I want failed deletes/updates (including RLS-blocked zero-row writes) reported as failures, so that the UI never diverges from the database.

### Error visibility (UX)

33. As a user, I want every failed save — interactions, offers, settings, attachments, task toggles — to show a visible error with my input preserved, so that I never lose work believing it saved.
34. As a user, I want error messages in plain language with a retry action, so that I know what happened and what to do, without raw technical output.
35. As a user, I want destructive actions confirmed through one consistent styled dialog, so that confirmations are uniform and not suppressible browser popups.

### Accessibility

36. As a keyboard user, I want every modal to trap focus, close on Escape, and restore focus on close, so that I can operate dialogs without a mouse.
37. As a screen-reader user, I want every dialog announced as a dialog and every icon-only button, checkbox, and image to have an accessible name, so that I know what each control does.
38. As a screen-reader user, I want search results, toasts, and async updates announced via live regions, so that I know when content changed.
39. As a keyboard user, I want clickable cards and tabs to be focusable, activatable, and state-announced, so that navigation works without a pointer.
40. As a color-blind user, I want status (on-track/at-risk, best offer, deadlines) conveyed in text or iconography as well as color, so that meaning survives without color perception.
41. As a screen-reader user, I want disclosure controls to expose expanded/collapsed state, so that I can navigate collapsible content.

### Code health & standards

42. As a developer, I want generated database types regenerated and missing tables migrated, so that the 200+ `any` casts and ghost-schema bugs disappear and TypeScript catches drift again.
43. As a developer, I want one authorization model (family units) in RLS and application code, so that access control is auditable and legacy policy unions can't open holes.
44. As a developer, I want dead code removed — the duplicate coaches route, dead composables, ghost-table features, empty auto-completion triggers — so that broken paths can't be reached and maintenance shrinks.
45. As a developer, I want a lint rule freezing out raw console calls and the remaining 130 call sites migrated to the client logger, so that production consoles never leak auth payloads again.
46. As a developer, I want shared single implementations for file validation and date parsing, so that policy changes happen in one place.
47. As a developer, I want the three oversized pages decomposed into composables and components, so that they fit the file-size standard and their logic is testable.
48. As a developer, I want server-only utilities out of client bundles, so that layering stays clean.

### Testing

49. As a developer, I want the ~208 tautological tests deleted or implemented, so that the suite's green means something for auth, onboarding, and parent access control.
50. As a developer, I want the athlete-access authorization helper, phase advancement endpoint, and all cron jobs (especially account deletion) covered by real tests, so that regressions in destructive or security-critical paths are caught.
51. As a developer, I want the CSRF exemption predicates exported and imported by their test, so that the test can no longer pass while the middleware drifts.
52. As a developer, I want every e2e skip to carry a reason string, so that skipped coverage is visible and tracked.
53. As a developer, I want untested API endpoints and high-risk composables (notifications, document upload/sharing) covered, so that upload and preference failures surface before production.

## Implementation Decisions

- **Phased delivery in five phases ordered by user harm:** (1) security/privacy + GDPR deletion, (2) broken core features, (3) lifecycle + date handling + error surfacing, (4) architectural consolidation + type regeneration + dead-code removal, (5) test-debt and a11y/UX systematization. Phases 1–2 ship independently and first.
- **RLS remediation via migration set:** remove the null-school escape hatch from event policies; add ownership predicates; add an auth-check inside (or revoke public EXECUTE from) the athlete-status function; add WITH CHECK guarding family ownership reassignment; force interaction attribution to the authenticated user. A follow-on consolidation migration drops all legacy linked-accounts-era policies once the family model is confirmed authoritative.
- **GDPR deletion made verifiable:** each deletion step checks its error; auth-user deletion happens only after application rows are confirmed gone; audit-reference foreign keys move to SET NULL or CASCADE by migration; the deletion cron gets integration tests using the mutable mock-server pattern already established in the test suite.
- **Phase system single source of truth:** tasks gain a stable slug column (seeded), milestone definitions reference slugs resolved to ids at read time; both the phase read endpoint and the advance endpoint operate on the same stored current-phase field with grade-derived default.
- **One auth-change orchestrator:** a single composable/store subscribes to auth state transitions and calls a reset action on every domain store (each store gains one); fetch guards become keyed by family id; the session-timeout path calls the full sign-out flow, and remember-me expiry preferences are honored by the auth middleware.
- **One local-date utility:** a shared parse/format helper for date-only strings (local timezone, day-granularity comparisons) replaces every direct `new Date(dateOnlyString)` on date-only fields; range filters become exclusive-upper-bound; "today" anchors derive from local date parts. An ESLint restriction discourages reintroduction.
- **Database types regenerated** from the live schema, plus migrations adding genuinely missing tables/columns (notification action URL decided: add the column, since the UI depends on it) — eliminating the `(supabase as any)` cast class. Zod enums for notifications align with the database enum and check constraints.
- **Invite hardening:** acceptance requires the invited email to match the authenticated user (product owner may later opt into transferable invites deliberately); the unauthenticated invite preview returns family name only.
- **Mutation error surfacing standard:** composables return error state; pages route it through the design-system error/toast components with retry; native alert/confirm replaced by the design-system dialog. Decision embedded: the design-system state components (empty/error/loading) are **adopted, not retired** — the docs mandate stands, enforced on touched surfaces.
- **Modal a11y via the existing remediated pattern** (dialog role, aria-modal, Escape, focus trap composable, focus restore) applied to all ten unremediated modals plus the two half-migrated ones; accessible names added to icon-only controls, checkboxes, and images; live regions for async updates; text supplements for color-coded status.
- **Test-debt policy:** tautological tests are deleted in one commit (visible coverage drop is accepted as honest), then real tests are written for the flows they pretended to cover, prioritized: parent access control, auth/onboarding, account-deletion cron, athlete-access helper, phase advance. CSRF middleware exports its predicates for direct import.
- **Request-cancellation pattern:** a per-call sequence token (latest-wins) added to typeahead and domain-fetch composables; no global abort infrastructure built.
- **Rate limiting:** client IP derived from the platform's trusted header; the in-memory family-code limiter moves to the existing Redis-backed limiter.
- **Logger/no-console:** ESLint `no-console` (allowlist for the logger implementation) lands with the remaining migration; the admin signup auth-payload log is removed immediately in Phase 1.

## Out of Scope

- The iOS/SwiftUI companion app (separate codebase; web remains source of truth — a parity spec can follow remediation).
- New product features; this PRD only restores intended behavior and closes debt.
- SSR migration and nonce-based CSP (removing `'unsafe-inline'` is a separate architectural effort; documented compensating controls remain).
- The e2e seed-infrastructure project for the ~78 skipped tests (already tracked separately); this PRD only adds reason strings to bare skips.
- Full 80% coverage attainment; this PRD covers the named untested critical paths, not a blanket coverage push.
- Performance work beyond the specific findings (unbounded queries, N+1s, cache-key fix, admin-client singleton); no general profiling effort.
- Retiring the deprecated backup tables' data (needs a retention decision from the product owner before dropping).
- Chart color-token refactor beyond adding the sanctioned audit-ignore annotations.

## Further Notes

- **False-positive discipline held:** all headline criticals were verified against source before inclusion; one finding (the templated-email endpoint as "open relay") was downgraded after verification showed auth, suppression checks, and a locked template enum — it remains a medium abuse-surface item.
- **Two findings need product-owner decisions:** (1) whether family invites should be strictly email-bound or deliberately transferable; (2) retention window before dropping the pre-family-migration backup tables containing PII.
- **Known-good foundations to preserve:** endpoint auth/authz helpers are consistently applied (no IDOR found); Zod validation on security-relevant bodies; core business math (fit score, deadline offsets, invite state machine) is well-tested; component/store architecture discipline is genuinely good outside the named exceptions.
- The findings register (`planning/audit-2026-07-27-findings.md`) is the authoritative file:line source for implementers; this PRD deliberately omits paths that will drift.
- Suggested next step: run the PRD through `prd-to-plan` to produce the phased implementation plan with tracer-bullet slices.
