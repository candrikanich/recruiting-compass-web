# Inbound Email Ingestion — Phase 3: Polish + Accuracy (issue #586)

Phase 1 (webhook ingestion) and Phase 2 (draft review UI, confirm/discard,
notifications) are both live. This plan covers issue #586's own Phase 3
checklist:

- [ ] Improve parser coverage (mobile-forwarded emails, plain-text mangling,
      non-English clients)
- [ ] Auto-create a draft coach record when the sender's domain matches a
      tracked school but no coach record exists yet
- [ ] Attachment handling — store a coach's attachments (questionnaires, camp
      invites) as documents linked to the interaction
- [ ] Bulk forward support — a forward containing multiple quoted messages
      produces multiple drafts, not one
- [ ] Analytics — forwarding adoption rate, confirmation rate, parsing
      accuracy

The "Future Phase" item in the issue (iOS share-sheet SMS logging) is
unrelated infra (iOS-only, no email pipeline involved) and is explicitly
OUT of scope for this plan.

No DB migration is anticipated for Tasks 1, 4, 5. Task 2 needs one column
addition (see Task 2). Task 3 needs one new join table (see Task 3) — both
flagged up front so they go through the normal migration path rather than
surfacing as a mid-task surprise.

## Current state (verified against the live code this plan is built on)

- `server/utils/parseForwardedEmail.ts` — regex-based, handles exactly two
  shapes: Gmail/Apple-Mail's single `On <date> <name> <email> wrote:` line,
  and Outlook's separate `From:`/`Sent:` header block. Returns `null` (not a
  throw) on no match — the webhook already treats a null parse as "store an
  unmatched draft", which Task 1 keeps as the failure mode.
- `server/utils/matchCoachByEmail.ts` — exact (case-insensitive) email match
  against the family's own `coaches` table only. Never creates a coach;
  returns `{coachId: null, schoolId: null}` on no match, which is exactly
  the case Task 2 must handle.
- `server/api/webhooks/inbound-email.post.ts` — one `email.received` payload
  → one `inbound_email_drafts` row. Fetches the full body via
  `resend.emails.receiving.get(email_id)` (metadata-only webhook, verified
  Phase 1 finding). This is the file Tasks 1, 2, 3, 4 all extend.
- `documents` table (`types/database.ts`) — `file_url`, `title`, `type`
  (enum: `highlight_video | transcript | resume | rec_letter | questionnaire
  | stats_sheet` — **no generic/"other" value**), `school_id`,
  `shared_with_schools`, `user_id`, `uploaded_by`, `family_unit_id`. No
  `interaction_id` column today — Task 3 needs one.
- Document uploads today go through `composables/useDocumentUpload.ts` on
  the client, `supabase.storage.from("documents").upload(...)` with path
  `${userId}/${timestamp}-${filename}`. Task 3's uploads are server-side
  (webhook has no `userId` — a forwarded email isn't an authenticated
  request) so it needs its own storage-write path, keeping the bucket name
  but keying by `family_unit_id` instead.
- `resend` SDK (`node_modules/resend/dist/index.mjs`) confirms
  `resend.emails.receiving.attachments.list(emailId)` and
  `resend.emails.receiving.attachments.get(emailId, attachmentId)` exist as
  real API surface — Task 3 is buildable, not speculative.
- `utils/growthAnalytics.ts` + `server/api/admin/growth.get.ts` already
  compute feature-adoption counts (distinct users touching a table) over a
  rolling window, degrading per-table on failure rather than 500ing the
  whole panel. Task 5 extends this existing panel rather than building a
  new one — matches the "enhance, don't add a new /admin page" precedent
  set by the Ops-health spec (see MEMORY `[[admin-suite-foundation]]`).

## Task 1 — Parser coverage: mobile forwards, plain-text mangling, non-English

**Problem:** `ON_WROTE_RE` and the Outlook pair assume a specific literal
English phrasing and clean quoting. Real-world gaps, in probable frequency
order:

1. **Mobile Gmail/Outlook apps** often forward with `---------- Forwarded
   message ---------` as a header line above a `From: / Date: / Subject: /
   To:` block (Gmail's own "Forward" button on mobile uses this format, not
   the desktop `On ... wrote:` inline quote). This is NOT the same shape as
   the existing `OUTLOOK_FROM_RE`/`OUTLOOK_SENT_RE` pair — order and label
   text differ (`Date:` not `Sent:`), and it appears with Gmail forwards
   too, not just Outlook.
2. **Plain-text mangling**: forwarding clients that strip HTML and hard-wrap
   at ~78 columns can break the `On <date> <name> <email> wrote:` line
   itself across two lines. The current regex requires it as one contiguous
   match and silently returns `null` on a hard-wrapped split.
3. **Non-English clients**: "wrote:" / "escribió:" / "a écrit :" / "schrieb:"
   etc. — genuinely open-ended. Scope this pass to detecting the *shape*
   (quote-marker line + indented/`>`-prefixed body) rather than chasing every
   locale's exact verb, and add the 2-3 highest-value locales explicitly
   (Spanish, given youth sports' international recruiting audience) rather
   than trying to be exhaustive.

**Build:**
- Add a `FORWARDED_MESSAGE_HEADER_RE` branch to `parseForwardedEmail.ts` for
  the `---------- Forwarded message ---------` + `From:/Date:/Subject:/To:`
  block shape (mobile Gmail/Outlook). Reuses the existing `OUTLOOK_FROM_RE`
  pattern for the `From:` line; add a small `Date:` variant of
  `OUTLOOK_SENT_RE`.
- Before running `ON_WROTE_RE`, normalize hard-wrapped text: collapse a
  single newline that is NOT followed by another newline (i.e., not a
  paragraph break) and NOT preceded by a quote-marker (`>`) into a space,
  before matching. Keep this narrowly scoped to just the "On ... wrote:"
  line-recovery, not a full-body reflow — don't touch `bodyText` as stored,
  only a working copy used for sender extraction.
- Add one Spanish pattern (`escribió:`) as a second alternative on the
  existing `ON_WROTE_RE`-style match, proving the "shape not exact phrase"
  approach generalizes before deciding whether to add more locales later.
- Every new branch: same never-throws contract, same fallback to `null` on
  no match (webhook already handles `null` → unmatched-but-stored draft;
  nothing about that behavior changes).

**Tests:** fixture-per-format in `tests/unit/server/utils/parseForwardedEmail.spec.ts`
(existing file — extend it): mobile Gmail forward, mobile Outlook forward,
a hard-wrapped desktop Gmail forward (the `On...wrote:` line split across
two lines), one Spanish-language forward. Also a fixture proving something
that still legitimately matches nothing (e.g., a from-scratch email with no
forward markers at all) still returns `null`, not a false positive.

## Task 2 — Auto-create a draft coach on domain match

**Problem:** `matchCoachByEmail` only checks the family's *existing*
`coaches` rows. If a coach's domain matches a school the family already
tracks (`schools` table) but no `coaches` row exists for that person yet,
today's flow stores the draft with `matched_coach_id: null` — the player
still has to manually create the coach before confirming.

**Design decision needed before building (flag to Chris, don't decide
silently — this is a data-provenance question, same class as Phase 2 Task
4's notification-type gap):**

`coaches.source` is a free-text column (`string | null`, already used per
memory `[[coach-outreach-templates]]` — check its existing values in the
live DB before picking a new one) — auto-created coaches should be
distinguishable from ones the player entered by hand, so a bad domain match
is visibly correctable, not silently indistinguishable from a real coach
record. **Ruling to make at task start:** either (a) reuse an existing
`source` value if one already means "system-inferred", or (b) add a new
value like `"inbound_email_auto"`. This plan does not invent one — first
implementer step is `SELECT DISTINCT source FROM coaches` against live prod
via Supabase MCP and either match an existing convention or escalate for a
value name.

**Build:**
- Extend `matchCoachByEmail` (or add a sibling function — implementer's
  call, whichever keeps `matchCoachByEmail`'s existing "read-only, family's
  coaches only" contract intact rather than silently growing side effects
  into it) to, on no coach match: extract the sender's email domain, look
  up `schools` for the family where a school's website domain matches
  (needs domain-from-URL extraction — `schools.website` is a full URL, not
  a bare domain; write a small pure `extractDomain` helper, test it against
  `https://www.osu.edu/athletics`, `osu.edu`, malformed/missing URLs).
- On a school-domain match with no coach: INSERT a `coaches` row
  (`first_name`/`last_name` best-effort split from `parseForwardedEmail`'s
  `senderName`, falling back to a placeholder + the email's local-part
  when `senderName` is null — never insert an empty-string name), `role`
  defaulting to whatever the `coach_role` enum's existing "unknown/other"
  convention is (check `types/database.ts`'s `coach_role` enum before
  picking — do not invent a value here either), `school_id`, the chosen
  `source` value from the ruling above.
- The draft's `matched_coach_id` now points at this newly-created row.
  Confirming the draft behaves exactly as today (Task 2 of Phase 2 already
  handles a `matched_coach_id`-present confirm) — no confirm-path changes.
- Never auto-create when the domain match is ambiguous (matches more than
  one tracked school, or matches a personal-email-provider domain like
  gmail.com/yahoo.com/outlook.com — maintain a small denylist constant, since
  a coach with a personal email address matching zero schools is common and
  must NOT falsely "match" every family that happens to also use gmail).

**Tests:** unit tests for `extractDomain` (URL edge cases). Unit tests for
the auto-create path in `matchCoachByEmail`'s test file — school-domain
match with no existing coach → new coach row inserted with correct fields;
personal-email domain → no auto-create, same `null` result as today;
ambiguous multi-school domain match → no auto-create (documented as a
deliberate false-negative bias — better to leave `matched_coach_id: null`
for a human to resolve than guess wrong and misattribute a coach to the
wrong school).

## Task 3 — Attachment handling: coach attachments → linked documents

**Problem:** A forwarded email's attachments (questionnaires, camp-invite
PDFs) are dropped entirely today — `bodyText` is the only thing persisted
from the full email fetch.

**Schema change required (flag for migration, not a silent add):**
`documents` has no `interaction_id` column and no document_type enum value
that fits "attachment forwarded with a coach email" (`questionnaire` is
close but wrong for e.g. a camp-invite flyer or roster PDF). Two decisions
for the plan-owner/Chris before Task 3 starts:
1. Add `documents.interaction_id uuid references interactions(id)` (nullable
   — most documents have no interaction) — the natural link since Phase 2's
   confirm flow already creates the `interactions` row an attachment should
   hang off of. Attachments arrive with the *draft*, before confirmation
   exists an `interactions` row — so attachments need to be staged
   somewhere until confirm time, or the FK needs to point at the draft
   instead until confirmed. **Recommend:** add `inbound_email_drafts`-side
   staging (a `raw_inbound_attachments` table mirroring the existing
   `raw_inbound_emails` pattern: `id, draft_id, family_unit_id, filename,
   content_type, storage_path, created_at`), and only create the `documents`
   row (with `interaction_id` set) at confirm time — mirrors how the draft
   itself stages the interaction until confirm, so it's the same pattern the
   codebase already trusts, not a new one.
2. `document_type` enum: propose adding `"coach_attachment"` as a new value
   — cleaner than overloading `questionnaire`. This is a migration; get it
   approved before building, same gate as every other schema change in this
   arc (`.github/workflows/migrate-prod.yml`, manual approval).

**Build (once schema approved):**
- Migration: `raw_inbound_attachments` table (RLS: no policy / service-role
  only, matching `raw_inbound_emails`'s existing convention) +
  `documents.interaction_id` nullable FK + `document_type` enum value
  addition.
- In `inbound-email.post.ts`, after fetching the full email: call
  `resend.emails.receiving.attachments.list(email_id)`, then
  `.get(email_id, attachmentId)` per attachment, upload each to the
  `documents` storage bucket under `${familyUnitId}/inbound/${draftId}-${filename}`
  via the admin storage client (service-role — no authenticated `userId`
  exists at webhook time), insert a `raw_inbound_attachments` row per file.
  Size-cap and content-type-allowlist the same way `useDocumentUpload.ts`'s
  client-side `validateFile` does (find and reuse that logic rather than
  reimplementing a second allowlist that can drift).
- In `confirm.post.ts` (Phase 2, extend): after the `interactions` insert
  succeeds, look up any `raw_inbound_attachments` rows for this draft, and
  for each, insert a `documents` row (`type: "coach_attachment"`,
  `interaction_id`, `family_unit_id`, `school_id` from the draft's matched
  school, `uploaded_by: userId` — the confirming user, `file_url` copied
  from the staged storage path). No file re-upload needed — same storage
  object, just a new DB row referencing it once the interaction exists.
- Discard path: no `documents` rows are ever created for a discarded draft
  (attachments stay staged-only, purged by whatever retention job handles
  `raw_inbound_emails`'s existing 7-day purge — extend that job to also
  purge orphaned `raw_inbound_attachments` + their storage objects for
  drafts that end up discarded or never confirmed).

**Tests:** webhook test — a payload with attachments metadata stages rows +
storage uploads (mock the Resend attachments client the same way
`receivingGetMock` is already mocked in the existing webhook spec). Confirm
endpoint test — confirming a draft with staged attachments creates
`documents` rows with the right `interaction_id`; confirming a draft with
none is unaffected (no accidental empty-array writes). Discard test —
discarding leaves staged rows untouched (purge is a separate job's
responsibility, not discard's).

## Task 4 — Bulk forward: multiple quoted messages → multiple drafts

**Problem:** A player forwarding an entire email *thread* (not just the
latest message) has multiple `On ... wrote:` blocks in one body — today's
parser only ever returns the first match, so only one coach/date gets
extracted and the rest of the thread's content is silently discarded into
a single draft's `body_text`.

**Build:**
- Add a `parseForwardedThread` function (in `parseForwardedEmail.ts` or a
  sibling file — implementer's call) that finds *all* occurrences of the
  quote-marker patterns Task 1 already recognizes, splits `bodyText` at
  each boundary, and returns an ordered array of `{parsed: ParsedForward |
  null, segmentText: string}` — one entry per detected message in the
  thread, oldest-message-last is Gmail/Outlook's usual quote order so don't
  assume a particular order without checking a real multi-hop thread
  fixture.
- In the webhook handler: when `parseForwardedThread` finds more than one
  segment, insert one `inbound_email_drafts` row per segment (each with its
  own `sender_name`/`sender_email`/`occurred_at` from that segment's parse,
  and that segment's slice of `body_text` — not the whole thread's text
  repeated N times) instead of the current single-draft insert. When it
  finds exactly one (today's normal case) or zero, behavior is unchanged —
  this must not regress the existing single-message path, so gate the new
  branch behind "more than 1 segment detected", not "always use the new
  parser."
- Notification fan-out: one notification per new draft, or one
  summarizing "N new coach emails from this forward"? **Ruling to make at
  task start** (product judgment, cheap to decide either way, escalate if
  genuinely unsure): recommend one notification per draft for consistency
  with the existing single-draft notification copy, since drafts already
  render as a list on `/inbox/inbound-drafts` and multiple near-simultaneous
  notifications from one forward is a minor, non-blocking UX question, not
  a correctness one.

**Tests:** webhook test with a real multi-message thread fixture (3+ nested
"On ... wrote:" blocks) → asserts N draft rows, each with distinct
sender/date and its own body slice. Regression test: existing single-message
fixtures from Task 1/original tests still produce exactly one draft (proves
the gating logic doesn't regress the common case).

## Task 5 — Analytics: adoption, confirmation rate, parsing accuracy

**Build (extends the existing admin Growth panel, not a new page — see
"Current state" above for why):**
- Add `raw_inbound_emails` (or `inbound_email_drafts`, whichever better
  represents "used the feature at all" — `inbound_email_drafts` is the
  right one, since a raw email with no resolvable family never becomes
  meaningful adoption) to `ADOPTION_TABLES` in `server/api/admin/growth.get.ts`
  — this alone gets "forwarding adoption rate" (distinct families with ≥1
  draft) for free from the existing `adoption()` helper, no new query
  needed.
- Add a small dedicated computation (new pure function in
  `utils/growthAnalytics.ts`, same pattern as `funnelWithDropoff`/
  `adoption`) for **confirmation rate**: `count(status='confirmed') /
  count(status IN ('confirmed','discarded'))` over the window — pending
  drafts are excluded from the denominator since they haven't been decided
  yet, and a rolling-window count would otherwise unfairly penalize a
  family who forwarded something yesterday and hasn't reviewed it.
- Add **parsing accuracy** as `count(matched_coach_id IS NOT NULL) /
  count(*)` over the window — a proxy metric (a draft can be correctly
  parsed but genuinely match no tracked coach), so label it in the UI as
  "coach match rate" not "parsing accuracy" to avoid overclaiming what it
  measures.
- Extend `types/adminGrowth.ts` + `pages/admin/growth.vue` with a small
  "Inbound Email" section (2-3 stat tiles: adoption count, confirmation
  rate, coach match rate) using the existing `AdminStatTile` primitive —
  no new component needed.

**Tests:** unit tests for the two new pure functions in
`utils/growthAnalytics.spec.ts` (existing file — extend it): confirmation
rate excludes pending from the denominator (edge case: all-pending window
→ rate is `null`/undefined, not a division-by-zero `NaN`, and the UI must
render that as "no data yet" not "0%"); coach-match rate with a
zero-draft window behaves the same way. Endpoint test extending
`server/api/admin/growth.get.ts`'s existing spec — the new fields appear in
the response shape, and the panel still degrades gracefully if the
`inbound_email_drafts` table read fails (matches every other per-table
degrade in that file already).

## Suggested task order

Tasks 1, 2, 4 all touch `parseForwardedEmail.ts`/the webhook handler and
have real interface dependencies on each other (Task 4's thread-splitting
needs Task 1's per-locale segment detection to find boundaries in a
non-English thread correctly) — build in order **1 → 2 → 4**, running each
through review before starting the next, same as Phase 2's dependency-aware
sequencing. Task 3 (attachments) is schema-gated and can run in parallel
with 1/2/4 once its migration is approved — it touches different files
(storage, confirm.post.ts) with no real interface collision. Task 5
(analytics) should go last — it reads from the tables the other four tasks
populate, so a preflight scan is trivial and there's nothing to build
against until they exist.

## Open questions for Chris before/at kickoff

1. **Task 2's `coaches.source` value** — reuse an existing convention or
   add `"inbound_email_auto"`? (First step: query live prod for existing
   `source` values.)
2. **Task 3's schema** — approve `raw_inbound_attachments` table +
   `documents.interaction_id` FK + `document_type` enum addition
   (`"coach_attachment"`) before building, per the standard migration gate.
3. **Task 4's notification shape** — one notification per draft (default
   recommendation above) or one bundled "N new emails" notification?
4. Locale scope for Task 1 beyond Spanish — ship with just Spanish as the
   proof-of-shape, or is there a known second-priority language worth
   adding now (issue doesn't name one)?
