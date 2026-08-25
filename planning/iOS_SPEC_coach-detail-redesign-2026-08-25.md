# iOS Spec: Coach Detail Redesign

**Date:** 2026-08-25
**Source (web):** `feat/coach-detail-figma-capture` worktree, commits `91a98194`..`273d448c` (10 commits)
**Web spec:** `planning/2026-08-25-coach-detail-redesign-design.md`
**Status:** Web shipped and live. This is a documentation-only handoff — **no Swift code included**. A future iOS session implements from this.

## 0. What changed on web (context)

The Coach Detail page was rebuilt from a single-column layout with detail-local sub-components
(`CoachHeader`, `CoachStatsGrid`, `CoachMetricsPanel`, `CoachInteractionsLog`, `CoachNotesEditor`)
into a two-column layout (340px left rail + fluid right column) with two new persisted DB fields,
a derived-insights composable, and alert/stat-card/table UI driven entirely from existing data plus
the two new fields. `CommunicationPanel` (shared across coaches list / school coaches / dashboard
widget) was intentionally **not** forked or restyled — it mounts as-is in the new layout.

---

## 1. New data model fields (already live on shared Supabase DB — both platforms read/write it)

`coaches` table gained two columns (migration already applied to prod DB `xpxzhqghxecsjhvklsqg`,
serves both prod and QA):

```sql
ALTER TABLE coaches
  ADD COLUMN tags   text[] NOT NULL DEFAULT '{}',
  ADD COLUMN source text   NULL;
```

| Column | Type | Default | Constraint (enforced by web Zod, iOS must match) |
|---|---|---|---|
| `tags` | `text[]` | `{}` | Array of trimmed, non-empty strings. Max **20** items. Each string max **40** chars. |
| `source` | `text` (nullable) | `NULL` | Optional free text. Max **80** chars. |

**iOS action items:**
- Add `tags: [String]` (default `[]`) and `source: String?` to the iOS `Coach` model.
- Any coach create/edit form (iOS equivalent of `EditCoachModal` + create form) must add Tags
  (chip editor, add/remove) and Source (free-text field) inputs, with the same caps enforced
  client-side before write (20 tags / 40 chars each / 80 chars source).
- No new enum or seed table — tags are free-form, source is free text. No autocomplete/taxonomy
  planned (explicitly deferred on web too).
- RLS unchanged — `coaches` is already family-scoped; new columns inherit existing policies.

Web reference (validators): `utils/validation/schemas.ts` — `coachSchema`:
```ts
tags: z.array(sanitizedTextSchema(40)).max(20).default([]),
source: sanitizedTextSchema(80).nullable().optional(),
```

---

## 2. Layout adaptation: two-column (web) → vertical scroll (iOS portrait)

Web is a CSS grid `lg:grid-cols-[340px_1fr]` (single column below `lg`). iOS has no wide-viewport
equivalent by default (unless a future iPad split-view layout is added — not speced here), so treat
the **mobile-stacked web order as the iOS portrait order**: everything the left rail contains, in
order, followed by everything the right column contains, in order, in one vertical `ScrollView`.

**Section order top to bottom:**

1. **Identity card** — avatar (initials), name, email, Twitter/Instagram links
2. **Direct channels** — Email / Text / Call / Twitter / Instagram action buttons + Log Interaction
3. **Internal notes** — free-text notes editor
4. **Tags** — chips with add/remove
5. **Profile meta** — Coach Since / Source / Last Updated
6. **Alert banners** — Outreach Overdue (red, conditional) / Channel Preference detected (blue, conditional)
7. **Stat cards** — Days Since Contact / Total Interactions / Preferred Channel (3-up on web; consider
   a horizontal scroll row or stacked cards on narrow iOS widths — implementer's call, same 3 metrics)
8. **Communication analytics** — whatever the existing iOS equivalent of `CommunicationPanel` renders
   today (this was NOT redesigned on web; keep iOS's existing communication/analytics section as-is,
   just re-sequence it into this new order)
9. **Interactions log** — filter bar + table/list (Type / Direction / Date range / Sentiment filters;
   Shown/Sent/Received summary pills; rows show Channel · Notes · Date)

If iOS ever adds a landscape/iPad two-pane layout, replicate the web split: items 1–5 in a fixed-width
left pane, items 6–9 in the fluid right pane — this is a future enhancement, not required now.

---

## 3. Derived insights — port `useCoachInsights` logic exactly

Web composable: `composables/useCoachInsights.ts`. Pure function of `coach` + `interactions[]` — no
new persisted data, all computed client-side. iOS must reproduce these exact rules so both platforms
show identical numbers for the same coach/interactions.

```
OVERDUE_DAYS = 14   // exact threshold, do not change without updating both platforms

daysSinceContact:
  if coach.last_contact_date is null → null
  else → floor((now - last_contact_date) / 1 day), in whole days

isOverdue:
  daysSinceContact != null AND daysSinceContact > OVERDUE_DAYS   // strictly greater than 14

overdueAlert: same boolean as isOverdue (drives the red "Outreach Overdue" banner)

totalInteractions: interactions.count

sentReceived:
  sent = count where interaction.direction == "outbound"
  received = count of everything else (i.e. "inbound")

responseRate:
  if totalInteractions == 0 → 0
  else → round((sentReceived.received / totalInteractions) * 100)   // integer percent

preferredChannel:
  if interactions is empty → null
  else → the interaction.type with the highest count (mode); ties broken by Map/dictionary
         insertion order in the web implementation (first type reaching the max count as
         iterated) — not a meaningfully specified tiebreak, iOS may use first-encountered-max
         without introducing a behavior difference users would notice

channelPreferenceAlert:
  preferredChannel != null AND totalInteractions >= 1
  (i.e. true whenever there is at least one interaction — practically equivalent to
   "preferredChannel is non-null")
```

Note: `avgResponseTime` was named as a planned output in the design spec but was **not implemented**
on web (only `daysSinceContact`, `isOverdue`, `preferredChannel`, `totalInteractions`,
`sentReceived`, `responseRate`, `overdueAlert`, `channelPreferenceAlert` exist in the shipped
composable). Do not build an average-response-time metric on iOS unless product asks for it on both
platforms together.

---

## 4. Sections / components (what each one is and does)

### CoachIdentityCard
Avatar circle with initials (96px, 3px border) — no photo upload (deferred both platforms). Name,
email (tappable mailto), Twitter/Instagram handles as external links with a link glyph. Centered
layout, thin separator above the social rows.

### CoachChannelActions ("Direct Channels")
Six actions in a 2-column grid: Email, Text (SMS), Call, Twitter, Instagram, **Log Interaction**.
- Email/Text/Call open the corresponding native composer/dialer prefilled with the coach's contact
  info (parity with existing iOS coach-contact affordances if they exist).
- Twitter/Instagram open the coach's profile in-app or via deep link — **and each open fires a
  social-DM auto-log**: opening Twitter or Instagram from this button automatically logs an
  interaction record (type=twitter/instagram, direction=outbound) as a side effect of the tap, not
  a separate explicit action. This is a real, intentional behavior (see §6) — replicate on iOS, not
  just decorative buttons.
- Log Interaction opens the existing interaction-create flow with this coach pre-selected/prefilled.

### CoachInternalNotes
Wraps the existing coach-notes edit behavior (whatever the current iOS notes UI does) — header with
an edit affordance, body text, existing empty-state copy unchanged.

### CoachTagsCard ("Tags")
Chips rendering `coach.tags`, each removable (× on chip). "+ Add Tag" control appends a new tag
inline. Writes should be optimistic-then-persist against the `updateCoachTags(id, tags)`-equivalent
store/API action (web: coaches Pinia store action `updateCoachTags`). Enforce the 20-item/40-char
caps client-side before persisting.

### CoachProfileMeta ("Profile Meta")
Three key/value rows:
- **Coach Since** = `coach.created_at` (existing column, no new timestamp added)
- **Source** = `coach.source` (new field, §1)
- **Last Updated** = `coach.updated_at` (existing column)

### CoachAlerts
Two independent conditional banners (both, one, or neither can show):
- **Outreach Overdue** (urgent/red) — shown when `overdueAlert` is true. Copy communicates days
  since last contact exceeding the threshold.
- **Channel Preference detected** (info/blue) — shown when `channelPreferenceAlert` is true. Copy
  names the `preferredChannel`.

### CoachStatCards (3 KPI cards)
- **Days Since Contact** — big number, "OVERDUE" badge when `isOverdue`, red accent when overdue.
- **Total Interactions** — big number, "N interactions logged" subtext.
- **Preferred Channel** — channel name/icon, `responseRate`% subtext ("N% response rate").

Web renders a small ring/arc accent behind each number — **this ring does NOT encode a real
proportional value yet** (see §6, deferred). iOS should not attempt to reverse-engineer a
meaningful arc math from it; a plain number card (optionally with a decorative, non-data-bound ring
if visual parity is desired) is sufficient.

### Communication analytics (existing, unchanged)
Whatever iOS currently shows for coach communication history/analytics — web deliberately kept its
existing shared `CommunicationPanel` component unrestyled in the new layout rather than building the
Figma "Communication History & Analytics" gauge card. **Do not build a new gauge/ring analytics card
on iOS for this spec** — that's an explicitly deferred cross-platform follow-up (§6).

### Interactions filter + list/table
- **Filters:** Type, Direction (segmented: All/Sent/Received or similar), Date range, Sentiment.
- **Summary pills:** Shown (count matching current filters) / Sent / Received.
- **Rows:** one per interaction — Channel (icon + name), Notes/Subject (or empty-state dash), Date
  (+ direction indicator, e.g. a colored bar or label distinguishing sent vs received).
- Filtering/sorting logic is a straight port of whatever the existing `CoachInteractionsLog` did —
  no new business rules, just restyled/reorganized presentation on web; same expectation for iOS.

---

## 5. Design tokens (for visual parity — non-blocking on functionality)

Full hex→semantic mapping is in `.superpowers/sdd/2026-08-25-coach-detail-redesign-plan/task-8-design-spec.md`
(web-repo-local, Tailwind-oriented — not directly portable, but the **semantic color roles** below are
what iOS should match against its own design tokens/asset catalog:

| Role | Web token | Use |
|---|---|---|
| Card border/background | slate-200 border / white bg, 12px radius | All cards |
| Primary text | slate-900 | Names, values, headings |
| Secondary text | slate-600 | Body copy, sub-labels |
| Tertiary text | slate-500 | Dates, minor metadata |
| Label text | slate-400, uppercase, bold, small | Section labels (DIRECT CHANNELS, TAGS, etc.) |
| Email channel | blue-500 | Email button, sent-direction indicators, links |
| Text/SMS channel | emerald-500 | Text button, received-direction indicators |
| Call channel | orange-500 | Call button |
| Twitter channel | sky-500 | Twitter button |
| Instagram channel | fuchsia-500 | Instagram button |
| Log Interaction | slate-700 | Log Interaction button (neutral/dark, not a channel color) |
| Urgent/overdue alert | red-500 accent, red-50 bg, red-300 border | Outreach Overdue banner + stat card |
| Info alert | blue-500 accent, blue-50 bg | Channel Preference banner |
| Chips | slate-100 bg, slate-600 text | Tag chips |
| Table header / dropdown bg | slate-50 | Filter selects, table header row |
| Positive/sentiment badge | emerald-50 bg, emerald-200 border, emerald-500 text | Sentiment pill |

Map each role to the closest existing iOS color asset (or add new ones matching these hex values if
the iOS design system doesn't already have blue-500/emerald-500/orange-500/sky-500/fuchsia-500/
slate-* equivalents). Exact numeric spacing/sizing (96px avatar, 340px rail, etc.) is web-specific
CSS and does not need pixel-exact port — match proportions/hierarchy, not literal points.

---

## 6. Deferred / known deltas (do not build these on iOS either — flagged, not forgotten)

1. **KPI ring/arc is decorative, not data-bound.** The rings behind the 3 stat cards on web do not
   encode a real proportional value (e.g. against a max or target). Don't invest in exact-value ring
   math on iOS; a static/decorative treatment (or plain card with no ring) is fine until product
   specs real ring semantics.
2. **"Communication History & Analytics" gauge card was never built.** Web kept its existing shared
   `CommunicationPanel` unrestyled rather than building the Figma gauge-card visual. This is a
   cross-platform follow-up, not something iOS should build ahead of web.
3. **Social-DM auto-logging fires on open, not on confirm.** Tapping Twitter or Instagram in Direct
   Channels immediately logs an outbound interaction as a side effect of opening the link — there is
   no separate "did you actually message them?" confirmation. This is intentional (existing web
   behavior, restored in commit `6f1dcdfc` after being dropped during the rebuild) — replicate the
   same fire-on-open behavior on iOS, don't add a confirmation step that would create platform
   divergence.
4. **Avatar photo upload** — initials-only for v1, both platforms.
5. **Tag taxonomy/autocomplete/shared vocabulary** — free-form chips only, both platforms.
6. **Average response time metric** — named in the original design doc, not implemented on web
   (§3) — do not build on iOS unless it lands on web first.

---

## 7. Parity checklist (for the iOS implementing session)

- [ ] `Coach` model: add `tags: [String]` (default `[]`) and `source: String?`
- [ ] Coach create form: add Tags (chip input) + Source (text field) with 20/40/80 char caps
- [ ] Coach edit form: same Tags + Source inputs, same caps
- [ ] Coach detail screen: rebuilt as single vertical scroll in the 9-section order from §2
- [ ] Identity card: avatar initials, name, email, Twitter/Instagram links
- [ ] Direct Channels: 6 actions (Email/Text/Call/Twitter/Instagram/Log Interaction), correct channel colors
- [ ] Twitter/Instagram open **auto-logs** an outbound interaction (§6.3) — verify no confirmation dialog added
- [ ] Internal Notes: existing edit behavior, unchanged
- [ ] Tags card: chips + add/remove, writes through an `updateCoachTags`-equivalent call, caps enforced
- [ ] Profile Meta: Coach Since (`created_at`) / Source (`source`) / Last Updated (`updated_at`)
- [ ] `useCoachInsights` ported exactly: `OVERDUE_DAYS = 14`, `daysSinceContact`, `isOverdue`
      (strictly `> 14`), `totalInteractions`, `sentReceived` (outbound=sent, else received),
      `responseRate` (rounded %), `preferredChannel` (mode of interaction type), `overdueAlert`,
      `channelPreferenceAlert`
- [ ] Alerts: Outreach Overdue (red, conditional on `overdueAlert`) + Channel Preference (blue,
      conditional on `channelPreferenceAlert`) — both independently conditional, can co-occur
- [ ] 3 stat cards: Days Since Contact (+ OVERDUE badge), Total Interactions, Preferred Channel
      (+ response rate %) — no data-bound ring math (§6.1)
- [ ] Existing communication/analytics section kept as-is, just re-sequenced (no new gauge card, §6.2)
- [ ] Interactions list: Type/Direction/Date-range/Sentiment filters, Shown/Sent/Received summary,
      rows show Channel/Notes/Date — logic ported from existing iOS interactions display, not rewritten
- [ ] Color roles mapped from §5 table to iOS design tokens (or new assets added matching the hex values)
- [ ] No avatar upload, no tag autocomplete, no avg-response-time metric (§6.4–6.6) — out of scope
- [ ] Manual QA: same coach record viewed on web and iOS shows identical `daysSinceContact`,
      `isOverdue`, `preferredChannel`, `responseRate`, `tags`, `source` values
