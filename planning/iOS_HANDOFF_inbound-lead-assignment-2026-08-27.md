# iOS Handoff: Inbound Lead → Interaction Assignment

**Date:** 2026-08-27
**Source of truth:** web app (Nuxt/TypeScript), branch `feat/inbound-lead-to-interaction`
**Status:** Web-side feature complete + E2E covered. iOS has NO counterpart yet.

## What shipped on web

A coach who messages a player through the **public profile** (`/p/:slug`) — via
"Contact Player" or "Express Interest" — creates a lead row in
`profile_contacts`. That lead is now either:

1. **Auto-tracked** — if the coach's submitted email matches an existing
   `coaches.email` row in the player's family (case-insensitive, family-scoped
   match), the backend immediately mints an inbound `interactions` row
   (`type: 'contact' → 'email'`, `type: 'interest' → 'interest'`,
   `direction: 'inbound'`) and stamps `profile_contacts.status = 'resolved'`
   + `profile_contacts.interaction_id`. No human action required.
2. **Pending assignment** — if the email doesn't match any known coach (or no
   email was given), the lead sits with `status = 'pending'` in the player's
   **Inbox** until a family member manually assigns it to a coach (existing or
   newly created), at which point the same interaction-minting happens
   client-side and the lead flips to `resolved`.

A `status = 'dismissed'` state also exists — the family member can dismiss a
lead without ever creating an interaction or coach.

## Why iOS needs this

1. **The Inbox itself.** Web now has a "Public Profile → Inbox" tab
   (`components/profile/ProfileInbox.vue`) listing every inbound lead with
   Open/All filters, per-lead badges ("Needs coach" / "Tracked"), and
   Assign-coach / Dismiss actions. iOS has no equivalent screen — a lead that
   lands unmatched is currently invisible to a parent/player using only the
   iOS app until they open web.
2. **The Assign-coach flow.** Resolving a pending lead requires picking a
   school, then either selecting an existing coach at that school or creating
   a new one inline, then confirming — which both assigns the lead and logs
   the interaction in one action (`components/profile/AssignCoachModal.vue`).
   This is the only path to convert a "Needs coach" lead into a tracked
   interaction from the app (dismiss is the only other lead-side action).
3. **`interest` interaction type is new** — see below. Even without building
   the Inbox/Assign-coach UI, iOS's interaction-type constants must add this
   value now or auto-created/web-created `interest` interactions will
   render incorrectly (or crash on decode, depending on how the enum is
   modeled) the moment iOS displays an interactions list that includes one.

## What already works on iOS without any new code

Once an interaction exists (auto-matched or manually assigned via web),
it is a completely ordinary row in the `interactions` table — iOS's existing
interactions list/detail screens will display it like any other logged
interaction, with `direction: inbound`, `subject`, and `content` populated.
**No schema or read-path change needed for that half.**

## What needs building on iOS

### 1. `interest` interaction type (required, small, do first)
- Add `"interest"` to iOS's interaction-type enum/constants (wherever
  `email` / `call` / `text` / etc. currently live) and its display label
  (web renders it as **"Interest"** — see `formatType()` in
  `utils/interactionFormatters.ts`).
- Add matching icon/color mapping if iOS's UI branches on type (web:
  `getTypeIcon` / `getTypeIconBg` / `getTypeIconColor` in the same file —
  purple-ish "hand-raised" treatment).
- Verify the interaction decode path doesn't fail closed on an unrecognized
  raw string — a lead assigned via web today can already produce an
  `interest` row iOS will fetch.

### 2. Inbound-lead inbox screen (net-new)
- Data source: `GET /api/player/profile/contacts` → `{ leads: ProfileLead[],
  counts: {...} }`. See `composables/useProfileContacts.ts` for the exact
  shape (`ProfileLead`: `id, type, coach_name, coach_email, coach_title,
  school_name, program, note, matched_coach_id, status, interaction_id,
  created_at`).
- List UI: badge per lead ("Interest"/"Contact" type badge; "Needs coach" /
  "Tracked" status badge), Open/All filter, "Assign coach" + "Dismiss"
  actions on `pending` leads, "View interaction" link on `resolved` leads
  (`interaction_id`).
- Web reference: `components/profile/ProfileInbox.vue`.

### 3. Assign-coach flow (net-new)
- School picker → coach picker (existing coaches at that school) OR "create
  new coach" inline form (first/last name required, email/role optional,
  prefilled from the lead's `coach_name`/`coach_email`).
- On confirm: create the coach if new (existing coach-create endpoint),
  then create the interaction (existing interaction-create endpoint) with
  `type` derived from `lead.type` (`interest → interest`, else `→ email`),
  `direction: inbound`, `subject` mirroring the web convention ("Interest
  via public profile" / "Contact via public profile"), `content: lead.note`.
- Then call `POST /api/player/profile/contacts/:id/resolve` with
  `{ status: 'resolved', interactionId }` to close the lead out.
- Dismiss-only path: same resolve endpoint with `{ status: 'dismissed' }`
  (no `interactionId`).
- Web reference: `components/profile/AssignCoachModal.vue`,
  `server/api/player/profile/contacts/[id]/resolve.post.ts`.

## Files to read on web (in build order)

1. `server/utils/matchCoachByEmail.ts` — email-match logic (context only,
   not iOS-relevant to reimplement; this runs server-side on submission).
2. `server/utils/inboundInteraction.ts` — `buildInboundInteractionRow` /
   `insertInboundInteraction`, the shared shape both the auto-match path and
   the manual Assign-coach path use to mint an interaction.
3. `composables/useProfileContacts.ts` — lead fetch/resolve/dismiss contract.
4. `components/profile/ProfileInbox.vue` — Inbox screen UI/behavior.
5. `components/profile/AssignCoachModal.vue` — Assign-coach modal UI/behavior.
6. `server/api/player/profile/contacts/[id]/resolve.post.ts` — resolve/dismiss
   endpoint (idempotent: re-resolving an already-resolved lead is a no-op
   that returns the existing `interaction_id`).
7. Migrations already applied live (schema is ready, no DB work needed):
   - `interaction_type` enum += `'interest'`
   - `profile_contacts` += `status` (`pending|resolved|dismissed`) +
     `interaction_id` (FK → `interactions.id`)

## Non-goals / explicitly out of scope (mirror web's decisions)

- No auto-creation of a coach from unauthenticated public input, ever — only
  a human-confirmed Assign-coach action creates a coach record.
- No name-based auto-linking — only an exact (case-insensitive) email match
  auto-resolves a lead. A name match alone leaves the lead pending.
- No double-notification — the existing player notification (in-app +
  email) on lead submission is unchanged; assignment doesn't fire a second one.
