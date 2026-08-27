# Design — Public-profile inbound coach messages → tracked interactions

**Date:** 2026-08-27
**Author:** Chris + Claude
**Status:** Draft, pending review — updated with code investigation 2026-08-27
**Related:** Public Player Profile feature (PR #487, #512, #516); coach `last_contact_date` trigger; `createInboundInteractionAlert` nudge system.

---

## Investigation findings (verified against code 2026-08-27)

Read the real files, not just the summary. Corrections to first-draft assumptions:

1. **This was half-built on purpose.** `matchCoachByEmail.ts` docstring literally says: *"an unmatched email logs the interaction with coach_id=NULL, and the player links/creates the coach later."* That intended interaction-logging **never shipped** — blocked by `interactions.school_id` NOT NULL (a coach-less lead has no school id). That's why Chris "thought this was already worked on." The matcher and lead capture landed; the interaction step did not.
2. **The reach-out nudge is SCHOOL-based, not coach-based.** `server/utils/rules/interactionGap.ts` keys `calculateDaysSinceContact` off `interaction.school_id` and only fires for priority A/B schools with status interested/contacted/visited. So what feeds the nudge is a correct `school_id` on the interaction (a matched coach supplies it via `coaches.school_id`, NOT NULL). Coach linkage separately drives coach detail, `last_contact_date` trigger, and coach analytics. Both matter; they're different systems.
3. **`useInteractions.create` already fires `createInboundInteractionAlert` for `direction:"inbound"`** (composables/useInteractions.ts:320). A client-side assign path gets the inbound alert for free — no manual call.
4. **The public endpoints already write their own `notifications` row** (`type: inbound_interaction`, `related_entity_type: "profile_contact"`). The matched path must NOT also fire `createInboundInteractionAlert` or we double-notify. Keep the single endpoint notification; repoint `related_entity_type/id` to the new interaction when one is created.
5. **`matchCoachByEmail` returns only `{ coachId }`** — selects `id` alone. Must extend to also return `schoolId` (`select("id, school_id")`) so the matched-path interaction can set `school_id`.
6. **`CoachSelect.vue` is school-scoped** — filters coaches by a required `schoolId` prop. NOT a drop-in for cross-school lead assignment (the lead's school is free-text `school_name`, often no id). Assignment must resolve/create the school first, then pick/create the coach within it.
7. **Coach + interaction creation already exist client-side under RLS:** `stores/coaches.ts createCoach(schoolId, data)` and `useInteractions.create`. The assign flow should REUSE these (DRY) rather than a server-side re-implementation. A server `assign.post.ts` that re-does coach+interaction+school inserts with the admin client would duplicate all of it.
8. **`profile_contacts` has no `status`/`interaction_id` columns** (verified in types/database.ts:2028). Migration required. `matched_coach_id` FK to coaches already exists.
9. **Interest can be identity-less:** `interest.post.ts` makes `coachName` optional and `program` required; an interest submission may carry no coach name AND no email → nothing to match or assign. Contact requires `coachName` + `note`. This splits behavior (see Open Questions #1/#5).

---

## Problem

Coaches contact players through the public profile page (`pages/p/[slug].vue`) via two forms:

- **Contact** (`ContactPlayerModal.vue` → `POST /api/public/profile/[slug]/contact`)
- **Express Interest** (`ExpressInterestPopover.vue` → `POST /api/public/profile/[slug]/interest`)

Today each submission writes **only**:

1. A `profile_contacts` lead row (with `matched_coach_id` populated *only if* the coach's email already exists in that family's `coaches`).
2. A `notifications` row (`type: inbound_interaction`, linked to the lead).
3. A notification email.

**It never creates an `interactions` row.** So inbound coach outreach never appears on the interactions page, never feeds interaction analytics, and never triggers the per-coach "reach out after X days" relationship nudges (`createInboundInteractionAlert`, gap-rules). The public-profile redesign shipped lead capture + email-matching but stopped short of the interaction. This closes that gap.

## Goal

Inbound coach messages become **first-class, coach-linked interactions** on the interactions page — without polluting the `coaches` table with orphaned or duplicate records that would break per-coach relationship tracking.

### Non-goals

- No auto-creation of coach records from unauthenticated public input (the source of orphans/dupes).
- No schema change to `interactions` (school_id / logged_by stay NOT NULL).
- iOS parity of the *assignment UI* is a follow-up (see Parity), not part of this slice. The interactions these produce already render on iOS.

---

## Key constraints (why the design is shaped this way)

`interactions` requires:

- `school_id` **NOT NULL** (FK schools)
- `logged_by` **NOT NULL** (FK users)
- `coach_id` nullable, but the email matcher returns `null` for unknown coaches and **deliberately never creates a coach**.

A matched coach carries a NOT-NULL `school_id`, so a matched interaction satisfies every constraint with no invention. An *unmatched* lead has neither a coach nor (reliably) a real `school_id` — only free-text `school_name`. Rather than nullable-hack the schema or fabricate a school, the unmatched lead **defers** interaction creation until a human assigns the coach (which supplies the school).

Chris's stated risk (verbatim intent): prioritize the interaction, but **orphaned/duplicate coach records would hinder relationship-building and the reach-out nudges**. The human dedup gate below is the core of the design, not an afterthought.

---

## Design

### Two outcomes at submission time

**A. Email matches an existing coach** (`matchCoachByEmail` returns an id):
Create the `interactions` row immediately, server-side (service-role admin client, mirroring how `profile_contacts`/`notifications` are already written):

| column | value |
|---|---|
| `coach_id` | matched coach id |
| `school_id` | matched coach's `school_id` (NOT NULL satisfied) |
| `family_unit_id` | from the profile |
| `logged_by` | the player's `user_id` (owner of the profile) |
| `direction` | `inbound` |
| `type` | `email` for Contact; new `interest` enum value for Interest (per decision #1) |
| `occurred_at` | submission time |
| `subject` / `content` | derived from lead note / form |
| `source` marker | tie back to the `profile_contacts` row (see Traceability) |

Notifications: the endpoint **already** writes one `inbound_interaction` notification per submission — keep it, just repoint `related_entity_type: "interaction"` / `related_entity_id` to the new interaction. Do **not** additionally call `createInboundInteractionAlert` (that would double-notify; it's the client composable's job on the assign path). The school-based reach-out nudge (`interactionGapRule`) now sees this interaction under `coaches.school_id`; coach `last_contact_date` updates via `trg_stamp_coach_last_contact` (AFTER INSERT). Requires extending `matchCoachByEmail` to also return `schoolId`.

**B. No email match** (unknown email, or name-only):
Do **not** create a coach. Do **not** create an interaction yet. The `profile_contacts` row stands as a **pending-assignment** lead (it already stores everything: `coach_name`, `coach_email`, `coach_title`, `school_name`, `program`, `note`). Surface it for resolution (below).

### The human dedup gate — "Assign coach"

The pending lead gets an **Assign coach** action, surfaced in two places:

1. The player inbox card (`ProfileInbox.vue`) — currently read-only; add the CTA.
2. A notification / badge so it's not lost ("1 coach message needs assignment").

The action opens a **new lightweight assignment modal** (NOT `CoachSelect` as-is — that's school-scoped and needs a school id the lead lacks). Flow, reusing existing client-side actions under RLS:

1. **Resolve the school first** — match the lead's `school_name` against the family's `schools`; suggest the hit, or let the user pick/add a school via the existing school-add flow. School id is the prerequisite for both coach creation and the interaction's NOT-NULL `school_id`.
2. **Then suggest likely-existing coaches** within that school (and a family-wide fuzzy pass on `coach_name`) — the dedup step: steer to link, not recreate.
3. Link to an existing coach, OR **create a new coach** via `stores/coaches.ts createCoach(schoolId, …)`, pre-filled from the lead (`coach_name` split to first/last, `coach_email`, `coach_title`).
4. Mint the interaction via `useInteractions.create` (`direction: inbound`, `coach_id`, `school_id`) — which **auto-fires** `createInboundInteractionAlert`. No server re-implementation.

On confirm, this **mints the interaction** and marks the lead resolved (small authed `resolve` endpoint sets `status` + `interaction_id`, or an RLS update on `profile_contacts`). This is the single place a coach can be born from a public lead — always human-confirmed, always dedup-suggested. All three of Chris's failure modes are structurally prevented:

- **Orphan interaction** → never exists; the lead is the visible, alerted pending state until assigned.
- **Auto-created coach needing school confirmation** → never happens; creation is explicit in the picker with school shown.
- **Duplicate coach / needing merge** → picker surfaces the existing candidate first, so the user links instead of duplicating.

### Traceability

Link each interaction back to its originating lead so we never double-convert and can show provenance. Options (decide in plan): a nullable `profile_contact_id` FK on `interactions`, OR a resolution status + `interaction_id` on `profile_contacts`. Leaning `profile_contacts` gaining `status` (`pending` | `resolved` | `dismissed`) + `interaction_id` — keeps the change on the lead table, avoids touching `interactions` schema, and lets the inbox filter pending vs resolved. Matched (outcome A) leads are written `resolved` with their `interaction_id` at submission.

---

## Data flow

```
Coach submits Contact/Interest  (public, unauth)
        │
        ▼
server endpoint  (contact.post.ts / interest.post.ts)
        │  matchCoachByEmail(family, email)   [read-only, never creates]
        ├── match ──► insert interactions (coach_id, coach.school_id, logged_by=player,
        │                inbound)  → inbound nudge + last_contact trigger
        │             write profile_contacts { status: resolved, interaction_id }
        │             notification + email  (unchanged)
        │
        └── no match ► write profile_contacts { status: pending }   (no coach, no interaction)
                       notification + email  (unchanged)
                                    │
                        ┌───────────┘  (later, authenticated player)
                        ▼
             ProfileInbox "Assign coach" → CoachSelect picker
                        │  fuzzy-suggest existing coaches (dedup)
                        ├── link existing ─┐
                        └── create new  ───┤ (pre-filled, human-confirmed)
                                           ▼
                              mint interactions (coach_id, coach.school_id,
                                 logged_by=player, inbound) → nudge + trigger
                              profile_contacts { status: resolved, interaction_id }
```

## Components touched

**Server**
- `server/utils/matchCoachByEmail.ts` — return `{ coachId, schoolId }` (select `id, school_id`).
- `server/api/public/profile/[slug]/contact.post.ts` — on match: insert interaction (admin client), repoint the existing notification to it, write lead `status: resolved` + `interaction_id`. On no match: write `status: pending` (else unchanged).
- `server/api/public/profile/[slug]/interest.post.ts` — same, gated on having a coach identity (see Open Q #5).
- Shared helper `server/utils/createInboundInteractionFromLead.ts` — the **matched-path** server insert only (column mapping in one place). The assign path does NOT use it — it reuses client stores.
- New authed `server/api/player/profile/contacts/[id]/resolve.post.ts` — sets `status` + `interaction_id` after the client mints the coach/interaction; family-scope + double-convert guard.

**Client** (assign path reuses existing actions — DRY)
- `components/profile/ProfileInbox.vue` — pending badge + "Assign coach" CTA; filter resolved/pending.
- `composables/useProfileContacts.ts` — carry `status` / `interaction_id`; add `resolveLead` action.
- New assignment modal — school-first resolve (existing school-add flow) → coach pick/create via `stores/coaches.ts createCoach` → `useInteractions.create` → `resolve` endpoint. Not `CoachSelect` as-is.

**Read endpoint**
- `server/api/player/profile/contacts.get.ts` — add `status`, `interaction_id` to the SELECT so the inbox can filter/label.

**DB (migration, applied live via MCP per repo convention)**
- `interaction_type` enum: add value `interest` (per decision #1). Enum-add is non-transactional in PG — its own migration, before any use. Audit `type`-switch sites (interaction icons/labels, analytics groupers) for exhaustiveness so a new value doesn't fall through.
- `profile_contacts`: add `status` (`pending`|`resolved`|`dismissed`, default `pending`) + `interaction_id` (nullable FK interactions). Backfill existing rows: `resolved` if `matched_coach_id` present else `pending`. No change to `interactions` table shape.

## Error handling

- Match path interaction insert fails → still write the lead as `pending` (don't lose the message); log server-side. The message surviving beats the interaction.
- Assign with a school that has no `schools` row → creating the coach requires a school anyway (coaches.school_id NOT NULL); the picker's create-coach path resolves/creates the school as coach creation already does today. Reuse that path; don't invent a new one.
- Double-convert guard: assign endpoint no-ops if lead already `resolved` (returns existing `interaction_id`).

## Testing

- Unit: `createInboundInteractionFromLead` column mapping (matched → correct school/coach/logged_by/direction).
- Unit: assign endpoint — link-existing vs create-new; double-convert no-op; unauth rejected; family-scope enforced.
- Unit: backfill logic classification (matched→resolved, else pending).
- Integration/E2E: public Contact submit with a seeded matching coach → interaction appears on interactions page, inbound nudge scheduled. Unmatched submit → pending card → assign → interaction appears.
- Regression: existing contact/interest tests (notification + email + lead) still green.

## Parity (web/iOS)

The interactions produced here already display on iOS (shared `interactions` table). The **assignment UI** (pending inbox + coach picker) is web-only in this slice; log an iOS handoff for the pending-assignment inbox + assign flow so a coach message can be resolved on mobile too. Flag, not block.

---

## Resolved decisions (Chris, 2026-08-27)

1. **Interest → new `interaction_type` value `interest`** (not `other`). Contact→`email`, Interest→`interest`. Lets Interest-button usage be tracked as a first-class interaction type. Adds an enum-value migration + a switch/label audit.
2. **No auto-link on name.** Only email-exact match auto-creates the interaction at submission. Name/school similarity only *suggests* candidates in the assignment picker; a human always confirms. Prevents silent mis-attribution.
3. **Dismissable leads — yes.** `dismissed` status included now so spam/irrelevant messages leave the pending queue without minting an interaction. Wire the button in this slice or a fast-follow.
4. **Traceability on the lead table** — `profile_contacts.status` + `interaction_id`. No column added to `interactions`.
5. **Identity-less interest stays lead-only** (proposal a). An Interest submission with no coach name and no email has no identity to attach — it never becomes a coach-linked interaction. Button *usage* is still fully tracked: every Interest submission is a `profile_contacts` row (already counted in the inbox stat tiles). Only Interest submissions carrying a matchable/assignable coach become `type: interest` interactions.
