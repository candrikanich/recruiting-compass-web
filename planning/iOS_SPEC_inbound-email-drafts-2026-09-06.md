# iOS Spec — Inbound Coach Email Ingestion (Drafts)

> **Prepared:** 2026-09-06
> **Web branch:** `develop` (commits `db2a44ba` Phase 1 #622, `89527fac` Phase 2 #641)
> **Purpose:** Bring iOS to parity with the web's inbound-email feature (issue #586): a per-family forwarding address that turns forwarded coach emails into reviewable draft interactions.

---

## Existing iOS Files (Step 0 parity check — feature classification: NOT FOUND, greenfield)

No iOS code exists for forwarding addresses, draft interactions, or a draft review UI. Nothing named `forwardingAddress`, `draftInteraction`, `InboundEmail`, or `EmailDraft` appears anywhere in the iOS repo.

**Naming collision to avoid, not reuse of real functionality:** iOS already has `Direction.inbound` (an existing manually-logged-interaction concept — "the coach initiated") and `NotificationType.inboundInteraction` (wire value `"inbound_interaction"`) at
`Features/Notifications/Models/NotificationType.swift`. These are unrelated to email parsing — a human logs "they reached out" today. However, the **web's new notification fan-out reuses the exact same wire value** (`type: "inbound_interaction"`) for the new "a coach email draft is ready to review" notification, rather than adding a new enum value. This means:
- iOS does **NOT** need a new `NotificationType` case — the existing `.inboundInteraction` case already decodes this notification correctly, since the wire value is identical.
- The existing in-app notification list infra (`AppNotification` model + `NotificationsServiceImpl` + `NotificationsListView`) already knows how to fetch/list/mark-read/route via `actionUrl`/`relatedEntityId`. Confirm during implementation whether its tap-handler switches on `type` (in which case `.inboundInteraction`'s existing handling might currently assume "manual coach contact" semantics and need updating to also branch on `relatedEntityType == "inbound_email_draft"`) or generically follows `actionUrl` (in which case no navigation-handling changes are needed at all — it'll already push to whatever native screen `actionUrl` maps to once the mapping below is added).
- **No push/APNs work is needed.** `PushNotificationManager.swift`/APNs registration is a separate, pre-existing system for device-token delivery; this feature only inserts rows the app already polls via `NotificationsServiceImpl`.

Relevant existing files to build against:
- Settings screen: `Features/Settings/Views/SettingsView.swift` (`List` of `Section`s, each pushing via a `SettingsDestination` enum) — a new "Coach Email Forwarding" row fits as its own `Section` + destination case + view.
- Interaction model: `Features/Interactions/Models/Interaction.swift` — fields: `id, type, direction, schoolId, coachId, subject, content, sentiment, occurredAt, loggedBy, attachments, familyUnitId, createdAt, updatedAt` (snake_case wire via `CodingKeys`). `type: InteractionType`, `direction: Direction`.
- Interaction service: `Features/Interactions/Services/InteractionsServiceImpl.swift`.
- Coach model: `Features/Dashboard/Models/Coach.swift` (lives under `Dashboard`, not `Coaches`) — fields: `id, firstName, lastName, email, phone, position, schoolId, twitterHandle, instagramHandle, notes, tags, source, responsivenessScore, lastContactDate, nextContactDate, followUpThresholdDays, createdAt, updatedAt`.
- Coach service: `Features/Coaches/Services/CoachesServiceImpl.swift`.
- Notification model: `Features/Notifications/Models/AppNotification.swift` — fields: `id, userId, type, title, message, priority, readAt, scheduledFor, sentAt, emailSent, emailSentAt, actionUrl, relatedEntityType, relatedEntityId, relatedSchoolId, relatedCoachId, relatedOfferId, relatedEventId, createdAt, updatedAt`.
- Notification service/UI: `Features/Notifications/Services/NotificationsServiceImpl.swift`, `Features/Notifications/Services/NotificationsManaging.swift`, `Features/Notifications/Views/NotificationsListView.swift`, `Features/Notifications/ViewModels/NotificationsListViewModel.swift`.

---

## Feature Overview

Each family gets one permanent, unique forwarding email address, shown in Settings. When a player or parent forwards (or BCCs) a coach's email to that address, the app parses out the original coach's name/email and creates a **draft** interaction — pending review, not yet a real logged interaction. The family reviews pending drafts in a dedicated screen: each draft shows the parsed sender, subject, and body; if the sender's email didn't match an existing coach, the user picks the school it's from before confirming. Confirming turns the draft into a real interaction (visible everywhere interactions show up); discarding removes it from the review queue without creating anything. Every family member gets an in-app notification when a new draft arrives.

There is no push/APNs component — "notification" here means a row in the existing `notifications` table, reusing the app's existing in-app notification list infrastructure.

---

## Web Implementation Summary

### Files Changed

**Phase 1 (backend/webhook, PR #622, commit `db2a44ba`)**
- `server/api/webhooks/inbound-email.post.ts` — Resend Inbound webhook receiver; verifies Svix signature, resolves family from the `to` address's token, stores raw payload, fetches full body via `resend.emails.receiving.get()`, parses the "On ... wrote:" quoted block, matches sender email against family's coaches, inserts a `pending` draft.
- `server/utils/parseForwardedEmail.ts` — pure regex parser for Gmail/Apple Mail ("On ... wrote:") and Outlook (From:/Sent: header block) forward formats. Returns `{ senderName, senderEmail, originalDate } | null`. Never throws.
- `server/utils/familyInboundToken.ts` — token generation (`generateInboundToken`, 8-char lowercase alphanumeric, collision-retry), resolution (`resolveFamilyByInboundToken`), and address parsing (`parseInboundToken` — expects local-part shape `family-<token>`).
- `server/utils/verifyResendWebhook.ts` — Svix signature verification (server-only concern).
- `server/api/cron/inbound-email-purge.get.ts` — purges `raw_inbound_emails` after 7 days (server-only, no iOS work).
- `server/middleware/csrf.ts` — exempts the webhook route from CSRF (server-only concern).
- `supabase/migrations/20260906000000_family_inbound_token.sql` — adds `family_units.inbound_token` (unique, `^[a-z0-9]{8}$`), backfilled for existing families.
- `supabase/migrations/20260906000001_inbound_email_tables.sql` — creates `raw_inbound_emails` (service-role only, no client SELECT) and `inbound_email_drafts` (family-scoped RLS SELECT only; INSERT/UPDATE via service-role/API layer).

**Phase 2 (review UI, confirm/discard, notifications, PR #641, commit `89527fac`)**
- `server/api/inbound-drafts/index.get.ts` — `GET /api/inbound-drafts` list endpoint.
- `server/api/inbound-drafts/[id]/confirm.post.ts` — `POST /api/inbound-drafts/:id/confirm` — turns a draft into a real `interactions` row.
- `server/api/inbound-drafts/[id]/discard.post.ts` — `POST /api/inbound-drafts/:id/discard`.
- `server/api/family/inbound-address.get.ts` — `GET /api/family/inbound-address` — returns the full forwarding address for display.
- `server/utils/familyMembership.ts` — shared `resolveFamilyUnitId(event, userId)` helper (403 if not a family member, 500 on real DB failure).
- `server/utils/matchCoachByEmail.ts` — family-scoped, case-insensitive (ILIKE, wildcard-escaped) coach lookup by email; never creates a coach.
- Notification fan-out added inline in `inbound-email.post.ts` — after a draft insert succeeds, inserts one `notifications` row per `family_members` row for the family (`type: "inbound_interaction"`, `action_url: "/inbox/inbound-drafts"`, `related_entity_id`: the draft id, `related_entity_type: "inbound_email_draft"`). Never fails the webhook if this insert fails.
- `composables/useInboundDrafts.ts` — `{ drafts, loading, error, fetchDrafts, confirmDraft, discardDraft }`.
- `pages/inbox/inbound-drafts.vue` — the review screen.
- `pages/settings/family-management.vue` — added a "Forward Coach Emails" section (blue card, monospace address, copy button, link to the review screen).
- `components/Header/HeaderNavMore.vue` — added a "Coach Emails" nav entry (`/inbox/inbound-drafts`, icon `i-heroicons-inbox-arrow-down`).
- `nuxt.config.ts` — added `public.inboundEmailDomain` runtime config (the domain half of the forwarding address).

### DB/Migration Changes
Already applied to production. iOS does nothing here. Relevant columns iOS must know about (all via the API, never queried directly by iOS):
- `family_units.inbound_token` — 8-char token, not exposed directly; only the composed address (`family-<token>@<domain>`) is exposed via the address endpoint.
- `inbound_email_drafts` — see Data Models below for full Row shape.
- `notifications` — pre-existing table (not new this feature); the existing value `inbound_interaction` is reused, not added, in `notification_type`.

---

## What iOS Needs to Build

### Screens

| Screen | Purpose | Entry Point |
|---|---|---|
| Forwarding-address section (new content within `SettingsView` / a new `SettingsDestination`) | Shows the family's forwarding address, a copy action, and a link into the draft review screen | Settings → new "Coach Email Forwarding" row |
| `InboundDraftsView` | Lists pending drafts; per-draft confirm (with school picker if unmatched) or discard | Nav entry (mirror web's "Coach Emails" more-menu item) **and** deep-link from a notification tap (`actionUrl` → this screen) |

### Navigation

- Forwarding-address section lives inline in a new Settings destination (own `Section`/screen following the `SettingsDestination` enum pattern already used by `SettingsView.swift`) — a small standalone screen or a section on an existing "Family" settings screen, whichever fits the current Settings information architecture best.
- `InboundDraftsView` is a push destination (`NavigationStack`) reachable from wherever iOS surfaces its equivalent of the web's "More" menu, and also the destination when the user taps a notification whose `actionUrl` is `/inbox/inbound-drafts` (or `relatedEntityType == "inbound_email_draft"`) — map that server-side URL string to the native screen in the existing notification-tap handler (`NotificationsListViewModel`/wherever `actionUrl` routing currently lives).
- No modal needed; the school picker for an unmatched draft is inline on the draft's card (matches web), not a separate sheet — though a sheet is an acceptable native adaptation if it fits iOS's existing "pick a school" pattern.

### Section / Component Breakdown

**Settings → Forwarding Address section**
- Display: family's forwarding address in a monospace/fixed-width style, a short explanatory line ("Forward or CC emails from coaches to this address to automatically draft an interaction log entry for your family."), a copy-to-clipboard button, and a "Review forwarded coach emails →" link to `InboundDraftsView`.
- Interaction: tap to copy (`UIPasteboard`), confirmation via lightweight toast/haptic; tap link to navigate.
- States: hidden entirely while the address hasn't loaded yet (web renders nothing if the fetch is still pending or fails — do not show an empty/error placeholder here, this is a non-critical section). No loading spinner needed — web treats this as best-effort.

**`InboundDraftsView`**
- Display: list of pending drafts, each showing sender name (fallback "Unknown sender") + sender email in parens if present, subject, body text (plain, preserve line breaks), and — only when `matchedSchoolId` is null — a school picker.
- Interaction: "Confirm" button (disabled until a school is resolved — either already matched, or picked) and "Discard" button (secondary/outline style) per draft. On success, remove the draft from the visible list (no refetch needed — same optimistic-removal pattern as web).
- States: loading (fetching the list), error (fetch failed — show retry), empty ("No emails to review" + explanatory line about forwarding an email), populated list. Confirm/discard network failures show a toast ("Failed to confirm/discard this draft. Please try again.") and leave the draft in the list (web does this via try/catch around the composable calls).

---

## API Endpoints to Call

### List pending drafts

```
GET /api/inbound-drafts
Authorization: Bearer <access_token>

Query params:
  status  optional — "pending" (default) | "confirmed" | "discarded" | "all"

Response 200:
{
  "drafts": [ InboundEmailDraft, ... ]   // see Data Models
}

Error responses:
  400 — invalid status value — should not happen if client only sends allowlisted values
  403 — caller has no family_members row — should not occur for a normal authed user
  500 — server/DB failure — show generic "Failed to load drafts" error state
```
iOS should call with no `status` param (defaults to pending) for the review screen.

### Confirm a draft

```
POST /api/inbound-drafts/:id/confirm
Authorization: Bearer <access_token>
Content-Type: application/json

Body:
{
  "schoolId": "uuid"   // REQUIRED only when the draft's matchedSchoolId is null; omit/undefined otherwise
}

Response 200:
{
  "ok": true,
  "interactionId": "uuid"   // the newly-created (or already-existing, if re-confirmed) interaction's id
}

Error responses:
  400 — malformed draft id (not a UUID) — should not occur from normal navigation
  404 — draft not found, or belongs to another family — treat as "this draft no longer exists", remove from list
  422 — "schoolId is required — this draft has no matched school" (missing schoolId when needed)
      — "Invalid schoolId" (schoolId doesn't belong to caller's family)
      — "Cannot confirm a discarded draft"
  500 — server failure — show retry toast, draft stays in list
```
Confirming an already-`confirmed` draft is idempotent (200, returns the existing `interactionId`) — safe to retry blindly.

### Discard a draft

```
POST /api/inbound-drafts/:id/discard
Authorization: Bearer <access_token>

Response 200:
{ "ok": true }

Error responses:
  400 — malformed draft id
  404 — draft not found / wrong family
  500 — server failure — show retry toast, draft stays in list
```
Discarding an already-non-pending draft (confirmed or already-discarded) is a no-op success (200) — safe to retry.

### Get the family's forwarding address

```
GET /api/family/inbound-address
Authorization: Bearer <access_token>

Response 200:
{
  "address": "family-a1b2c3d4@inbound.therecruitingcompass.com"   // domain comes from server runtime config, do not hardcode
}

Error responses:
  403 — caller has no family_members row
  500 — server failure — swallow silently, hide the section (matches web's non-critical treatment)
```

---

## Data Models (Swift)

```swift
/// Maps to `inbound_email_drafts` row. Field names below are the exact JSON
/// keys returned by GET /api/inbound-drafts — all already snake_case in the
/// wire payload (Nitro returns raw Supabase rows, no camelCase mapping),
/// matching the same CodingKeys pattern already used by Interaction.swift
/// and Coach.swift in this codebase.
struct InboundEmailDraft: Codable, Identifiable {
    let id: String
    let familyUnitId: String
    let rawEmailId: String?
    let matchedCoachId: String?
    let matchedSchoolId: String?
    let senderName: String?
    let senderEmail: String?
    let subject: String?
    let bodyText: String?
    let occurredAt: String        // ISO 8601
    let status: String            // "pending" | "confirmed" | "discarded" — plain Postgres text w/ CHECK constraint, not an enum; keep as String
    let confirmedInteractionId: String?
    let createdAt: String         // ISO 8601

    enum CodingKeys: String, CodingKey {
        case id
        case familyUnitId = "family_unit_id"
        case rawEmailId = "raw_email_id"
        case matchedCoachId = "matched_coach_id"
        case matchedSchoolId = "matched_school_id"
        case senderName = "sender_name"
        case senderEmail = "sender_email"
        case subject
        case bodyText = "body_text"
        case occurredAt = "occurred_at"
        case status
        case confirmedInteractionId = "confirmed_interaction_id"
        case createdAt = "created_at"
    }
}

struct InboundDraftsListResponse: Codable {
    let drafts: [InboundEmailDraft]
}

struct InboundDraftConfirmRequest: Codable {
    let schoolId: String?
}

struct InboundDraftConfirmResponse: Codable {
    let ok: Bool
    let interactionId: String?
}

struct InboundDraftDiscardResponse: Codable {
    let ok: Bool
}

struct InboundAddressResponse: Codable {
    let address: String
}
```

Notes on JSON casing: `ok`/`interactionId` come from hand-written endpoint response bodies (camelCase, per the endpoint source), while the `drafts` array items come straight off the Supabase table (snake_case, per `CodingKeys` above). Do not assume one casing convention for the whole payload — the two response shapes are inconsistent by nature of the code that produces them; the field lists above are exact.

---

## Business Rules to Enforce Client-Side

- **Confirm button disabled state**: disabled unless `matchedSchoolId != nil` OR the user has picked a school in the inline picker for that draft. Mirrors web's `:disabled="!draft.matched_school_id && !schoolIdByDraft[draft.id]"`.
- **School picker only shown when unmatched**: only render/require a school picker for a draft when `matchedSchoolId == nil`. A matched draft confirms with an empty body (no `schoolId`).
- **Optimistic removal on success**: on a successful confirm or discard, remove that draft from the visible list immediately — no refetch of the whole list.
- **Non-blocking address fetch**: a failure to load the forwarding address must never surface an error to the user or block the rest of the Settings screen — simply don't show the section.
- **Draft body rendering**: preserve line breaks in `bodyText` (web uses `whitespace-pre-line`); render as plain text, no HTML.
- **Sender fallback text**: when `senderName` is null, display "Unknown sender" (do not fall back to email or leave blank).

---

## Excluded Items (No iOS Work Needed)

- **DB migrations** (`family_units.inbound_token`, `raw_inbound_emails`, `inbound_email_drafts` tables) — already applied to production.
- **RLS policies** — family-scoped SELECT policy on `inbound_email_drafts` is enforced by Supabase; the confirm/discard/list endpoints additionally do an app-level family-membership check via the admin (service-role) client — none of this is iOS's concern, iOS just calls the endpoints with its normal auth token.
- **Resend webhook receiver, Svix signature verification, CSRF exemption** — entirely server-side; the player forwards email using their normal email client (Mail app, Gmail app, etc.), not anything built into this app.
- **Forwarded-email parsing** (`parseForwardedEmail.ts` — Gmail/Apple Mail/Outlook quote-block regex) — server-side only, iOS never sees raw email bodies pre-parse.
- **Coach-by-email matching** (`matchCoachByEmail.ts`) — server-side; iOS receives the already-resolved `matchedCoachId`/`matchedSchoolId`.
- **7-day raw-email purge cron** — server-side housekeeping.
- **CSRF tokens** — mobile clients are exempt anyway (standard app-wide rule).
- **Push notifications / APNs** — this feature does NOT add push notifications. The "notification on new draft" requirement is an in-app `notifications` table row using the app's existing `AppNotification`/`NotificationsServiceImpl` pipeline, and it reuses the existing `NotificationType.inboundInteraction` wire value (`"inbound_interaction"`) — no new `NotificationType` case is needed. Do not build new push infrastructure for this.

---

## Dependencies

- **`Features/Notifications/*`** — the existing `AppNotification` model, `NotificationsServiceImpl`, and `NotificationsListView`/`NotificationsListViewModel` already fetch/list/mark-read `notifications` rows and (per the model's `actionUrl`/`relatedEntityId`/`relatedEntityType` fields) presumably already route on tap. Confirm during implementation whether the tap-handler is generic (follows `actionUrl` blindly) or switches on `type` with hardcoded per-type navigation — if the latter, the existing `.inboundInteraction` case's handling (built for the unrelated "manual coach contact logged" notification) may need a `relatedEntityType == "inbound_email_draft"` branch added to route to `InboundDraftsView` instead of wherever it currently routes.
- **`Features/Settings/Views/SettingsView.swift`** — the forwarding-address section/screen slots in via a new `SettingsDestination` case.
- **`Features/Interactions/*`** and **`Features/Coaches/*`** — a confirmed draft resolves to a real `interactions` row; iOS's existing Interaction list/detail screens should pick up the new interaction automatically once the confirm call succeeds (no special-casing needed — it's a normal row with `type: "email"`, `direction: "inbound"`).
- **A school picker component** — web reuses `SchoolSelect`; iOS should reuse whatever component it already uses for "pick a school from my family's list" elsewhere (e.g. the interaction-logging flow).

---

## Notes for iOS Claude

- The forwarding address itself (`family-<token>@<domain>`) is generated and owned entirely server-side — iOS never generates, regenerates, or validates the token locally. Just display exactly what `/api/family/inbound-address` returns.
- `interactions.type` is `"email"` and `interactions.direction` is `"inbound"` for anything confirmed from a draft — if iOS's `Interaction`/UI branches on type/direction (e.g. different icons for phone vs email vs text), this is indistinguishable from any other inbound-email interaction; no new type is needed.
- **Naming collision, read carefully:** iOS's `Direction.inbound` (interaction direction) and `NotificationType.inboundInteraction` (wire `"inbound_interaction"`) predate this feature and mean "a coach reached out, manually logged" — a completely different concept from an email *draft*. The web's new notification reuses the same `"inbound_interaction"` wire value for a *different* underlying event (a draft was created). Do not create a second, confusingly-named notification type; reuse the existing `.inboundInteraction` case, but make sure its tap-routing correctly disambiguates via `relatedEntityType` (`"inbound_email_draft"` → drafts screen) rather than assuming every `.inboundInteraction` notification means the same thing it meant before this feature shipped.
- The `status` field on a draft is a plain Postgres `text` with a CHECK constraint (`pending`/`confirmed`/`discarded`), not a Postgres enum — don't model it as a Swift enum with exhaustive switch unless you also handle an unrecognized future value gracefully.
- Re-confirm and re-discard are both safe to retry (idempotent) — useful if iOS wants simple "retry on failure" UX without extra guard logic.
- Web deliberately does NOT auto-create a coach when the email doesn't match one — an unmatched sender just means "pick which school this is from"; the coach itself stays unlinked (`matchedCoachId: null` persists even after confirm — the interaction is inserted with `coach_id: draft.matched_coach_id`, i.e. still null). Don't build "create a coach from this draft" — that's explicitly out of scope (flagged as an open Phase 3 idea, not committed).
- Phase 3 (not yet built, plan-only, see the `docs/inbound-email-phase3-plan` branch on the web repo) covers: parser coverage for more mail-client quirks, auto-creating a coach on domain match, attachment→document linking, bulk-forward thread splitting, and admin analytics. None of that is in scope for this iOS spec — do not build ahead of it.

---

## Test Checklist

1. Settings shows a forwarding address in the expected format (`family-<8 chars>@<domain>`) with a working copy action.
2. Tapping "Review forwarded coach emails" (or nav entry) navigates to the drafts list.
3. Drafts list shows loading → populated states correctly; empty state shows the "No emails to review" message when there are zero pending drafts.
4. A draft with a matched school shows no school picker, and its Confirm button is enabled immediately.
5. A draft with no matched school shows a school picker; Confirm stays disabled until a school is selected.
6. Confirming a draft removes it from the list and (verify via the Interactions screen) creates a new interaction with the right subject/body/occurred date.
7. Discarding a draft removes it from the list and does NOT create an interaction.
8. Confirm/discard network failure shows an error toast and leaves the draft visible for retry.
9. Tapping a notification with `relatedEntityType == "inbound_email_draft"` (or `actionUrl == "/inbox/inbound-drafts"`) deep-links into the drafts list — and does NOT route to whatever the pre-existing "manual inbound interaction" notification tap currently routes to.
10. Re-tapping confirm on a draft that's already confirmed (e.g. a stale UI state) does not create a duplicate interaction — the endpoint returns the same `interactionId`.
11. A family with zero drafts ever created still shows the forwarding-address section correctly (the address existing does not require any drafts to exist).

---

## Open Questions

- Does `NotificationsListViewModel`'s (or wherever tap-handling lives) routing logic branch generically on `actionUrl`, or does it hardcode per-`type` navigation? Confirm before wiring the drafts-screen deep link, since the answer determines whether this is a zero-navigation-code-change reuse or requires adding a `relatedEntityType` branch to existing `.inboundInteraction` handling.
- Confirm which existing "pick a school" iOS component/pattern to reuse for the unmatched-draft picker (mirrors web's `SchoolSelect`).
