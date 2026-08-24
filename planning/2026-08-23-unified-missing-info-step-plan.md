# Unified Missing-Info Step — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port iOS's unified "Complete your info" step to the web coach-outreach composer — one ordered, missing-only step staged before Preview.

**Architecture:** A pure `deriveMissingInfoFields` function computes the ordered missing-only field list from the selected template + resolved values + athlete state. `useQuickCommunication` exposes it per channel controller (`missingInfoFields`, `hasMissingInfo`, `commitMissingInfo`). `MessageComposer` becomes a 3-stage flow (compose → info → preview); a new `MissingInfoStep.vue` renders the rows. The step subsumes the scattered questionnaire prompt, add-metric CTA, and inline variables panel.

**Tech Stack:** Nuxt 3 / Vue 3 `<script setup>`, Pinia, Vitest, @vue/test-utils, Playwright, Supabase (migration for the `intendedMajor` registry var).

**Spec:** `planning/2026-08-23-unified-missing-info-step-design.md`

## Global Constraints

- TypeScript strict; no `any` outside tests. `as const` for enums.
- UI: Tailwind utilities only; no raw hex/rgba in `<style>`/inline (audit:tokens gate).
- Composables `useXxx`, components PascalCase, pages kebab-case.
- Every task: `npm run type-check`, `npm run lint`, `npm run test` pass before commit.
- Auto-imported components in `components/Communication/` carry the `Communication` prefix (e.g. `CommunicationMissingInfoStep`).
- **Parity decision (resolved):** the unified step REPLACES `TemplateVariablesPanel`. Authored vars get editable rows; unresolved non-authored profile vars get a read-only "needs input — Edit in profile →" navigation row (no inline profile-field editing at compose, matching iOS which removed its inline vars panel).
- Field order is FIXED (not first-seen in the body): questionnaire → intendedMajor → programNote → fitReason → other authored → unresolved profile links → metric.
- Fail-open: a missing school/registry/metric lookup never blocks composing or sending.

---

### Task 1: Pure missing-info derivation — types + core function

**Files:**
- Create: `utils/communication/missingInfo.ts`
- Test: `tests/unit/utils/communication/missingInfo.spec.ts`

**Interfaces:**
- Produces:
  ```ts
  export type MissingEditor =
    | { kind: "text"; multiline: boolean }
    | { kind: "boolean" }
    | { kind: "metricLink" }
    | { kind: "profileLink" };

  export interface MissingInfoField {
    id: string;
    title: string;
    prompt: string;
    editor: MissingEditor;
    editableByParent: boolean;
  }

  export interface MissingInfoInput {
    /** Variable keys referenced by the selected template (subject+body), any order. */
    referencedKeys: string[];
    /** Resolved key -> value map for the current render (empty string / missing = unresolved). */
    values: Record<string, string>;
    /** Keys whose registry source_type is "authored". */
    authoredKeys: Set<string>;
    /** Human labels per key (registry-derived), for "other authored" rows. */
    labels: Record<string, string>;
    /** Raw template body (questionnaireNote is a computed scalar, detected off the body). */
    body: string;
    /** School questionnaire already complete (or answered "yes" this compose). */
    questionnaireComplete: boolean;
    /** The athlete has at least one performance metric. */
    hasMetric: boolean;
    /** Whether the composer is the athlete editing their own data (parent-lock signal). */
    canEditProfile: boolean;
    /** Athlete display name for the parent-lock note. */
    athleteName: string;
  }

  export function deriveMissingInfoFields(input: MissingInfoInput): MissingInfoField[];
  ```

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/utils/communication/missingInfo.spec.ts
import { describe, it, expect } from "vitest";
import { deriveMissingInfoFields, type MissingInfoInput } from "~/utils/communication/missingInfo";

const base: MissingInfoInput = {
  referencedKeys: [],
  values: {},
  authoredKeys: new Set(),
  labels: {},
  body: "",
  questionnaireComplete: false,
  hasMetric: true,
  canEditProfile: true,
  athleteName: "Jordan",
};

describe("deriveMissingInfoFields", () => {
  it("returns [] when the template needs nothing", () => {
    expect(deriveMissingInfoFields(base)).toEqual([]);
  });

  it("adds a questionnaire boolean row when the body uses the note and it's incomplete", () => {
    const rows = deriveMissingInfoFields({ ...base, body: "Hi {{questionnaireNote}}" });
    expect(rows.map((r) => r.id)).toEqual(["questionnaireNote"]);
    expect(rows[0].editor).toEqual({ kind: "boolean" });
  });

  it("omits the questionnaire row once complete", () => {
    const rows = deriveMissingInfoFields({
      ...base,
      body: "Hi {{questionnaireNote}}",
      questionnaireComplete: true,
    });
    expect(rows).toEqual([]);
  });

  it("prompts intendedMajor when referenced and unresolved", () => {
    const rows = deriveMissingInfoFields({
      ...base,
      referencedKeys: ["intendedMajor"],
      authoredKeys: new Set(),
    });
    expect(rows.map((r) => r.id)).toContain("intendedMajor");
  });

  it("locks programNote/fitReason for a parent, editable for the athlete", () => {
    const input = {
      ...base,
      referencedKeys: ["programNote", "fitReason"],
      authoredKeys: new Set(["programNote", "fitReason"]),
    };
    const athlete = deriveMissingInfoFields({ ...input, canEditProfile: true });
    const parent = deriveMissingInfoFields({ ...input, canEditProfile: false });
    expect(athlete.every((r) => r.editableByParent || r.id === "programNote")).toBe(true);
    expect(parent.find((r) => r.id === "programNote")!.editableByParent).toBe(false);
  });

  it("orders fixed: questionnaire, intendedMajor, programNote, fitReason, other, metric", () => {
    const rows = deriveMissingInfoFields({
      ...base,
      body: "{{questionnaireNote}}",
      referencedKeys: ["updateHook", "intendedMajor", "fitReason", "programNote", "metrics"],
      authoredKeys: new Set(["updateHook", "programNote", "fitReason"]),
      labels: { updateHook: "Recent update" },
      hasMetric: false,
    });
    expect(rows.map((r) => r.id)).toEqual([
      "questionnaireNote",
      "intendedMajor",
      "programNote",
      "fitReason",
      "updateHook",
      "metrics",
    ]);
  });

  it("adds a metric row only when a metric var is used and none exist", () => {
    const used = deriveMissingInfoFields({
      ...base,
      referencedKeys: ["metrics"],
      hasMetric: false,
    });
    expect(used.map((r) => r.id)).toEqual(["metrics"]);
    expect(used[0].editor).toEqual({ kind: "metricLink" });
    const has = deriveMissingInfoFields({ ...base, referencedKeys: ["metrics"], hasMetric: true });
    expect(has).toEqual([]);
  });

  it("adds a profileLink row for an unresolved non-authored profile var", () => {
    const rows = deriveMissingInfoFields({
      ...base,
      referencedKeys: ["hsCoachName"],
      authoredKeys: new Set(),
      labels: { hsCoachName: "HS coach" },
    });
    expect(rows.map((r) => r.id)).toEqual(["hsCoachName"]);
    expect(rows[0].editor).toEqual({ kind: "profileLink" });
  });
});
```

- [ ] **Step 2: Run the test — verify it fails**

Run: `npx vitest run tests/unit/utils/communication/missingInfo.spec.ts`
Expected: FAIL (module not found / `deriveMissingInfoFields` undefined).

- [ ] **Step 3: Implement `utils/communication/missingInfo.ts`**

```ts
export type MissingEditor =
  | { kind: "text"; multiline: boolean }
  | { kind: "boolean" }
  | { kind: "metricLink" }
  | { kind: "profileLink" };

export interface MissingInfoField {
  id: string;
  title: string;
  prompt: string;
  editor: MissingEditor;
  editableByParent: boolean;
}

export interface MissingInfoInput {
  referencedKeys: string[];
  values: Record<string, string>;
  authoredKeys: Set<string>;
  labels: Record<string, string>;
  body: string;
  questionnaireComplete: boolean;
  hasMetric: boolean;
  canEditProfile: boolean;
  athleteName: string;
}

const METRIC_KEYS = new Set(["metrics", "carryingTool"]);
const isResolved = (values: Record<string, string>, key: string): boolean =>
  !!(values[key] && values[key].trim());

/**
 * Ordered, missing-only list of the things the selected template still needs.
 * Order is FIXED here (not first-seen in the body) so the step reads the same
 * regardless of template authoring. Empty result → the compose flow skips the
 * info stage straight to preview. Pure; mirrors iOS `missingInfoFields`.
 */
export function deriveMissingInfoFields(input: MissingInfoInput): MissingInfoField[] {
  const rows: MissingInfoField[] = [];
  const referenced = new Set(input.referencedKeys);
  const askAthlete = (label: string) => `Ask ${input.athleteName} to add this`;

  // 1. Questionnaire — computed scalar, detected off the raw body.
  if (input.body.includes("{{questionnaireNote}}") && !input.questionnaireComplete) {
    rows.push({
      id: "questionnaireNote",
      title: "Recruiting questionnaire",
      prompt: "Did you complete this school's recruiting questionnaire?",
      editor: { kind: "boolean" },
      editableByParent: true,
    });
  }

  // 2. Intended major.
  if (referenced.has("intendedMajor") && !isResolved(input.values, "intendedMajor")) {
    rows.push({
      id: "intendedMajor",
      title: "Intended major",
      prompt: "What do you plan to study?",
      editor: { kind: "text", multiline: false },
      editableByParent: true,
    });
  }

  const authoredUnresolved = input.referencedKeys.filter(
    (k) => input.authoredKeys.has(k) && !isResolved(input.values, k),
  );
  const has = (k: string) => authoredUnresolved.includes(k);

  // 3. Why this program.
  if (has("programNote")) {
    rows.push({
      id: "programNote",
      title: "Why this program?",
      prompt: "What draws you to this program specifically?",
      editor: { kind: "text", multiline: true },
      editableByParent: false,
    });
  }
  // 4. Why it fits.
  if (has("fitReason")) {
    rows.push({
      id: "fitReason",
      title: "Why does it fit you?",
      prompt: "How do you fit their style, level, or needs?",
      editor: { kind: "text", multiline: true },
      editableByParent: false,
    });
  }
  // 5. Other authored vars.
  for (const key of authoredUnresolved) {
    if (["programNote", "fitReason", "intendedMajor"].includes(key)) continue;
    rows.push({
      id: key,
      title: input.labels[key] ?? key,
      prompt: "",
      editor: { kind: "text", multiline: false },
      editableByParent: true,
    });
  }

  // 6. Unresolved NON-authored profile vars → navigate to the profile editor.
  for (const key of input.referencedKeys) {
    if (input.authoredKeys.has(key)) continue;
    if (key === "intendedMajor" || METRIC_KEYS.has(key)) continue;
    if (isResolved(input.values, key)) continue;
    rows.push({
      id: key,
      title: input.labels[key] ?? key,
      prompt: "Add this in your profile",
      editor: { kind: "profileLink" },
      editableByParent: true,
    });
  }

  // 7. Metric nudge.
  if (input.referencedKeys.some((k) => METRIC_KEYS.has(k)) && !input.hasMetric) {
    rows.push({
      id: "metrics",
      title: "Add a performance metric",
      prompt: "Coaches want to see your numbers.",
      editor: { kind: "metricLink" },
      editableByParent: true,
    });
  }

  void askAthlete; // note copy is applied in the component, not here
  return rows;
}
```

- [ ] **Step 4: Run the test — verify it passes**

Run: `npx vitest run tests/unit/utils/communication/missingInfo.spec.ts`
Expected: PASS (8 tests). Fix ordering/conditions until green.

- [ ] **Step 5: type-check + lint + commit**

```bash
npm run type-check && npm run lint
git add utils/communication/missingInfo.ts tests/unit/utils/communication/missingInfo.spec.ts
git commit -m "feat(comm): pure deriveMissingInfoFields for the unified compose step"
```

---

### Task 2: `intendedMajor` template variable — migration + seed

**Files:**
- Create: `supabase/migrations/<timestamp>_intended_major_template_var.sql`
- Modify: a seeded template body to reference `{{intendedMajor}}` (identify via
  `SELECT slug, body FROM communication_templates WHERE body ILIKE '%program%'` — pick the
  primary intro template; confirm slug during execution).
- Test: `tests/unit/utils/communication/missingInfo.spec.ts` already covers detection; add a
  registry-presence assertion in `tests/unit/utils/validation/playerDetailsSchema.registry.spec.ts`
  ONLY if intended_major is registry-service-backed (it is NOT — skip).

**Interfaces:**
- Produces: a `template_variables` row `key='intendedMajor'`, `source_type='column'` (or
  `'pref'` per the registry's convention), `source_path` mapping to `player.intended_major`,
  `category='academics'`, `is_required_default=false`.

- [ ] **Step 1: Inspect the registry convention**

Run:
```bash
npx supabase ... # OR via MCP execute_sql:
# SELECT key, source_type, source_path, category FROM template_variables LIMIT 20;
```
Confirm how an existing pref-backed var (e.g. a player.* field) encodes `source_type`/`source_path`. Match it exactly for `intendedMajor` (maps to `user_preferences` player jsonb `intended_major`).

- [ ] **Step 2: Write the migration**

```sql
-- supabase/migrations/<timestamp>_intended_major_template_var.sql
insert into template_variables (key, source_type, source_path, category, is_required_default)
values ('intendedMajor', 'pref', 'pref:player.intended_major', 'academics', false)
on conflict (key) do nothing;
```
(Adjust `source_type`/`source_path` to the convention confirmed in Step 1.)

- [ ] **Step 3: Apply the migration (live)**

Per repo practice (MEMORY: `npx supabase db push` drifts — use Supabase MCP `apply_migration`).
Ask the user to confirm: "Ready to apply the intendedMajor migration?"

- [ ] **Step 4: Reference the var in one seeded template**

Add an optional `[[intendedMajor|, and I'm planning to study {{intendedMajor}}]]` clause to the chosen intro template's body (gated so it's omitted when empty). Update the seed file + the live row.

- [ ] **Step 5: Verify + commit**

Run: `npm run type-check` (no code change, sanity) and confirm via `SELECT` that the row exists.
```bash
git add supabase/migrations/ <seed file>
git commit -m "feat(comm): add intendedMajor template var + optional major clause"
```

---

### Task 3: Wire `missingInfoFields` + `hasMissingInfo` into the channel controller

**Files:**
- Modify: `composables/useQuickCommunication.ts` (add to `ChannelController` + `buildChannel`)
- Test: `tests/unit/composables/useQuickCommunication.missingInfo.spec.ts` (new)

**Interfaces:**
- Consumes: `deriveMissingInfoFields`, `MissingInfoField` from Task 1.
- Produces (added to `ChannelController`):
  ```ts
  missingInfoFields: ComputedRef<MissingInfoField[]>;
  hasMissingInfo: ComputedRef<boolean>;
  commitMissingInfo: () => Promise<void>;
  questionnaireDraft: Ref<boolean>;   // the info step's yes/skip toggle
  intendedMajorDraft: Ref<string>;    // the info step's major input
  ```

- [ ] **Step 1: Write the failing test** — mount-free, exercise a controller with a stubbed
  registry + template. (Follow the existing `useQuickCommunication`/`MessageComposer` test setup
  for mocking `useTemplateResolver`, `useContactWindow`, `useCommunicationTemplates`, Pinia.)

```ts
// asserts: selecting a template that references {{programNote}} (authored, unresolved)
// yields hasMissingInfo === true and a programNote row; a fully-resolved template yields
// hasMissingInfo === false; commitMissingInfo() calls updateSchool when questionnaireDraft
// is true and writeField for intendedMajor, then reresolve.
```
(Write the concrete asserts against the existing mock harness — see
`tests/unit/components/Communication/MessageComposer.spec.ts` for the controller shape and
`tests/unit/composables/useTemplateResolver.spec.ts` for the Supabase mock pattern.)

- [ ] **Step 2: Run — verify it fails** (`hasMissingInfo` undefined).

- [ ] **Step 3: Implement in `buildChannel`**

- Build `referencedKeys` from `templateVarKeys(selectedTemplateObj.value)` (already exists as a helper).
- `authoredKeys` from `varSourceTypes` (=== "authored"); `labels` from a registry label map
  (add a `varLabels` ref populated in `onMounted` alongside the other registry maps).
- `questionnaireComplete` from the existing `questionnaireCompleted` computed; `hasMetric` from
  `athleteCtx.metrics.length > 0`; `canEditProfile` from the existing computed; `athleteName`
  from `athleteCtx.tables.users.full_name` (fallback "your athlete").
- `missingInfoFields = computed(() => deriveMissingInfoFields({...}))`.
- `hasMissingInfo = computed(() => missingInfoFields.value.length > 0)`.
- `questionnaireDraft = ref(false)`, `intendedMajorDraft = ref("")`; reset both in the
  `selectedTemplateId` watcher.
- `commitMissingInfo`:
  ```ts
  const commitMissingInfo = async (): Promise<void> => {
    if (missingInfoFields.value.some((f) => f.id === "questionnaireNote") && questionnaireDraft.value) {
      await answerQuestionnaire(true); // existing: persists + reresolves
    }
    const major = intendedMajorDraft.value.trim();
    if (major && activeAthleteId.value) {
      try { await writeField(activeAthleteId.value, "pref:player.intended_major", major); }
      catch { /* best-effort */ }
      invalidateAthleteContext();
    }
    await reresolveSelected();
  };
  ```
  (Confirm the exact `writeField` source-path form against Task 2's registry convention.)

- [ ] **Step 4: Run — verify pass.**

- [ ] **Step 5: type-check + lint + commit**
```bash
git commit -m "feat(comm): expose missingInfoFields + commitMissingInfo per channel"
```

---

### Task 4: `MissingInfoStep.vue` component

**Files:**
- Create: `components/Communication/MissingInfoStep.vue`
- Test: `tests/unit/components/Communication/MissingInfoStep.spec.ts`

**Interfaces:**
- Consumes: a `ChannelController` (Task 3 fields) via a `:channel` prop, plus `canEditProfile`
  + `athleteName` props for the parent-lock note.
- Produces: emits `continue` (after the parent calls `commitMissingInfo`) and `back`.

- [ ] **Step 1: Write the failing test** — mount with a hand-built controller stub exposing
  `missingInfoFields` covering each editor kind; assert:
  - a `boolean` row renders Yes/Skip bound to `questionnaireDraft`;
  - a `text` row renders an input/textarea (multiline → textarea) bound to `authored`/`intendedMajorDraft`;
  - a `metricLink` row renders a `NuxtLink` to `/performance`;
  - a `profileLink` row renders a `NuxtLink` to `/settings/player-details`;
  - a row with `editableByParent === false` and `canEditProfile === false` is disabled and shows
    "Ask <name> to add this";
  - clicking Continue emits `continue`; Back emits `back`.
  (Stub `UIcon`, `NuxtLink` per the existing MessageComposer spec `stubs`.)

- [ ] **Step 2: Run — verify fail.**

- [ ] **Step 3: Implement the component** — `<script setup>` with `defineProps<{ channel: ChannelController; canEditProfile: boolean; athleteName: string }>()` and `defineEmits<{ continue: []; back: [] }>()`. Render `channel.missingInfoFields.value` with a `<component>`-style switch on `field.editor.kind`. Bind:
  - boolean → two buttons setting `channel.questionnaireDraft.value`;
  - text (id==="intendedMajor") → `v-model="channel.intendedMajorDraft.value"`, else `v-model="channel.authored.value[field.id]"`;
  - metricLink → `<NuxtLink to="/performance">`; profileLink → `<NuxtLink to="/settings/player-details">`;
  - locked rows → `:disabled` + the note. Continue button calls nothing itself — it emits `continue` (parent orchestrates commit).

- [ ] **Step 4: Run — verify pass.**

- [ ] **Step 5: type-check + lint + commit**
```bash
git commit -m "feat(comm): MissingInfoStep component renders the unified step rows"
```

---

### Task 5: Stage the composer + subsume the scattered surfaces

**Files:**
- Modify: `components/Communication/MessageComposer.vue` (add stages; mount `MissingInfoStep`;
  remove the inline `CommunicationTemplateVariablesPanel` + add-metric CTA)
- Modify: `components/CommunicationPanel.vue` (remove the standalone questionnaire prompt block —
  now handled in the step)
- Delete: `components/Communication/TemplateVariablesPanel.vue` (subsumed) and its spec
- Test: `tests/unit/components/Communication/MessageComposer.spec.ts` (extend for staging)

**Interfaces:**
- Consumes: `MissingInfoStep` (Task 4), controller `hasMissingInfo`/`commitMissingInfo` (Task 3).

- [ ] **Step 1: Extend the MessageComposer test** for staging:
  - a controller with `hasMissingInfo === false`: clicking Continue on compose goes straight to
    the preview stage (Send visible);
  - `hasMissingInfo === true`: Continue shows the info stage; the step's `continue` (after commit)
    advances to preview; Back returns;
  - changing the template resets to the compose stage.
  Keep the existing 6 MessageComposer assertions (subject/counter/preview/send/close) passing
  against the preview stage.

- [ ] **Step 2: Run — verify the new staging asserts fail.**

- [ ] **Step 3: Implement staging** — add `const stage = ref<"compose"|"info"|"preview">("compose")`.
  - compose stage: template select + subject (email) + body edit + **Continue** button →
    `stage.value = channel.hasMissingInfo.value ? "info" : "preview"`.
  - info stage: `<CommunicationMissingInfoStep :channel :can-edit-profile :athlete-name @back="stage='compose'" @continue="onInfoContinue" />` where `onInfoContinue` `await channel.commitMissingInfo(); stage.value = "preview"`.
  - preview stage: existing preview + Send + a Back to the prior stage; on close/open reset,
    set `stage.value = "compose"`.
  - Remove the inline `CommunicationTemplateVariablesPanel` + the add-metric `NuxtLink` (now in the step).
  - `canEditProfile`/`athleteName`: thread from the controller (add them to the controller in Task 3
    if not already exposed, or pass from the panel).

- [ ] **Step 4: Implement the CommunicationPanel change** — delete the `showQuestionnairePrompt`
  amber block from the template (the step owns it). Keep `qc.answerQuestionnaire` wired (still used by
  `commitMissingInfo`). Remove now-unused `showQuestionnairePrompt` from the panel's usage if nothing
  else references it (leave the composable API intact).

- [ ] **Step 5: Delete TemplateVariablesPanel + spec; run the full suite.**

Run: `npm run type-check && npm run lint && npm run test`
Expected: PASS. Fix references to the deleted component.

- [ ] **Step 6: Commit**
```bash
git add -A
git commit -m "feat(comm): stage composer into compose/info/preview; subsume scattered surfaces"
```

---

### Task 6: E2E + manual verification

**Files:**
- Modify/Create: `tests/e2e/tier1-critical/coaches-detail.spec.ts` (or a new comm spec)

- [ ] **Step 1: Add an E2E** on `/coaches/:id`: open Quick Communication → pick a template that
  references an authored var (e.g. why-program) → assert the "Complete your info" step appears →
  fill it → Continue → assert the Preview stage + Send are shown. Then pick a fully-resolved template
  → assert the step is skipped (Preview shown directly).
  (Run with `NUXT_PUBLIC_ADMIN_HOST` not required here; use the standard authed storageState.)

- [ ] **Step 2: Run the targeted E2E** (warm dev server on :3003, chromium):
```bash
npx playwright test tests/e2e/tier1-critical/coaches-detail.spec.ts --project=chromium
```
Expected: PASS (allow one retry for known dropdown flake).

- [ ] **Step 3: Manual browser smoke** — compose a template needing info; confirm the step gates,
  parent-lock note shows when viewing as a parent, metric/profile links navigate, and a resolved
  template skips the step. Note any console errors.

- [ ] **Step 4: Commit**
```bash
git commit -m "test(e2e): unified missing-info step gates compose flow"
```

---

## Self-Review

**Spec coverage:**
- Data model (`MissingInfoField`/`MissingEditor`) → Task 1. ✓
- `missingInfoFields`/`hasMissingInfo`/`commitMissingInfo` → Task 3. ✓
- Staged composer + `MissingInfoStep` → Tasks 4–5. ✓
- Parent-lock → Tasks 1 (flag) + 4 (render). ✓
- Metric link = navigating (option a) → Task 1 (`metricLink`) + Task 4 (NuxtLink). ✓
- `intendedMajor` registry dependency → Task 2. ✓
- Remove scattered surfaces → Task 5. ✓
- Testing (unit/component/e2e) → each task + Task 6. ✓
- **Added beyond spec (flagged for review):** `profileLink` editor for unresolved non-authored
  profile vars — the consequence of the "step replaces TemplateVariablesPanel" parity decision.
  Confirm this is acceptable (vs. keeping inline profile editing).

**Placeholder scan:** Task 2 leaves the exact `source_type`/`source_path` + target template slug
to confirm at execution (registry-convention dependent) — these are explicit inspect-first steps,
not silent TBDs.

**Type consistency:** `MissingInfoField`/`MissingEditor` names match across Tasks 1/3/4;
`missingInfoFields`/`hasMissingInfo`/`commitMissingInfo`/`questionnaireDraft`/`intendedMajorDraft`
match across Tasks 3/4/5.

## Open items for the executor
- Task 2: confirm the registry `source_type`/`source_path` convention + which template gets the
  `{{intendedMajor}}` clause before applying the migration.
- Task 5: confirm nothing else imports `TemplateVariablesPanel` before deleting it
  (`grep -r TemplateVariablesPanel`).
