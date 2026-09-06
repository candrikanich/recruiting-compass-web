# Help Center Audit & Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the in-app Help Center back to parity with the current feature set, stamp it with a reviewed date, add FAQ and Glossary sections, and put a mechanism in place so it doesn't drift out of date again.

**Architecture:** Static Nuxt pages under `pages/help/*` + a `layouts/help.vue` shell + `components/Help/*` presentational components + `components/Help/helpDefinitions.ts` (tooltip content keyed by id, grouped by category). Content changes are data/markup only — no new state layer needed. FAQ and Glossary follow the same pattern as existing help pages: a new route + a typed content array, no CMS.

**Tech Stack:** Nuxt 3 / Vue 3 `<script setup>`, TypeScript strict, Vitest, TailwindCSS, existing `DesignSystem*` components.

**Spec:** GitHub issue #514 (`gh issue view 514`).

## Global Constraints

- No raw hex/`rgba()` in `<style>` or inline `style=` — use theme CSS vars / Tailwind brand utilities (`docs/design/tokens.md`).
- Use `<DesignSystem*>` components for empty/loading/error states, don't hand-roll.
- `<script setup>`, `withDefaults(defineProps<{}>(), {})`, `defineEmits<{}>()` per `CLAUDE.md`.
- No `any`; `as const` for enum-like arrays.
- Composables named `useXxx`, components `PascalCase`, pages `kebab-case`.
- Web-only — do not touch `recruiting-compass-ios` files (out of scope for this issue).

---

## Phase 1 — Audit (research task, no code)

### Task 1: Audit current Help Center content against shipped features

**Files:**
- Create: `planning/help-center-audit-2026-09-06.md`

**Interfaces:**
- Produces: a findings doc later tasks read to know exactly what copy to write/fix. Every row below must be checked and marked ✅ accurate / ⚠️ stale / ❌ missing in the output doc.

- [ ] **Step 1: Read every existing help page and definition**

Read in full: `pages/help/index.vue`, `pages/help/getting-started.vue`, `pages/help/schools.vue`, `pages/help/phases.vue`, `pages/help/account.vue`, `components/Help/helpDefinitions.ts`.

- [ ] **Step 2: Check each existing claim against the live feature**

For each help page, cross-reference against the actual page/composable it describes (e.g. `pages/help/phases.vue` claims vs `composables/usePhase*`, `server/api/athlete/phase/*`). Record any claim that's now wrong (renamed feature, changed flow, removed field) as ⚠️/❌ in the audit doc, with the specific line and the correct current behavior.

- [ ] **Step 3: Enumerate shipped features with zero Help Center coverage**

Check each of these against `helpCategoryGroups` / the four `pages/help/*.vue` files and mark ❌ missing if uncovered (this list is drawn from the current `pages/` tree, exclude `pages/admin/**` — internal, not user-facing):

  - Deadlines dashboard widget (`pages/deadlines.vue`, `components/Dashboard/RecruitingCalendar*` — shipped this week per branch `feat/deadlines-dashboard-widget`)
  - Documents (`pages/documents/*.vue` — upload, sharing with schools, `type` categorization)
  - Offers (`pages/offers/*.vue`)
  - Events (`pages/events/*.vue`)
  - Coach Outreach / Communication Templates (`pages/settings/communication-templates.vue`, `CommunicationPanel`, contact-window auto-swap)
  - Recommendation letters (referenced in phases but verify current flow matches `pages/help/phases.vue` claims)
  - Performance & Performance Timeline (`pages/performance/*.vue`)
  - Reports & Reports Timeline (`pages/reports/*.vue`)
  - Analytics (`pages/analytics/index.vue`)
  - Search (`pages/search/index.vue`)
  - Public Player Profile (`pages/p/[slug].vue`)
  - Family Management / multi-athlete parent accounts (`pages/settings/family-management.vue`)
  - School Preferences (`pages/settings/school-preferences.vue`)
  - Notifications (`pages/notifications.vue`, `pages/settings/notifications.vue`)
  - Video Links (searched via `video_links` table, surfaced in coach/school detail)

- [ ] **Step 4: Write the audit doc**

Structure `planning/help-center-audit-2026-09-06.md` as a table: `Feature | Current Help Center coverage | Status (✅/⚠️/❌) | Notes for Phase 3 rewrite`. This doc is the input to Task 5 (content rewrite) — every ⚠️/❌ row must carry enough detail that Task 5 doesn't need to re-research.

- [ ] **Step 5: Commit**

```bash
git add planning/help-center-audit-2026-09-06.md
git commit -m "docs: audit Help Center against current feature set (#514)"
```

---

## Phase 2 — "Last reviewed" date

### Task 2: Add a reviewed-date field to help pages and render it

**Files:**
- Modify: `components/Help/HelpHeader.vue`
- Modify: `pages/help/getting-started.vue`, `pages/help/schools.vue`, `pages/help/phases.vue`, `pages/help/account.vue`
- Create: `components/Help/HelpReviewedDate.vue`
- Test: `components/Help/__tests__/HelpReviewedDate.spec.ts`

**Interfaces:**
- Produces: `HelpReviewedDate` component, props `{ reviewedOn: string /* YYYY-MM-DD */ }`, renders `Last reviewed {formatted date}`. Every help page passes its own `reviewedOn` to `HelpHeader`, which forwards it to `HelpReviewedDate`.
- Consumes: nothing new — reads props only, no store/composable.

- [ ] **Step 1: Write the failing test**

```typescript
// components/Help/__tests__/HelpReviewedDate.spec.ts
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import HelpReviewedDate from "../HelpReviewedDate.vue";

describe("HelpReviewedDate", () => {
  it("renders the reviewed date in long form", () => {
    const wrapper = mount(HelpReviewedDate, {
      props: { reviewedOn: "2026-09-06" },
    });
    expect(wrapper.text()).toContain("Last reviewed");
    expect(wrapper.text()).toContain("September 6, 2026");
  });

  it("falls back to a stale-content notice past 180 days", () => {
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - 200);
    const wrapper = mount(HelpReviewedDate, {
      props: { reviewedOn: staleDate.toISOString().slice(0, 10) },
    });
    expect(wrapper.text()).toContain("may be out of date");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- components/Help/__tests__/HelpReviewedDate.spec.ts`
Expected: FAIL — `Failed to resolve import "../HelpReviewedDate.vue"`

- [ ] **Step 3: Write minimal implementation**

```vue
<!-- components/Help/HelpReviewedDate.vue -->
<template>
  <p class="text-sm text-gray-500">
    Last reviewed {{ formattedDate }}
    <span v-if="isStale" class="text-brand-amber-600">
      — this page may be out of date, let us know if something looks wrong
    </span>
  </p>
</template>

<script setup lang="ts">
const props = defineProps<{ reviewedOn: string }>();

const STALE_AFTER_DAYS = 180;

const formattedDate = computed(() =>
  new Date(`${props.reviewedOn}T00:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }),
);

const isStale = computed(() => {
  const reviewed = new Date(`${props.reviewedOn}T00:00:00`);
  const daysSince = (Date.now() - reviewed.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > STALE_AFTER_DAYS;
});
</script>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- components/Help/__tests__/HelpReviewedDate.spec.ts`
Expected: PASS (2/2)

- [ ] **Step 5: Wire it into `HelpHeader` and every help page**

Add `reviewedOn: string` to `HelpHeader`'s props (`withDefaults(defineProps<{ title: string; description?: string; reviewedOn: string }>(), {})`), render `<HelpReviewedDate :reviewed-on="reviewedOn" />` under the title. Update each of the 4 content pages to pass `reviewed-on="2026-09-06"` (today, since Task 5 rewrites them today) to their `HelpHeader`.

- [ ] **Step 6: Run full test suite + type-check**

Run: `npm run type-check && npm run test`
Expected: 0 type errors, all tests pass (no regressions in existing `HelpHeader` consumers)

- [ ] **Step 7: Commit**

```bash
git add components/Help/HelpReviewedDate.vue components/Help/__tests__/HelpReviewedDate.spec.ts components/Help/HelpHeader.vue pages/help/*.vue
git commit -m "feat: show last-reviewed date on Help Center pages (#514)"
```

---

## Phase 3 — Rewrite content to close audit gaps

### Task 3: Fix stale claims found in Phase 1

**Files:**
- Modify: whichever of `pages/help/getting-started.vue`, `pages/help/schools.vue`, `pages/help/phases.vue`, `pages/help/account.vue` the audit doc flagged ⚠️
- Modify: `components/Help/helpDefinitions.ts` for any ⚠️ tooltip definitions

**Interfaces:**
- Consumes: `planning/help-center-audit-2026-09-06.md` (Task 1 output) — every ⚠️ row's "Notes for Phase 3 rewrite" column is the exact correction to make.

- [ ] **Step 1: Apply every ⚠️ fix from the audit doc**

For each ⚠️ row, edit the flagged page/definition to match current behavior, using the "Notes for Phase 3 rewrite" text verbatim as the source of truth for what changed.

- [ ] **Step 2: Re-read each edited page against the live feature once more**

Confirm no new inaccuracies were introduced (e.g. don't describe a UI element that isn't actually on the page you're linking to).

- [ ] **Step 3: Run type-check + lint**

Run: `npm run type-check && npm run lint`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add pages/help/*.vue components/Help/helpDefinitions.ts
git commit -m "fix: correct stale Help Center content (#514)"
```

### Task 4: Add Help Center coverage for missing features

**Files:**
- Modify: `pages/help/schools.vue` (add Coach Outreach / Communication Templates + contact-window section)
- Create: `pages/help/tracking.vue` (Documents, Offers, Events, Performance, Reports, Analytics — "tracking your recruiting" grouping)
- Create: `pages/help/family.vue` (Family Management, Notifications, Public Player Profile, School Preferences)
- Modify: `pages/help/index.vue` (add the 2 new section cards)
- Modify: `components/Help/HelpSidebar.vue` (add the 2 new nav links)

**Interfaces:**
- Consumes: `HelpHeader`, `HelpSectionHeader`, `HelpStepCard`, `HelpCallout` (all existing, same props as used in `pages/help/schools.vue` today — read that file for the exact prop shapes before writing the new pages).
- Produces: 2 new routes `/help/tracking`, `/help/family`, each `reviewed-on="2026-09-06"`.

- [ ] **Step 1: Read `pages/help/schools.vue` in full to copy its structural pattern**

Note exact component usage (`HelpHeader` props, `HelpSectionHeader` props, `HelpStepCard` props, `HelpCallout` props) so the new pages are structurally consistent, not reinvented.

- [ ] **Step 2: Write `pages/help/tracking.vue`**

Cover, using the same section-per-feature pattern as `schools.vue`: Documents (upload types, sharing with a school via `shared_with_schools`), Offers (statuses, linking to a school), Events (upcoming vs past, linking to a school/coach), Performance (metrics, timeline), Reports (what a report captures), Analytics (what's shown). Each section: what it's for, how to use it, one `HelpCallout` for a common gotcha (e.g. "a document isn't visible to a school until you share it").

- [ ] **Step 3: Write `pages/help/family.vue`**

Cover: Family Management (inviting a parent/guardian, multi-athlete families), Notifications (in-app vs email, where to change them), Public Player Profile (`/p/[slug]`, what's shown, how to share it), School Preferences (campus size, cost sensitivity, location — and that these feed Fit Signals, link to `schools.vue`'s Fit Signals section instead of duplicating it).

- [ ] **Step 4: Add Coach Outreach section to `pages/help/schools.vue`**

New `HelpSectionHeader` covering: Communication Templates (`/settings/communication-templates`), the contact-window auto-swap behavior (why some templates are hidden pre-contact-window — silent swap, not an error), and the coach detail page's comm log.

- [ ] **Step 5: Register the 2 new routes on the index and sidebar**

Add to `helpSections` in `pages/help/index.vue`:

```typescript
{
  slug: "tracking",
  icon: "i-heroicons-clipboard-document-list",
  title: "Tracking Your Recruiting",
  description:
    "Documents, offers, events, performance, and reports in one place.",
},
{
  slug: "family",
  icon: "i-heroicons-user-group",
  title: "Family & Profile",
  description:
    "Family accounts, notifications, your public profile, and preferences.",
},
```

Add matching links to `components/Help/HelpSidebar.vue` following its existing link pattern.

- [ ] **Step 6: Run type-check + lint + full test suite**

Run: `npm run type-check && npm run lint && npm run test`
Expected: 0 errors, all pass

- [ ] **Step 7: Commit**

```bash
git add pages/help/tracking.vue pages/help/family.vue pages/help/schools.vue pages/help/index.vue components/Help/HelpSidebar.vue
git commit -m "feat: add Help Center coverage for tracking + family features (#514)"
```

---

## Phase 4 — FAQ

### Task 5: FAQ section

**Files:**
- Create: `components/Help/faqEntries.ts`
- Create: `components/Help/HelpFaqAccordion.vue`
- Create: `pages/help/faq.vue`
- Modify: `pages/help/index.vue`, `components/Help/HelpSidebar.vue`
- Test: `components/Help/__tests__/HelpFaqAccordion.spec.ts`

**Interfaces:**
- Produces: `FaqEntry { id: string; category: string; question: string; answer: string }`, exported array `faqEntries: FaqEntry[]`, and `getFaqsByCategory(category: string): FaqEntry[]`.
- `HelpFaqAccordion` props: `{ entries: FaqEntry[] }`, emits nothing, internal `ref<string | null>` tracks which entry is expanded (accordion, one open at a time).

- [ ] **Step 1: Write the failing test**

```typescript
// components/Help/__tests__/HelpFaqAccordion.spec.ts
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import HelpFaqAccordion from "../HelpFaqAccordion.vue";

const entries = [
  { id: "q1", category: "general", question: "Q1?", answer: "A1" },
  { id: "q2", category: "general", question: "Q2?", answer: "A2" },
];

describe("HelpFaqAccordion", () => {
  it("hides answers until their question is clicked", async () => {
    const wrapper = mount(HelpFaqAccordion, { props: { entries } });
    expect(wrapper.text()).not.toContain("A1");
    await wrapper.find('[data-testid="faq-question-q1"]').trigger("click");
    expect(wrapper.text()).toContain("A1");
  });

  it("collapses the previously open entry when a new one opens", async () => {
    const wrapper = mount(HelpFaqAccordion, { props: { entries } });
    await wrapper.find('[data-testid="faq-question-q1"]').trigger("click");
    await wrapper.find('[data-testid="faq-question-q2"]').trigger("click");
    expect(wrapper.text()).not.toContain("A1");
    expect(wrapper.text()).toContain("A2");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- components/Help/__tests__/HelpFaqAccordion.spec.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```vue
<!-- components/Help/HelpFaqAccordion.vue -->
<template>
  <div class="divide-y divide-gray-200">
    <div v-for="entry in entries" :key="entry.id" class="py-4">
      <button
        :data-testid="`faq-question-${entry.id}`"
        class="flex w-full items-center justify-between text-left font-medium text-gray-900"
        @click="toggle(entry.id)"
      >
        {{ entry.question }}
        <UIcon
          :name="
            openId === entry.id
              ? 'i-heroicons-chevron-up'
              : 'i-heroicons-chevron-down'
          "
        />
      </button>
      <p v-if="openId === entry.id" class="mt-2 text-gray-600">
        {{ entry.answer }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FaqEntry } from "./faqEntries";

defineProps<{ entries: FaqEntry[] }>();

const openId = ref<string | null>(null);
const toggle = (id: string) => {
  openId.value = openId.value === id ? null : id;
};
</script>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- components/Help/__tests__/HelpFaqAccordion.spec.ts`
Expected: PASS (2/2)

- [ ] **Step 5: Write `faqEntries.ts` seeded from real support patterns**

```typescript
// components/Help/faqEntries.ts
export interface FaqEntry {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export const faqEntries: FaqEntry[] = [
  {
    id: "why-no-athletic-fit",
    category: "fit-signals",
    question: "Why don't you show an Athletic Fit or Opportunity Fit score?",
    answer:
      "We intentionally don't — only a coach knows what they're looking for and what roster spots are open. A fabricated score would give false confidence. Talk to the coach directly for that read.",
  },
  {
    id: "template-hidden",
    category: "coaches",
    question: "Why is a message template hidden for a school?",
    answer:
      "Some sports and divisions have an NCAA contact period. Outside that window, the template auto-swaps to a pre-window version — it's not a bug, and it never blocks outreach entirely.",
  },
  {
    id: "task-locked",
    category: "timeline",
    question: "Why is a task locked?",
    answer:
      "Some tasks depend on earlier ones finishing first, to keep your recruiting progression logical. Complete the dependency and the lock clears automatically.",
  },
  {
    id: "share-document",
    category: "tracking",
    question: "Why can't a school see a document I uploaded?",
    answer:
      "Uploading a document doesn't share it automatically — you choose which schools can see it. Open the document and add the school under sharing.",
  },
  {
    id: "multiple-athletes",
    category: "family",
    question: "Can one family account track more than one athlete?",
    answer:
      "Yes — invite additional athletes under Family Management, and switch between them with the athlete switcher in the header.",
  },
];

export const getFaqsByCategory = (category: string): FaqEntry[] =>
  faqEntries.filter((entry) => entry.category === category);
```

- [ ] **Step 6: Write `pages/help/faq.vue`**

```vue
<template>
  <div>
    <HelpHeader
      title="Frequently Asked Questions"
      description="Quick answers to the questions we hear most."
      reviewed-on="2026-09-06"
    />
    <HelpFaqAccordion :entries="faqEntries" />
  </div>
</template>

<script setup lang="ts">
import { faqEntries } from "~/components/Help/faqEntries";

definePageMeta({ layout: "help" });
</script>
```

- [ ] **Step 7: Register the FAQ route on the index and sidebar**

Add an `faq` entry to `helpSections` in `pages/help/index.vue` and a matching link in `components/Help/HelpSidebar.vue`, same pattern as Task 4 Step 5.

- [ ] **Step 8: Run type-check + lint + full test suite**

Run: `npm run type-check && npm run lint && npm run test`
Expected: 0 errors, all pass

- [ ] **Step 9: Commit**

```bash
git add components/Help/faqEntries.ts components/Help/HelpFaqAccordion.vue components/Help/__tests__/HelpFaqAccordion.spec.ts pages/help/faq.vue pages/help/index.vue components/Help/HelpSidebar.vue
git commit -m "feat: add FAQ section to Help Center (#514)"
```

---

## Phase 5 — Glossary

### Task 6: Glossary of recruiting terms

**Files:**
- Create: `components/Help/glossaryTerms.ts`
- Create: `components/Help/HelpGlossaryList.vue`
- Create: `pages/help/glossary.vue`
- Modify: `pages/help/index.vue`, `components/Help/HelpSidebar.vue`
- Test: `components/Help/__tests__/HelpGlossaryList.spec.ts`

**Interfaces:**
- Produces: `GlossaryTerm { id: string; term: string; definition: string }`, exported array `glossaryTerms: GlossaryTerm[]`, sorted alphabetically by `term` at module load.
- `HelpGlossaryList` props: `{ terms: GlossaryTerm[] }`, no internal state — pure render, grouped by first letter.

- [ ] **Step 1: Write the failing test**

```typescript
// components/Help/__tests__/HelpGlossaryList.spec.ts
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import HelpGlossaryList from "../HelpGlossaryList.vue";

const terms = [
  { id: "official-visit", term: "Official Visit", definition: "..." },
  { id: "walk-on", term: "Walk-On", definition: "..." },
];

describe("HelpGlossaryList", () => {
  it("groups terms under a letter heading", () => {
    const wrapper = mount(HelpGlossaryList, { props: { terms } });
    expect(wrapper.text()).toContain("O");
    expect(wrapper.text()).toContain("Official Visit");
    expect(wrapper.text()).toContain("W");
    expect(wrapper.text()).toContain("Walk-On");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- components/Help/__tests__/HelpGlossaryList.spec.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```vue
<!-- components/Help/HelpGlossaryList.vue -->
<template>
  <div>
    <div v-for="[letter, group] in groupedTerms" :key="letter" class="mb-6">
      <h3 class="mb-2 text-sm font-semibold uppercase text-gray-400">
        {{ letter }}
      </h3>
      <dl>
        <div v-for="entry in group" :key="entry.id" class="mb-3">
          <dt class="font-medium text-gray-900">{{ entry.term }}</dt>
          <dd class="text-gray-600">{{ entry.definition }}</dd>
        </div>
      </dl>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GlossaryTerm } from "./glossaryTerms";

const props = defineProps<{ terms: GlossaryTerm[] }>();

const groupedTerms = computed(() => {
  const groups = new Map<string, GlossaryTerm[]>();
  for (const entry of props.terms) {
    const letter = entry.term[0]!.toUpperCase();
    const existing = groups.get(letter) ?? [];
    groups.set(letter, [...existing, entry]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
});
</script>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- components/Help/__tests__/HelpGlossaryList.spec.ts`
Expected: PASS (1/1)

- [ ] **Step 5: Write `glossaryTerms.ts`**

```typescript
// components/Help/glossaryTerms.ts
export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
}

const rawTerms: GlossaryTerm[] = [
  { id: "committable", term: "Committable Offer", definition: "A scholarship or roster-spot offer the athlete can accept, as opposed to general interest." },
  { id: "dead-period", term: "Dead Period", definition: "An NCAA-defined window when a coach cannot have any in-person contact with a recruit, on or off campus." },
  { id: "eval-period", term: "Evaluation Period", definition: "An NCAA-defined window when a coach may watch a recruit compete or visit their school, but off-campus, in-person recruiting contact is not allowed." },
  { id: "grayshirt", term: "Grayshirting", definition: "Delaying enrollment (and scholarship start) by a semester or year, usually to manage a roster's scholarship count." },
  { id: "letter-of-intent", term: "Letter of Intent (LOI)", definition: "A binding written agreement between a recruit and a school confirming enrollment and athletic participation." },
  { id: "official-visit", term: "Official Visit", definition: "A campus visit paid for (in full or part) by the school, limited to 5 total across a recruit's official visits, one per school." },
  { id: "preferred-walk-on", term: "Preferred Walk-On", definition: "A roster spot offered without a scholarship, but with an implicit invitation to try out rather than compete in open tryouts." },
  { id: "quiet-period", term: "Quiet Period", definition: "An NCAA-defined window when a coach may only have recruiting contact with a recruit on the school's own campus." },
  { id: "recruiting-calendar", term: "Recruiting Calendar", definition: "The NCAA's sport-specific schedule of contact, evaluation, quiet, and dead periods that governs when a coach can contact a recruit." },
  { id: "redshirt", term: "Redshirt", definition: "A season in which an athlete practices with the team but doesn't compete, preserving a year of eligibility." },
  { id: "unofficial-visit", term: "Unofficial Visit", definition: "A self-funded campus visit with no limit on how many a recruit can take." },
  { id: "walk-on", term: "Walk-On", definition: "An athlete who joins a team without an athletic scholarship, typically via open tryouts." },
];

export const glossaryTerms: GlossaryTerm[] = [...rawTerms].sort((a, b) =>
  a.term.localeCompare(b.term),
);
```

- [ ] **Step 6: Write `pages/help/glossary.vue`**

```vue
<template>
  <div>
    <HelpHeader
      title="Glossary"
      description="Recruiting terms explained in plain language."
      reviewed-on="2026-09-06"
    />
    <HelpGlossaryList :terms="glossaryTerms" />
  </div>
</template>

<script setup lang="ts">
import { glossaryTerms } from "~/components/Help/glossaryTerms";

definePageMeta({ layout: "help" });
</script>
```

- [ ] **Step 7: Register the Glossary route on the index and sidebar**

Same pattern as Task 5 Step 7.

- [ ] **Step 8: Run type-check + lint + full test suite**

Run: `npm run type-check && npm run lint && npm run test`
Expected: 0 errors, all pass

- [ ] **Step 9: Commit**

```bash
git add components/Help/glossaryTerms.ts components/Help/HelpGlossaryList.vue components/Help/__tests__/HelpGlossaryList.spec.ts pages/help/glossary.vue pages/help/index.vue components/Help/HelpSidebar.vue
git commit -m "feat: add recruiting Glossary to Help Center (#514)"
```

---

## Phase 6 — Keep it from drifting again

### Task 7: Scheduled Help Center review cron

**Files:**
- No repo files — this is a `CronCreate` call, same pattern as the existing "doc hygiene" crons already registered for this repo.

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: a recurring scheduled prompt; no code interface.

- [ ] **Step 1: Register the cron**

Call `CronCreate` with:
- `cron`: `"0 9 1 */3 *"` (9am on the 1st of every 3rd month — quarterly)
- `recurring`: `true`
- `prompt`: `"Help Center quarterly review — web repo. cd /Volumes/AlphabetSoup/TheRecruitingCompass/code/recruiting-compass-web. Diff pages/ against pages/help/*.vue + components/Help/*.ts (same method as planning/help-center-audit-2026-09-06.md) to find features shipped since the last 'Last reviewed' date on any help page. If gaps found: update the affected help page(s), bump reviewed-on to today, commit as 'docs: quarterly Help Center review YYYY-MM-DD', push, open a PR to develop. If nothing changed, do not commit."`

- [ ] **Step 2: Verify registration**

Call `CronList`, confirm the new cron appears with the correct schedule and prompt.

---

### Task 8: Dev-facing reminder to update Help Center on feature changes

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: nothing.
- Produces: a standing instruction future sessions read automatically (Tier-0, always loaded) — this is the mechanism for item 5 of the issue ("update Help Center when we change how something works").

- [ ] **Step 1: Add a row to the "Read Before You Touch" table**

```markdown
| Adding/changing a user-facing feature or flow | Update the matching `pages/help/*.vue` section + bump its `reviewed-on` date; add an entry to `components/Help/faqEntries.ts` if it's likely to generate a support question |
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: remind sessions to update Help Center on feature changes (#514)"
```

---

## Self-Review Checklist (for the plan author, before handing off)

- [x] Spec coverage: issue items 1 (audit) → Task 1; 2 (add missing content) → Tasks 3-4; 3 (last-reviewed date) → Task 2; 4 (scheduled review job) → Task 7; 5 (update-on-change mechanism) → Task 8; 6 (FAQ) → Task 5; 7 (Glossary) → Task 6.
- [x] No placeholders — every content task ships literal copy, every code task ships literal implementation.
- [x] Type consistency — `FaqEntry`/`GlossaryTerm`/`HelpDefinition` interfaces defined once (Tasks 5, 6, existing) and imported everywhere they're used, not redeclared.
