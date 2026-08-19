# iOS Handoff Spec — Questionnaire gating + Log-Metric parity

**Date:** 2026-08-19
**Source of truth:** web app (shipped to `develop`/QA @ `bb970ac5`)
**Owner:** iOS session (Swift checkout at `recruiting-compass-ios`)
**Shared DB:** `xpxzhqghxecsjhvklsqg` (serves prod + QA) — migration already applied live.

Three web changes need iOS parity. #1 is the priority (shared-DB template behavior);
#2/#3 are self-contained Performance-form UI.

---

## Background — what changed on web

1. **Per-school recruiting-questionnaire gating.** The `intro-standard`
   coach-outreach template hardcoded "I've completed your recruiting
   questionnaire" into every send. It's now gated behind a per-school flag via a
   new template variable `{{questionnaireNote}}`.
2. **Log-metric unit** changed from free-text to a fixed dropdown.
3. **Log-metric value** now supports 3 decimals for `batting_avg`/`era`.

DB changes (already live, no iOS migration needed):
- `schools.questionnaire_completed boolean NOT NULL DEFAULT false`
- `schools.questionnaire_completed_at timestamptz NULL`
- `template_variables` row `questionnaireNote` (`source_type='computed'`,
  `is_required_default=false`, category `program`).
- `communication_templates.body`: the hardcoded sentence replaced with
  `{{questionnaireNote}}I'd welcome any feedback…` (the feedback sentence stays,
  the completion clause is now the variable).

---

## Item 1 — Questionnaire gating (PRIORITY)

### Current iOS behavior (verified, not broken-visible)

- `TemplateResolver.renderClean` (`Features/CommunicationTemplates/Models/TemplateResolver.swift:28`)
  strips unresolved **optional** tokens (those not in `requiredKeys`).
- iOS fetches `template_variables`; the new `questionnaireNote` row is
  `is_required_default=false` → optional → **stripped**.
- Net: iOS silently drops the clause. **No false claim, no `{{…}}` literal.**
  But iOS can **never** render the completion sentence, even when the athlete
  actually completed the questionnaire → functional under-parity.

### Target behavior (mirror web)

`questionnaireNote` resolves to `"I've completed your recruiting questionnaire. "`
(note trailing space) **only** when the school's `questionnaire_completed == true`,
otherwise to `""` (empty string, present in the values map — not nil/omitted, so
`renderClean` substitutes nothing and the line collapses cleanly).

Web reference: `utils/templateResolver.ts` — `COMPUTED.questionnaireNote`
(lines ~320-323) + `OPTIONAL_EMPTY` set (line ~329) + `resolveVariables`
optional branch (lines ~356-358).

### Changes

**a. `School` model** — `Features/Dashboard/Models/School.swift`
- Add stored props (mirror the `statusChangedAt: String?` pattern):
  - `let questionnaireCompleted: Bool` (default `false`)
  - `let questionnaireCompletedAt: String?`
- `CodingKeys` (near line 117): add
  - `case questionnaireCompleted = "questionnaire_completed"`
  - `case questionnaireCompletedAt = "questionnaire_completed_at"`
- `init(from:)` decode (near line 486):
  - `questionnaireCompleted = try container.decodeIfPresent(Bool.self, forKey: .questionnaireCompleted) ?? false`
  - `questionnaireCompletedAt = try container.decodeIfPresent(String.self, forKey: .questionnaireCompletedAt)`
- Thread through the memberwise `init` and **every** builder-copy call site that
  already passes `statusChangedAt:` (lines ~202, 242, 282, 322, 362, 402, 442).
  Same mechanical add everywhere `statusChangedAt` appears.

**b. Computed variable** — `Features/CommunicationTemplates/Models/TemplateComputed.swift`
- Add a `questionnaireNote` computed that reads
  `c.tables["schools"]?["questionnaire_completed"]` and returns the sentence when
  the value is boolean-true, else `""`. Follow the existing `schoolShortName`
  pattern (line 56) for reaching into `c.tables["schools"]`.
- **Optional-empty contract:** ensure the resolver writes `questionnaireNote`
  into the values map as `""` (not nil/absent) when not completed — mirror web's
  `OPTIONAL_EMPTY`. Wherever iOS turns computed results into the values dict, add
  a set of keys (`["questionnaireNote"]`) whose empty result is emitted as `""`.
  Without this, an absent value is fine (renderClean strips it), **but** an
  explicit `""` is safer and keeps web/iOS byte-identical.

**c. School-detail toggle (SwiftUI)** — school detail view
- Add a toggle "Recruiting questionnaire completed" bound to
  `questionnaireCompleted`. On change, persist to Supabase (update `schools` set
  `questionnaire_completed`, `questionnaire_completed_at = now()/nil`) via the
  existing school-update path (whatever backs `is_favorite`/status writes).
- Web reference: `components/School/SchoolInformationCard.vue` (Recruiting
  section) + `pages/schools/[id]/index.vue` `handleSetQuestionnaire`.

**d. Send-time prompt (parity, lower priority within #1)**
- Web shows an ask-but-skippable prompt when a chosen template contains
  `{{questionnaireNote}}` and the flag is unset: "Did you complete a recruiting
  questionnaire for <school>?" → Yes persists + re-renders; Skip leaves it false
  (line omitted).
- Web reference: `components/CommunicationPanel.vue` (`showQuestionnairePrompt`,
  `answerQuestionnaire`). Implement the equivalent in the iOS outreach compose
  view. **May defer** if the school-detail toggle (c) ships first — the toggle
  alone closes the functional gap; the prompt is the just-in-time nicety.

### Doc-fallback note
Web backfilled the flag from any questionnaire **document** linked to a school
(`documents.type='questionnaire'` via `school_id` or `shared_with_schools[]`).
That backfill already ran on the shared DB, so existing rows are correct for iOS
too — no iOS action. (New questionnaire-doc uploads do **not** auto-flip the flag
on either platform yet; both rely on the toggle/prompt.)

---

## Item 2 — Log-metric unit: free-text → fixed Picker

**File:** `Features/Performance/Components/MetricFormView.swift:59`
Currently: `TextField("e.g., mph, sec, avg", …)` — accepts any string.

**Target:** a `Picker` over the fixed vocabulary, auto-set + locked per metric
type (mirror web `components/Performance/LogMetricModal.vue`).

- Unit vocabulary (value → label): `"" → None`, `mph`, `sec`, `in → inches`,
  `ft → feet`, `lbs`, `count`, `%`.
- Auto-set per metric type and **disable** the Picker unless type is `other`:
  - `velocity → mph`, `exit_velo → mph`, `sixty_time → sec`, `pop_time → sec`,
    `batting_avg → "" (None)`, `era → "" (None)`, `strikeouts → count`,
    `other → user picks from vocab`.
- On metric-type change, set the unit to the canonical value; for `other`, leave
  it user-selectable.

Web reference: `LogMetricModal.vue` — `unitOptions`, `unitByMetricType`,
`unitLocked`, and the `watch(metricType, …)` auto-set.

---

## Item 3 — Log-metric value: 3 decimals for batting_avg / era

**Files:**
- `Features/Performance/Models/MetricFormState.swift:30` — currently
  `.fractionLength(2)` (display formats 2 decimals).
- `Features/Performance/Components/MetricFormView.swift:40-43` — value TextField
  (`.decimalPad`, no precision limit enforced on input).

**Target:** allow 3 decimal places for `batting_avg` and `era` (e.g. `.000`,
`3.250`); keep 2 for everything else. Make the fraction length dynamic on the
selected metric type: `batting_avg`/`era → 3`, else `2`. Mirror web's dynamic
`valueStep` (`0.001` vs `0.01`) in `LogMetricModal.vue`.

---

## Test plan (iOS)

- Unit: `questionnaireNote` computed — true → sentence (with trailing space),
  false/absent → `""`. Keep the render vectors byte-identical with the web
  `renderClean`/resolver tests where a shared fixture exists.
- Unit: metric unit auto-set + lock per type; `other` stays free.
- Unit: value formatter fraction length 3 for `batting_avg`/`era`, 2 otherwise.
- Manual: school-detail toggle persists + a template using `{{questionnaireNote}}`
  renders the sentence only when the flag is on.
- Build: `xcodebuild build -quiet` clean before done.

## Priority / sequencing

1. **1a + 1b + 1c** — model field + computed + school toggle. Closes the
   functional gap (iOS can render the sentence when true).
2. **2 + 3** — metric form UI (cheap, self-contained).
3. **1d** — send-time prompt (parity nicety, defer-able).
