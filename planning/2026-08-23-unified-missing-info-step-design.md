# Web Unified Missing-Info Step — Design Spec

**Date:** 2026-08-23
**Status:** Approved design, pending implementation plan
**Goal:** Bring the web coach-outreach composer to parity with iOS's unified
"Complete your info" step. Replace web's scattered info-collection surfaces with
one ordered, missing-only step, staged before Preview.

## Why

iOS (`QuickCommunicationViewModel.missingInfoFields`) collects everything a
template still needs — questionnaire, intended major, why-program / why-fit,
other authored vars, and a metric nudge — in ONE ordered step that only shows
what's actually missing, and auto-skips to preview when nothing is. Web scatters
the same concerns across three surfaces in `MessageComposer`:

- `CommunicationTemplateVariablesPanel` (inline authored/profile var rows)
- the amber questionnaire prompt (separate box in `CommunicationPanel`)
- the add-metric CTA (`NuxtLink` to `/performance`)

Web also never prompts for `intendedMajor` at compose time (the field exists in
`PlayerDetails` + the Academics tab, but is not surfaced in outreach).

## Decisions (locked with product)

1. **Full parity** — match iOS's unified step, including adding `intendedMajor`
   prompting to web compose.
2. **Staged flow** — composer becomes: **compose** (template + body) → **info**
   (missing-info step, skipped when empty) → **preview + send**.
3. **Parent-lock** — `programNote` / `fitReason` render locked for a parent
   composer with an "ask the athlete" note; all other rows stay editable.
4. **Metric link = navigating link (option a)** — the metric row links to
   `/performance` (loses the draft, same as web's current CTA). Inline quick-add
   (option b) is a documented follow-up, not in scope.

## Data model

Mirror iOS `MissingInfoField`:

```ts
export type MissingEditor =
  | { kind: "text"; multiline: boolean }
  | { kind: "boolean" }
  | { kind: "metricLink" };

export interface MissingInfoField {
  id: string;            // token key (questionnaireNote, intendedMajor, programNote, ...)
  title: string;
  prompt: string;
  editor: MissingEditor;
  editableByParent: boolean;
}
```

## Composable additions (`useQuickCommunication`, per channel controller)

The selected template + resolved values already live on each `ChannelController`.
Add, per controller:

- `missingInfoFields: ComputedRef<MissingInfoField[]>` — ordered, **missing-only**.
  Derivation order (fixed, NOT first-seen in the template body, so the step reads
  the same regardless of authoring):
  1. `questionnaireNote` — `boolean`, editableByParent: true — when the template
     body contains `{{questionnaireNote}}`, the school's `questionnaire_completed`
     is not true, and it hasn't been answered this compose.
  2. `intendedMajor` — `text` (single-line), editableByParent: true — when the
     template references `{{intendedMajor}}` and it's unresolved.
  3. `programNote` — `text` (multiline), **editableByParent: false** — when it's
     an authored ref and unresolved.
  4. `fitReason` — `text` (multiline), **editableByParent: false** — same.
  5. other authored refs (not programNote/fitReason/intendedMajor) — `text`
     single-line, editableByParent: true.
  6. `metric` — `metricLink`, editableByParent: true — when the template uses
     `{{metrics}}` / `{{carryingTool}}` and the athlete has none.
- `hasMissingInfo: ComputedRef<boolean>` = `missingInfoFields.value.length > 0`.
- `commitMissingInfo(): Promise<void>` — persists the answers that live outside
  the in-memory authored map, then re-resolves:
  - questionnaire → `updateSchool(..., questionnaire_completed: true)` when marked
    complete, else leave omitted (the optional token is stripped by `renderClean`);
  - `intendedMajor` → `writeField` into player prefs;
  - authored vars (programNote/fitReason/other) already flow through the authored
    map — no persist;
  - then `reresolve()` so preview reflects everything.
  Always safe to call: no-ops fields the current template didn't ask for.

**Parent-lock signal:** "is the athlete themselves" is the existing
`canEditProfile` predicate (`userStore.isAthlete && activeAthleteId === userStore
.user?.id`). A specificity row (programNote/fitReason) is locked when that is
`false` — i.e. a parent (or any non-owner) composing. All other rows ignore it.

Reuse existing pieces: authored map, `reresolve`, `updateSchool`, `writeField`,
the questionnaire override state.
Remove the now-duplicated standalone questionnaire prompt + add-metric CTA from
`CommunicationPanel` / `MessageComposer` once the step subsumes them.

## Component changes

- `MessageComposer.vue` gains a `stage` ref: `"compose" | "info" | "preview"`.
  - compose: template select + subject (email) + body edit + a Continue button.
  - Continue: if `hasMissingInfo` → `stage = "info"`, else `stage = "preview"`.
  - info: render `MissingInfoStep`; its Continue calls `commitMissingInfo()` then
    `stage = "preview"`. A Back returns to compose.
  - preview: the live preview + Send (existing behavior). A Back returns to the
    prior stage.
  - Selecting a different template resets `stage = "compose"`.
- New `components/Communication/MissingInfoStep.vue` — renders the ordered rows by
  `editor.kind`:
  - `boolean` → Yes / Skip (questionnaire);
  - `text` → input / textarea, bound to the authored map (or intendedMajor draft);
  - `metricLink` → `NuxtLink` to `/performance`;
  - parent-locked rows (`editableByParent === false && !canEditProfile`) →
    disabled with "Ask <athlete> to add this."

## Dependencies / prerequisites

- **`intendedMajor` template variable** must exist in the `template_variables`
  registry (source mapping to `player.intended_major`) for step (2) to detect it,
  and at least one seeded template must reference `{{intendedMajor}}` for the row
  to ever appear. Verify the registry; add the var + a migration/seed if missing.
  (Parity with iOS, which detects it via `referencedVariables`.)

## Testing

- Unit: pure `missingInfoFields` derivation — each field's show/hide condition,
  fixed ordering, empty → `hasMissingInfo === false`, parent-lock flags.
- Unit: `commitMissingInfo` persists questionnaire + intendedMajor and re-resolves;
  no-ops untouched fields.
- Component: `MissingInfoStep` renders each editor kind; parent-lock disables the
  specificity rows and shows the note.
- Component: `MessageComposer` staging — Continue skips the info stage when nothing
  is missing; advances through it when something is; template change resets stage.
- E2E (coach detail): compose a template that needs info → step appears → fill →
  preview → send; and a fully-resolved template → step is skipped.

## Out of scope / follow-ups

- Inline quick-add-metric (option b) — avoids the draft-loss on the metric link.
- Any change to iOS (this brings web up to iOS).

## Open questions

- Does a seeded web template already reference `{{intendedMajor}}`? If not, part of
  this work is adding one (or the row never shows). Confirm during planning.
