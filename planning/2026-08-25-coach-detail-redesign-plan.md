# Coach Detail Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Coach Detail page to the approved two-column Figma layout, adding persisted `tags` + `source` fields and derived-insight UI.

**Architecture:** Data foundation first (migration + type + validator + store passthrough), then a pure `useCoachInsights` composable, then presentational components (left rail + right column), then page composition, then edit-flow wiring, then Figma-token visual polish, then full gate + browser smoke. Existing shared `CommunicationPanel` is kept and wrapped; detail-local sub-components are replaced.

**Tech Stack:** Nuxt 3 / Vue 3 `<script setup>` / TypeScript strict / Pinia / Supabase / TailwindCSS / Vitest.

**Spec:** `planning/2026-08-25-coach-detail-redesign-design.md`

## Global Constraints

- No raw hex / `rgba()` in `<style>` or inline `style=` — use `theme.css` CSS vars or brand Tailwind utilities (`bg-brand-*`, `text-brand-*`). Enforced by `npm run audit:tokens`.
- TypeScript strict, no `any` outside tests. `<script setup>`, `withDefaults(defineProps<{}>(), {})`, `defineEmits<{}>()`.
- Immutability: new objects via spread, never mutate props; Pinia mutations only in store actions.
- Single Supabase DB `xpxzhqghxecsjhvklsqg` serves prod + QA — every write is a prod write. Apply migration via Supabase MCP `apply_migration`; `npx supabase db push` fails locally (schema_migrations drift).
- Files ≤ 800 lines; components focused. Composables `useXxx`, Components `PascalCase`.
- Gate before PR: `npm run type-check`, `npm run lint`, `npm run audit:tokens`, `npm run test` all pass.

---

### Task 1: Migration + `Coach` type + Zod schema

**Files:**
- Create: `supabase/migrations/20260825000000_coach_tags_source.sql`
- Modify: `types/models.ts:121-138` (Coach interface)
- Modify: `utils/validation/schemas.ts:146-156` (coachSchema)
- Test: `tests/unit/validation/coachSchema.spec.ts`

**Interfaces:**
- Produces: `Coach.tags: string[]`, `Coach.source: string | null`; `coachSchema` accepts `tags?: string[]`, `source?: string | null`.

- [ ] **Step 1: Write the migration file**

```sql
-- 20260825000000_coach_tags_source.sql
ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS tags   text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source text   NULL;

COMMENT ON COLUMN coaches.tags   IS 'Free-form recruiting tags (e.g. sport, division, region, source).';
COMMENT ON COLUMN coaches.source IS 'Where this coach contact originated (e.g. LinkedIn, camp, referral).';
```

- [ ] **Step 2: Extend the `Coach` interface**

In `types/models.ts`, add to `interface Coach` (after `notes`):

```ts
  tags: string[];
  source: string | null;
```

- [ ] **Step 3: Write the failing schema test**

```ts
// tests/unit/validation/coachSchema.spec.ts
import { describe, it, expect } from "vitest";
import { coachSchema } from "~/utils/validation/schemas";

const base = { first_name: "Dana", last_name: "Whitfield", role: "head" as const };

describe("coachSchema tags/source", () => {
  it("accepts tags array and source string", () => {
    const r = coachSchema.parse({ ...base, tags: ["Football", "Division I"], source: "LinkedIn" });
    expect(r.tags).toEqual(["Football", "Division I"]);
    expect(r.source).toBe("LinkedIn");
  });

  it("defaults tags to empty array when omitted", () => {
    const r = coachSchema.parse(base);
    expect(r.tags).toEqual([]);
  });

  it("rejects a tag longer than 40 chars", () => {
    expect(() => coachSchema.parse({ ...base, tags: ["x".repeat(41)] })).toThrow();
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm run test -- coachSchema`
Expected: FAIL — `tags`/`source` stripped or unknown.

- [ ] **Step 5: Extend `coachSchema`**

In `utils/validation/schemas.ts`, add inside `coachSchema` object (after `notes`):

```ts
  tags: z.array(sanitizedTextSchema(40)).max(20).default([]),
  source: sanitizedTextSchema(80).nullable().optional(),
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test -- coachSchema`
Expected: PASS (3/3).

- [ ] **Step 7: Apply migration live + type-check**

Apply `20260825000000_coach_tags_source.sql` via Supabase MCP `apply_migration` to project `xpxzhqghxecsjhvklsqg`. Then verify columns exist:

```sql
select column_name, data_type, column_default from information_schema.columns
where table_name = 'coaches' and column_name in ('tags','source');
```

Run: `npm run type-check` — Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260825000000_coach_tags_source.sql types/models.ts utils/validation/schemas.ts tests/unit/validation/coachSchema.spec.ts
git commit -m "feat(coach): add tags + source fields (db, type, schema)"
```

---

### Task 2: `useCoachInsights` composable (pure, derived UI)

**Files:**
- Create: `composables/useCoachInsights.ts`
- Test: `tests/unit/composables/useCoachInsights.spec.ts`

**Interfaces:**
- Consumes: `Interaction[]` from `types/models`, `Coach.last_contact_date`.
- Produces:
  ```ts
  useCoachInsights(coach: Ref<Coach | null>, interactions: Ref<Interaction[]>): {
    daysSinceContact: ComputedRef<number | null>;
    isOverdue: ComputedRef<boolean>;         // daysSinceContact != null && > OVERDUE_DAYS (14)
    preferredChannel: ComputedRef<Interaction["type"] | null>; // mode of types; null if none
    totalInteractions: ComputedRef<number>;
    sentReceived: ComputedRef<{ sent: number; received: number }>;
    responseRate: ComputedRef<number>;       // 0-100, received/total*100 rounded
    overdueAlert: ComputedRef<boolean>;      // === isOverdue
    channelPreferenceAlert: ComputedRef<boolean>; // preferredChannel != null && totalInteractions >= 1
  }
  export const OVERDUE_DAYS = 14;
  ```

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/composables/useCoachInsights.spec.ts
import { describe, it, expect } from "vitest";
import { ref } from "vue";
import { useCoachInsights, OVERDUE_DAYS } from "~/composables/useCoachInsights";
import type { Coach, Interaction } from "~/types/models";

const coach = (over: Partial<Coach> = {}): Coach => ({
  id: "c1", role: "head", first_name: "D", last_name: "W", email: null, phone: null,
  twitter_handle: null, instagram_handle: null, notes: null, tags: [], source: null,
  last_contact_date: null, ...over,
});
const ix = (over: Partial<Interaction> = {}): Interaction => ({
  id: Math.random().toString(), type: "phone_call", direction: "inbound", ...over,
});
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString();

describe("useCoachInsights", () => {
  it("returns null daysSinceContact and no overdue when no last_contact", () => {
    const i = useCoachInsights(ref(coach()), ref([]));
    expect(i.daysSinceContact.value).toBeNull();
    expect(i.isOverdue.value).toBe(false);
  });

  it("flags overdue past the threshold", () => {
    const i = useCoachInsights(ref(coach({ last_contact_date: daysAgo(OVERDUE_DAYS + 1) })), ref([]));
    expect(i.isOverdue.value).toBe(true);
    expect(i.daysSinceContact.value).toBe(OVERDUE_DAYS + 1);
  });

  it("is not overdue exactly at the threshold", () => {
    const i = useCoachInsights(ref(coach({ last_contact_date: daysAgo(OVERDUE_DAYS) })), ref([]));
    expect(i.isOverdue.value).toBe(false);
  });

  it("computes preferred channel as the mode of interaction types", () => {
    const i = useCoachInsights(ref(coach()), ref([ix({ type: "phone_call" }), ix({ type: "phone_call" }), ix({ type: "email" })]));
    expect(i.preferredChannel.value).toBe("phone_call");
  });

  it("computes sent/received and response rate", () => {
    const i = useCoachInsights(ref(coach()), ref([ix({ direction: "outbound" }), ix({ direction: "inbound" })]));
    expect(i.sentReceived.value).toEqual({ sent: 1, received: 1 });
    expect(i.responseRate.value).toBe(50);
    expect(i.totalInteractions.value).toBe(2);
  });

  it("has no channel preference alert with zero interactions", () => {
    const i = useCoachInsights(ref(coach()), ref([]));
    expect(i.channelPreferenceAlert.value).toBe(false);
    expect(i.preferredChannel.value).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- useCoachInsights`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the composable**

```ts
// composables/useCoachInsights.ts
import { computed, type Ref } from "vue";
import type { Coach, Interaction } from "~/types/models";

export const OVERDUE_DAYS = 14;

export function useCoachInsights(coach: Ref<Coach | null>, interactions: Ref<Interaction[]>) {
  const daysSinceContact = computed<number | null>(() => {
    const d = coach.value?.last_contact_date;
    if (!d) return null;
    return Math.floor((Date.now() - new Date(d).getTime()) / 864e5);
  });

  const isOverdue = computed(() => daysSinceContact.value != null && daysSinceContact.value > OVERDUE_DAYS);

  const totalInteractions = computed(() => interactions.value.length);

  const sentReceived = computed(() => interactions.value.reduce(
    (acc, i) => i.direction === "outbound" ? { ...acc, sent: acc.sent + 1 } : { ...acc, received: acc.received + 1 },
    { sent: 0, received: 0 },
  ));

  const responseRate = computed(() => {
    const t = totalInteractions.value;
    return t === 0 ? 0 : Math.round((sentReceived.value.received / t) * 100);
  });

  const preferredChannel = computed<Interaction["type"] | null>(() => {
    if (interactions.value.length === 0) return null;
    const counts = new Map<Interaction["type"], number>();
    for (const i of interactions.value) counts.set(i.type, (counts.get(i.type) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  });

  const overdueAlert = computed(() => isOverdue.value);
  const channelPreferenceAlert = computed(() => preferredChannel.value != null && totalInteractions.value >= 1);

  return { daysSinceContact, isOverdue, preferredChannel, totalInteractions, sentReceived, responseRate, overdueAlert, channelPreferenceAlert };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- useCoachInsights`
Expected: PASS (6/6).

- [ ] **Step 5: Commit**

```bash
git add composables/useCoachInsights.ts tests/unit/composables/useCoachInsights.spec.ts
git commit -m "feat(coach): add useCoachInsights derived-metrics composable"
```

---

### Task 3: Left-rail presentational components

**Files:**
- Create: `components/Coach/detail/CoachIdentityCard.vue`
- Create: `components/Coach/detail/CoachChannelActions.vue`
- Create: `components/Coach/detail/CoachTagsCard.vue`
- Create: `components/Coach/detail/CoachProfileMeta.vue`
- Create: `components/Coach/detail/CoachInternalNotes.vue`
- Test: `tests/unit/components/coach/CoachTagsCard.spec.ts`

**Interfaces:**
- `CoachIdentityCard` props: `{ coach: Coach }`.
- `CoachChannelActions` props: `{ coach: Coach }`; emits `{ logInteraction: [] }`.
- `CoachTagsCard` props: `{ tags: string[] }`; emits `{ add: [tag: string]; remove: [tag: string] }`.
- `CoachProfileMeta` props: `{ coach: Coach }` (reads `created_at`, `source`, `updated_at`).
- `CoachInternalNotes` props: `{ notes: string | null }`; emits `{ edit: [] }`.

- [ ] **Step 1: Write the failing `CoachTagsCard` test**

```ts
// tests/unit/components/coach/CoachTagsCard.spec.ts
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import CoachTagsCard from "~/components/Coach/detail/CoachTagsCard.vue";

describe("CoachTagsCard", () => {
  it("renders each tag as a chip", () => {
    const w = mount(CoachTagsCard, { props: { tags: ["Football", "Division I"] } });
    expect(w.text()).toContain("Football");
    expect(w.text()).toContain("Division I");
  });

  it("emits remove with the tag when its remove control is clicked", async () => {
    const w = mount(CoachTagsCard, { props: { tags: ["Football"] } });
    await w.get('[data-testid="remove-tag-Football"]').trigger("click");
    expect(w.emitted("remove")?.[0]).toEqual(["Football"]);
  });

  it("emits add with the typed tag on submit", async () => {
    const w = mount(CoachTagsCard, { props: { tags: [] } });
    await w.get('[data-testid="add-tag-input"]').setValue("Referral");
    await w.get('[data-testid="add-tag-input"]').trigger("keydown.enter");
    expect(w.emitted("add")?.[0]).toEqual(["Referral"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- CoachTagsCard`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement `CoachTagsCard.vue`**

```vue
<script setup lang="ts">
import { ref } from "vue";
defineProps<{ tags: string[] }>();
const emit = defineEmits<{ add: [tag: string]; remove: [tag: string] }>();
const draft = ref("");
function submit() {
  const t = draft.value.trim();
  if (t) emit("add", t);
  draft.value = "";
}
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-5">
    <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Tags</h3>
    <div class="flex flex-wrap gap-2">
      <span v-for="tag in tags" :key="tag" class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
        {{ tag }}
        <button :data-testid="`remove-tag-${tag}`" type="button" class="text-slate-400 hover:text-slate-700" :aria-label="`Remove tag ${tag}`" @click="emit('remove', tag)">×</button>
      </span>
    </div>
    <input data-testid="add-tag-input" v-model="draft" type="text" placeholder="+ Add Tag"
      class="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" @keydown.enter.prevent="submit" />
  </section>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- CoachTagsCard`
Expected: PASS (3/3).

- [ ] **Step 5: Implement the remaining four presentational components**

Build `CoachIdentityCard.vue` (avatar initials from `first_name[0]+last_name[0]`, name, email link, Twitter/Instagram links), `CoachChannelActions.vue` (five channel buttons using existing `mailto:`/`tel:` + social URLs, plus a `Log Interaction` button emitting `logInteraction`), `CoachProfileMeta.vue` (Coach Since = `created_at`, Source = `source`, Last Updated = `updated_at`, formatted with the existing date util), `CoachInternalNotes.vue` (renders `notes` or empty state + Edit button emitting `edit`). All use only brand Tailwind utilities / theme vars — no raw hex.

- [ ] **Step 6: Run audit + type-check + tests**

Run: `npm run audit:tokens && npm run type-check && npm run test -- coach/`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add components/Coach/detail/ tests/unit/components/coach/CoachTagsCard.spec.ts
git commit -m "feat(coach): add left-rail detail components (identity, channels, tags, meta, notes)"
```

---

### Task 4: Right-column components (alerts, stat cards, interactions table)

**Files:**
- Create: `components/Coach/detail/CoachAlerts.vue`
- Create: `components/Coach/detail/CoachStatCards.vue`
- Create: `components/Coach/detail/CoachInteractionsTable.vue`
- Test: `tests/unit/components/coach/CoachAlerts.spec.ts`

**Interfaces:**
- `CoachAlerts` props: `{ overdue: boolean; daysSinceContact: number | null; channelPreference: boolean; preferredChannel: string | null }`.
- `CoachStatCards` props: `{ daysSinceContact: number | null; isOverdue: boolean; totalInteractions: number; preferredChannel: string | null; responseRate: number }`.
- `CoachInteractionsTable` props: `{ interactions: Interaction[] }` (reuses existing filter logic from `CoachInteractionsLog` — port the filter refs, restyle markup to CHANNEL / NOTES·SUBJECT / DATE columns with expandable rows).

- [ ] **Step 1: Write the failing `CoachAlerts` test**

```ts
// tests/unit/components/coach/CoachAlerts.spec.ts
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import CoachAlerts from "~/components/Coach/detail/CoachAlerts.vue";

describe("CoachAlerts", () => {
  it("shows the overdue banner when overdue", () => {
    const w = mount(CoachAlerts, { props: { overdue: true, daysSinceContact: 64, channelPreference: false, preferredChannel: null } });
    expect(w.text()).toContain("Outreach Overdue");
    expect(w.text()).toContain("64");
  });

  it("hides the overdue banner when not overdue", () => {
    const w = mount(CoachAlerts, { props: { overdue: false, daysSinceContact: 3, channelPreference: false, preferredChannel: null } });
    expect(w.text()).not.toContain("Outreach Overdue");
  });

  it("shows the channel-preference banner when set", () => {
    const w = mount(CoachAlerts, { props: { overdue: false, daysSinceContact: 3, channelPreference: true, preferredChannel: "phone_call" } });
    expect(w.text()).toContain("Channel Preference");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- CoachAlerts`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement `CoachAlerts.vue`**

```vue
<script setup lang="ts">
defineProps<{ overdue: boolean; daysSinceContact: number | null; channelPreference: boolean; preferredChannel: string | null }>();
</script>

<template>
  <div class="space-y-3">
    <div v-if="overdue" role="alert" class="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
      <UIcon name="i-heroicons-exclamation-triangle" class="mt-0.5 h-5 w-5 text-red-500" />
      <div>
        <p class="font-semibold text-red-700">Urgent: Outreach Overdue</p>
        <p class="text-sm text-red-600">No contact in {{ daysSinceContact }} days – consider reaching out immediately to maintain connection.</p>
      </div>
    </div>
    <div v-if="channelPreference" class="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
      <UIcon name="i-heroicons-information-circle" class="mt-0.5 h-5 w-5 text-blue-500" />
      <div>
        <p class="font-semibold text-blue-700">Channel Preference detected</p>
        <p class="text-sm text-blue-600">Prefers responding via {{ preferredChannel?.replace("_", " ") }}.</p>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- CoachAlerts`
Expected: PASS (3/3).

- [ ] **Step 5: Implement `CoachStatCards.vue` + `CoachInteractionsTable.vue`**

`CoachStatCards` — three cards (Days Since Contact with overdue-red accent, Total Interactions, Preferred Channel + response rate), ring accents via inline SVG `<circle>` (ring is decorative; `audit-ignore` any raw-hex stroke only if a token cannot express it). `CoachInteractionsTable` — port the four filter refs (type, direction, date range, sentiment) and the Shown/Sent/Received tallies from `components/Coach/CoachInteractionsLog.vue`, restyle rows into the CHANNEL / NOTES·SUBJECT / DATE table with an expand chevron.

- [ ] **Step 6: Run audit + type-check + tests**

Run: `npm run audit:tokens && npm run type-check && npm run test -- coach/`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add components/Coach/detail/CoachAlerts.vue components/Coach/detail/CoachStatCards.vue components/Coach/detail/CoachInteractionsTable.vue tests/unit/components/coach/CoachAlerts.spec.ts
git commit -m "feat(coach): add right-column detail components (alerts, stat cards, interactions table)"
```

---

### Task 5: Store passthrough + inline tag persistence

**Files:**
- Modify: `stores/coaches.ts` (add `updateCoachTags` convenience action)
- Test: `tests/unit/stores/coaches.tags.spec.ts`

**Interfaces:**
- Consumes: existing `updateCoach(id, Partial<Coach>)` (sanitizer spreads `...data`, so `tags`/`source` already persist — no sanitizer change).
- Produces: `updateCoachTags(id: string, tags: string[]): Promise<Coach>` — thin wrapper over `updateCoach` for the inline chip editor.

- [ ] **Step 1: Write the failing store test**

```ts
// tests/unit/stores/coaches.tags.spec.ts — follow the existing coaches store test setup
// (mock supabase per tests/unit/stores/*.spec.ts patterns; assert updateCoachTags calls update with { tags }).
```

Model the mock on the nearest existing `stores/coaches` spec. Assert `updateCoachTags("c1", ["A"])` issues an update whose payload includes `tags: ["A"]` and returns the updated coach.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- coaches.tags`
Expected: FAIL — `updateCoachTags` not defined.

- [ ] **Step 3: Implement `updateCoachTags`**

In `stores/coaches.ts`, after `updateCoach`, add and export from the store's return object:

```ts
  async function updateCoachTags(id: string, tags: string[]) {
    return updateCoach(id, { tags } as Partial<Coach>);
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- coaches.tags`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add stores/coaches.ts tests/unit/stores/coaches.tags.spec.ts
git commit -m "feat(coach): add updateCoachTags store action"
```

---

### Task 6: Extend `EditCoachModal` + create form with Tags + Source

**Files:**
- Modify: `components/EditCoachModal.vue`
- Modify: `pages/coaches/new.vue`
- Test: `tests/unit/components/EditCoachModal.tags.spec.ts`

**Interfaces:**
- Consumes: `CoachTagsCard` (reused as the tag editor), `coachSchema` (now with `tags`/`source`).
- Produces: edit + create payloads that include `tags` and `source`.

- [ ] **Step 1: Write the failing test**

Mount `EditCoachModal` with a coach carrying `tags: ["Football"]`, `source: "LinkedIn"`; assert the Source input shows `LinkedIn` and a Football chip renders; assert saving emits/save-calls a payload including `tags` and `source`. (Follow the existing `EditCoachModal` test file's mount + store-mock pattern.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- EditCoachModal.tags`
Expected: FAIL — no Source field / no tag editor.

- [ ] **Step 3: Add Tags editor + Source input**

Add a `source` text input and embed the `CoachTagsCard` (or its chip editor) bound to a local `tags` ref in both `EditCoachModal.vue` and `pages/coaches/new.vue`; include both in the save payload validated by `coachSchema`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- EditCoachModal.tags`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/EditCoachModal.vue pages/coaches/new.vue tests/unit/components/EditCoachModal.tags.spec.ts
git commit -m "feat(coach): edit + create forms support tags and source"
```

---

### Task 7: Rebuild `pages/coaches/[id]/index.vue` composition

**Files:**
- Modify (rewrite): `pages/coaches/[id]/index.vue`
- Delete (after confirming no external imports): `components/Coach/CoachHeader.vue`, `components/Coach/CoachStatsGrid.vue`, `components/Coach/CoachMetricsPanel.vue`, `components/Coach/CoachNotesEditor.vue`, `components/Coach/CoachInteractionsLog.vue` — only once grep confirms the rebuilt page is their sole importer.

**Interfaces:**
- Consumes: all Task 3/4 components, `useCoachInsights`, kept `CommunicationPanel` (prop `coach`), kept `EditCoachModal`, kept `DeleteConfirmationModal`, `updateCoachTags`.

- [ ] **Step 1: Rewrite the page with the two-column shell**

Grid `lg:grid-cols-[340px_1fr] gap-6`; left rail stacks `CoachIdentityCard`, `CoachChannelActions`, `CoachInternalNotes`, `CoachTagsCard`, `CoachProfileMeta`; right column stacks `CoachAlerts`, `CoachStatCards`, `CommunicationPanel`, `CoachInteractionsTable`. Wire insights from `useCoachInsights(coach, interactions)`. `CoachChannelActions @logInteraction` opens the existing interaction-create flow (coach prefilled); `CoachTagsCard @add/@remove` calls `updateCoachTags`; `CoachInternalNotes @edit` and header Edit open `EditCoachModal`. Preserve existing loading / not-found / back-link states and the `?back=`/`?label=` query handling from the current page.

- [ ] **Step 2: Grep for external importers before deleting old components**

```bash
for c in CoachHeader CoachStatsGrid CoachMetricsPanel CoachNotesEditor CoachInteractionsLog; do
  echo "$c:"; grep -rln "$c" pages components | grep -v "coaches/\[id\]/index.vue" | grep -v "/$c.vue";
done
```

Delete only the components whose grep prints nothing.

- [ ] **Step 3: Run type-check + audit + full unit suite**

Run: `npm run type-check && npm run audit:tokens && npm run test`
Expected: all PASS (fix any test referencing deleted components).

- [ ] **Step 4: Commit**

```bash
git add pages/coaches/[id]/index.vue components/Coach/
git commit -m "feat(coach): rebuild coach detail page to two-column layout"
```

---

### Task 8: Figma-token visual polish

**Files:**
- Modify: Task 3/4 components + page as needed for spacing/color/radius fidelity.

- [ ] **Step 1: Pull exact design context from Figma**

Load the `figma-design-to-code` skill, then call `get_design_context` / `get_variable_defs` on node `4:18` of file `A4LleRjo8wP6djA4UqADzB`. Map Figma variables to `theme.css` / brand Tailwind tokens.

- [ ] **Step 2: Reconcile spacing, colors, radii, ring styling**

Adjust utilities to match; keep everything token-based (no raw hex — `audit-ignore` only on decorative SVG ring strokes that no token expresses).

- [ ] **Step 3: Browser smoke on the demo coach**

Start dev server; log in as `player1@compassdemo.app`; open `/coaches/453bc2a2-ba87-4a69-bcab-732fe89d1b12`; screenshot; compare to Figma node `4:18`. Verify: two-column layout, both alert banners, stat cards, tags, profile meta, interactions table all render with no console errors.

- [ ] **Step 4: Run full gate**

Run: `npm run type-check && npm run lint && npm run audit:tokens && npm run test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "style(coach): match coach detail to Figma tokens + spacing"
```

---

### Task 9: iOS handoff spec (deferred artifact — no Swift code)

**Files:**
- Create: `planning/iOS_SPEC_coach-detail-redesign-2026-08-25.md`

- [ ] **Step 1: Generate the handoff spec**

Invoke the `web-to-ios-handoff` skill against the merged web changes. Capture: new `tags`/`source` fields, two-column layout adaptation for iOS, derived-insight parity (`useCoachInsights` → Swift equivalent), and the alert/stat-card/interactions-table structures. Do not write Swift here — spec only.

- [ ] **Step 2: Commit**

```bash
git add planning/iOS_SPEC_coach-detail-redesign-2026-08-25.md
git commit -m "docs(coach): iOS handoff spec for coach detail redesign"
```

---

## Self-Review

**Spec coverage:** DB/type/validator → Task 1; store wiring → Tasks 1,5; `useCoachInsights` → Task 2; left rail → Task 3; right column → Task 4; kept `CommunicationPanel` → Task 7; edit flow → Task 6; page composition → Task 7; tokens → Task 8; testing → embedded per task; iOS handoff → Task 9. All spec sections covered.

**Placeholder scan:** Tasks 5 & 6 delegate test-mock detail to "follow the existing pattern" rather than inlining full mock code — intentional, because the coaches-store mock harness is repo-specific; the assertion targets are stated explicitly. All production code steps carry concrete code.

**Type consistency:** `Coach.tags: string[]` / `Coach.source: string | null` consistent across Tasks 1/5/6/7. `useCoachInsights` return shape consistent between Task 2 definition and Task 4/7 consumers. `updateCoachTags(id, tags)` consistent Tasks 5/7.

## Execution notes

- Threshold `OVERDUE_DAYS = 14` (spec open question resolved to 14; adjust in one place if product disagrees).
- Ship via `release-flow` skill: feature branch → PR to `develop` (QA) → promote to `main`.
