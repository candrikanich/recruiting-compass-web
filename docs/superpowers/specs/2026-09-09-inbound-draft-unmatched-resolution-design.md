# Inbound-draft unmatched school/coach resolution — design

Issue: #675. Follows #678 (PR #724), which turned draft-confirm into an
editable `InteractionForm` flow instead of a blind accept.

## Context

#678 already gave the coach side a resolution path: `InteractionForm`'s
`CoachSelect` + `CoachAddCoachModal` let a user pick or create a coach when
`draft.matched_coach_id` is null. It just doesn't prefill from the sender
info already visible on the draft.

The school side has no equivalent — `SchoolSelect` only lists schools the
family already tracks; an unmatched school's only escape hatch is a link to
`/schools/new`, a separate full page that drops all draft context (no way
back into the review flow, no prefill).

#675's issue text proposed validating a sender's email domain against
`nces_schools` before auto-creating a school. That table has no
domain/website column — schema is `nces_id, name, city, state, zip,
latitude, longitude` — and is scoped to the athlete's-own-high-school search
feature (`server/api/schools/high-school-search.get.ts`), not college
matching. There is no domain-keyed dataset in this repo for colleges;
college data comes from the College Scorecard API, searched by name only.
Chris confirmed (this brainstorm): drop domain-validation ambition, keep
school creation explicit and user-driven rather than auto-created.

## Scope

1. Coach-side: prefill `CoachAddCoachModal` from `draft.sender_name` /
   `draft.sender_email` when opened from a draft review.
2. School-side: let a user create a new school without losing the
   in-progress draft review, landing back on the form with the new school
   selected. No auto-create, no domain validation — explicit user action
   only, same as the coach side today.

No new tables, no migration, no new components beyond what already exists.
Wiring changes to three files: `CoachAddCoachModal.vue` (or its caller),
`pages/schools/new.vue`, `pages/interactions/add.vue`, plus a small
`InteractionForm.vue`/`SchoolSelect.vue` touch for the "add school" link.

## Design

### 1. Coach prefill

`pages/interactions/add.vue` already resolves `draft` (the full inbound
draft row, including `sender_name`/`sender_email`) before rendering
`InteractionForm`. Thread those two fields down as new optional
`InteractionForm` props (`senderName?: string | null`, `senderEmail?:
string | null`), passed through unchanged to `CoachAddCoachModal` as new
optional props it uses to seed its internal form state on open (first/last
name split the same way `splitSenderName` in
`server/utils/matchCoachByEmail.ts` already does — duplicate the trivial
split logic client-side rather than importing a server util into a
component; email field prefilled as-is).

Only populated when `draftId` is present in the route — the manual
"Log Interaction" flow (`?coachId=`/`?schoolId=` prefill) passes nothing,
so the modal opens empty as it does today.

### 2. School-side create-and-return

**`/schools/new` gets two new optional query params:**
- `returnTo` — a URL to navigate to after save/cancel instead of the
  current hardcoded `/schools` (cancel) / `/schools/{id}` (save).
- `prefillWebsite` — seeds the manual-entry website field (only used when
  the user isn't using the College Scorecard autocomplete path, which
  already sets website itself off the selected college).

On save: if `returnTo` is present, navigate to
`${returnTo}${returnTo.includes("?") ? "&" : "?"}schoolId=${school.id}`
instead of `/schools/${school.id}`. On cancel: navigate to `returnTo` if
present, else the existing `/schools` fallback.

**`pages/interactions/add.vue`** reads a new `schoolId` query param
alongside the existing `draftId`. When present, it overrides
`draft.matched_school_id` in the `initialData` computed (the round-trip
target). This is additive — the existing `coachId`/`schoolId` prefill path
for the non-draft manual-log flow is untouched since that path already
reads `schoolId` today for its own prefill; the draft branch of the
computed just needs the same override applied.

**Entry point:** `InteractionForm.vue` adds an always-visible "School not
listed? Add it" link next to `SchoolSelect` (not just `SchoolSelect`'s own
empty-state link, which only shows when the family has zero schools at
all — most families adding one unmatched school already have others
tracked). The link is only rendered when `InteractionForm` is in the
draft-review context (new optional prop, e.g. `draftReturnTo?: string`,
passed by `add.vue` as `/interactions/add?draftId=<id>`); the plain manual
"Log Interaction" flow keeps today's behavior (no link — `/schools/new`
directly, matching existing UX elsewhere in the app).

`add.vue` builds the link's `prefillWebsite` from the draft's sender email
domain when available (reuse the existing `extractDomain`-style parse
inline — sender email's substring after `@`, no need to import the server
util), omitted when there's no sender email to derive it from.

### Data flow (unmatched school, end to end)

1. Draft has no `matched_school_id`. `add.vue` renders `InteractionForm`
   with `draftReturnTo` set.
2. User clicks "Add it" → `/schools/new?returnTo=/interactions/add?draftId=X&prefillWebsite=https://coachdomain.edu`.
3. User fills the form (autocomplete or manual) and saves normally — no
   behavior change to school creation itself.
4. On save, redirected to `/interactions/add?draftId=X&schoolId=<new id>`.
5. `add.vue` re-resolves `initialData` with the draft reloaded (same
   `onMounted` fetch as today) and `schoolId` override applied →
   `InteractionForm` renders with the new school pre-selected, coach picker
   now enabled (`CoachSelect` needs `school_id`), user proceeds as normal.

### Error handling

No new failure modes — reuses `/schools/new`'s existing save/validation
error handling untouched, and `add.vue`'s existing draft-fetch error
handling (`DesignSystemErrorState`) untouched. A malformed/missing
`returnTo` degrades to today's `/schools/{id}` behavior (treat empty
string same as absent).

### Testing

- Unit: `CoachAddCoachModal` prefill props; `InteractionForm` conditional
  "Add it" link render + href construction; `add.vue` `schoolId` query
  override in `initialData`; `/schools/new` `returnTo`/`prefillWebsite`
  handling (save and cancel branches).
- No E2E changes required to existing specs; a new E2E covering the full
  unmatched-school round-trip is optional (existing
  `tests/e2e/public-profile-inbound-interaction.spec.ts` and inbound-drafts
  specs cover the matched-path already) — left to the implementation plan
  to decide, not required by this spec.

## Out of scope

- Domain-based school auto-create/validation (issue's original ask) —
  dropped per this brainstorm; no dataset in this repo supports it.
- Silent auto-create of anything on the school side — stays explicit.
- Any change to the existing coach auto-create-by-domain behavior
  (`autoCreateCoachByEmailDomain`, #586 Phase 3) — unaffected, out of
  scope.
