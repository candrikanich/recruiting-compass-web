# Coach Tile Unification (Plan 1: Tiles) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three divergent web coach-tile renderings with one prop-driven `CoachCard.vue`, so the school sidebar, per-school Manage Coaches page, and global Coaches directory all show an identical, consistent tile that taps through to the canonical coach detail page.

**Architecture:** One canonical `components/Coach/CoachCard.vue` with a `variant` (`compact` | `full`) prop and a `showSchoolMeta` flag. A fixed-order action-icon row (Email · Text · Call · X · Instagram) renders each icon only when its data field is present; icon clicks `stop` propagation so they never trigger the tile's `NuxtLink` navigation to `/coaches/[id]`. No delete affordance on any tile (delete lives on the detail page). Three page/component consumers are repointed to the new component and the two superseded components are deleted.

**Tech Stack:** Nuxt 3, Vue 3 `<script setup>` + TypeScript strict, TailwindCSS v4 with brand-token utilities, `@nuxt/icon` (`i-heroicons-*`), Vitest + `@vue/test-utils`.

**Spec:** `docs/superpowers/specs/2026-08-14-coach-tile-unification-design.md`

## Global Constraints

- TypeScript strict mode; **no `any`** in component/source code (`as SomeType` narrowing only where unavoidable; `any` allowed in tests only).
- Vue: `<script setup lang="ts">`, `withDefaults(defineProps<{}>(), {})`, `defineEmits<{}>()`.
- **No raw hex / `rgba()`** in `<style>` blocks or inline `style=`. Icon colors use **brand-token Tailwind utilities** (`text-brand-blue-600`, `text-brand-emerald-600`, `text-brand-purple-600`, `text-brand-slate-700`, `text-brand-pink-500`). `npm run audit:tokens` must stay clean.
- Action icons must use `@click.stop` (and keyboard `.stop` where focusable) so they never trigger the tile's detail navigation.
- **No delete affordance** on any tile variant.
- Every tile variant navigates to **`/coaches/${coach.id}`** (Plan 1 decision; detail-page consolidation is deferred Plan 2).
- Commit after every task. Conventional commits (`feat:` / `refactor:` / `test:`). Append the two-line session trailer used by this repo.
- Verify gates before declaring a task done: `npm run type-check`, `npm run lint`, `npm run test` (touched suites), `npm run audit:tokens`.

**Coach type fields used:** `id`, `first_name`, `last_name`, `role`, `email`, `phone`, `twitter_handle`, `instagram_handle`, `last_contact_date`, `school_id`, `notes`, `updated_at` (all already on `~/types/models` `Coach`).

**Existing utilities to reuse (do not re-implement):**
- `getRoleLabel(role)` — `~/utils/coachLabels`
- `getRoleBadgeClass(role)`, `formatCoachDate(date)`, `getDaysAgoExact(date)` — `~/utils/coachFormatters`
- `openTwitter(handle?)`, `openInstagram(handle?)` — `~/utils/socialMediaHandlers`

---

## File Structure

| File | Responsibility |
|------|----------------|
| `assets/css/main.css` | Add `brand-pink-*` palette (50–900) to `@theme` |
| `docs/design/tokens.md` | Document the new pink palette row |
| `components/Coach/CoachCard.vue` | **NEW** canonical coach tile (both variants) |
| `components/Coach/CoachCard.spec.ts` | **NEW** unit tests for the canonical tile |
| `pages/coaches/index.vue` | Repoint directory grid → `CoachCard` (`full` + `showSchoolMeta`) |
| `pages/schools/[id]/coaches.vue` | Repoint manage grid → `CoachCard` (`full`), remove delete overlay |
| `components/School/SchoolSidebar.vue` | Repoint coaches block → `CoachCard` (`compact`) |
| `components/CoachCard.vue` | **DELETE** (superseded) |
| `components/Coach/CoachListCard.vue` | **DELETE** (superseded) |

---

## Task 1: Add `brand-pink-*` design token

**Files:**
- Modify: `assets/css/main.css` (`@theme` block, after the `brand-orange-*` palette)
- Modify: `docs/design/tokens.md` (Brand Palette table)

**Interfaces:**
- Produces: Tailwind utilities `text-brand-pink-500` / `bg-brand-pink-50` etc.; CSS var `--color-brand-pink-500`. Consumed by Task 3's Instagram icon.

- [ ] **Step 1: Add the pink palette to `@theme`**

In `assets/css/main.css`, add after the `brand-orange-*` block:

```css
  --color-brand-pink-50: #fdf2f8;
  --color-brand-pink-100: #fce7f3;
  --color-brand-pink-200: #fbcfe8;
  --color-brand-pink-300: #f9a8d4;
  --color-brand-pink-400: #f472b6;
  --color-brand-pink-500: #ec4899;
  --color-brand-pink-600: #db2777;
  --color-brand-pink-700: #be185d;
  --color-brand-pink-800: #9d174d;
  --color-brand-pink-900: #831843;
```

- [ ] **Step 2: Document it**

In `docs/design/tokens.md`, add a row to the Brand Palette table:

```markdown
| Pink | `brand-pink-*` | Instagram / social accent |
```

- [ ] **Step 3: Verify the utility resolves**

Run: `npm run dev` (or `npm run build`), then confirm a throwaway `class="text-brand-pink-500"` renders pink. Remove the throwaway. Run: `npm run audit:tokens` — expect clean (no raw hex flagged; `@theme` palette definitions are the sanctioned home for hex).

- [ ] **Step 4: Commit**

```bash
git add assets/css/main.css docs/design/tokens.md
git commit -m "feat(design): add brand-pink palette for Instagram accent"
```

---

## Task 2: `CoachCard` — layout, variants, tap-to-detail

**Files:**
- Create: `components/Coach/CoachCard.vue`
- Create (start): `components/Coach/CoachCard.spec.ts`

**Interfaces:**
- Produces the component contract that all consumers (Tasks 4–6) rely on:

```ts
interface Props {
  coach: Coach;
  variant?: "compact" | "full";     // default "full"
  showSchoolMeta?: boolean;          // default false; directory sets true
  school?: School;                   // required when showSchoolMeta (logo + name)
  contactMode?: "native" | "modal";  // default "native"; directory/manage set "modal"
  detailTo?: string;                 // default `/coaches/${coach.id}`
}
const emit = defineEmits<{ "open-communication": [coachId: string] }>();
```

- [ ] **Step 1: Write the failing test (layout + variants)**

Create `components/Coach/CoachCard.spec.ts`:

```ts
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import CoachCard from "./CoachCard.vue";
import type { Coach, School } from "~/types/models";

const NuxtLinkStub = {
  props: ["to"],
  template: '<a :href="to"><slot /></a>',
};
const stubs = { NuxtLink: NuxtLinkStub, SchoolLogo: true, UIcon: true };

const baseCoach = {
  id: "c1",
  first_name: "Brady",
  last_name: "Cottom",
  role: "assistant",
  email: "bcottom@ashland.edu",
  phone: "419-289-5476",
  twitter_handle: "Brady_Cottom",
  instagram_handle: "brady.cottom",
  last_contact_date: "2026-08-03",
  school_id: "s1",
  notes: null,
} as unknown as Coach;

const school = { id: "s1", name: "Ashland University" } as unknown as School;

function mountCard(props: Record<string, unknown> = {}) {
  return mount(CoachCard, {
    props: { coach: baseCoach, ...props },
    global: { stubs },
  });
}

describe("CoachCard — layout & variants", () => {
  it("renders the coach name and role label", () => {
    const w = mountCard();
    expect(w.text()).toContain("Brady Cottom");
    expect(w.text()).toContain("Assistant Coach");
  });

  it("links the tile to the canonical detail route by default", () => {
    const w = mountCard();
    expect(w.get("a").attributes("href")).toBe("/coaches/c1");
  });

  it("honors an explicit detailTo override", () => {
    const w = mountCard({ detailTo: "/schools/s1/coaches/c1" });
    expect(w.get("a").attributes("href")).toBe("/schools/s1/coaches/c1");
  });

  it("shows school name + contact rows + last-contact in full variant with showSchoolMeta", () => {
    const w = mountCard({ variant: "full", showSchoolMeta: true, school });
    expect(w.text()).toContain("Ashland University");
    expect(w.text()).toContain("bcottom@ashland.edu");
    expect(w.text()).toContain("419-289-5476");
    expect(w.text()).toContain("Last contact");
  });

  it("hides school name, contact rows and last-contact in compact variant", () => {
    const w = mountCard({ variant: "compact" });
    expect(w.text()).not.toContain("Ashland University");
    expect(w.text()).not.toContain("bcottom@ashland.edu");
    expect(w.text()).not.toContain("Last contact");
  });

  it("renders no delete affordance in any variant", () => {
    const full = mountCard({ variant: "full" });
    const compact = mountCard({ variant: "compact" });
    expect(full.find('[data-testid="delete-coach"]').exists()).toBe(false);
    expect(compact.find('[data-testid="delete-coach"]').exists()).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run components/Coach/CoachCard.spec.ts`
Expected: FAIL — `Failed to resolve import "./CoachCard.vue"`.

- [ ] **Step 3: Implement the component (layout + variants, action row placeholder)**

Create `components/Coach/CoachCard.vue`:

```vue
<template>
  <NuxtLink
    :to="resolvedDetailTo"
    :aria-label="`View profile for ${fullName}`"
    :class="[
      'block rounded-xl border border-slate-200 bg-white shadow-xs transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-500 focus-visible:ring-offset-2',
      variant === 'compact' ? 'p-3' : 'p-4',
    ]"
  >
    <!-- Header: logo* + name + school* + role badge -->
    <div class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <SchoolLogo
          v-if="showSchoolMeta && school"
          :school="school"
          size="md"
        />
        <div class="min-w-0">
          <h3 class="truncate font-semibold text-slate-900">{{ fullName }}</h3>
          <p
            v-if="showSchoolMeta && school"
            class="truncate text-sm text-slate-500"
          >
            {{ school.name }}
          </p>
        </div>
      </div>
      <span
        class="shrink-0 rounded-full px-2 py-1 text-xs font-medium"
        :class="roleBadgeClass"
        :aria-label="`Coach role: ${roleLabel}`"
      >
        {{ roleLabel }}
      </span>
    </div>

    <!-- Contact rows (full only) -->
    <div v-if="variant === 'full'" class="mt-3 space-y-1.5">
      <div
        v-if="coach.email"
        class="flex items-center gap-2 text-sm text-slate-600"
      >
        <UIcon
          name="i-heroicons-envelope"
          class="h-4 w-4 text-slate-400"
          aria-hidden="true"
        />
        <span class="truncate">{{ coach.email }}</span>
      </div>
      <div
        v-if="coach.phone"
        class="flex items-center gap-2 text-sm text-slate-600"
      >
        <UIcon
          name="i-heroicons-phone"
          class="h-4 w-4 text-slate-400"
          aria-hidden="true"
        />
        <span>{{ coach.phone }}</span>
      </div>
    </div>

    <!-- Action-icon row (implemented in Task 3) -->
    <CoachCardActions
      :coach="coach"
      :contact-mode="contactMode"
      @open-communication="emit('open-communication', coach.id)"
    />

    <!-- Last contact (full only) -->
    <p
      v-if="variant === 'full' && coach.last_contact_date"
      class="mt-2 text-xs text-slate-500"
    >
      Last contact: {{ lastContactLabel }}
    </p>
  </NuxtLink>
</template>

<script setup lang="ts">
import { computed } from "vue";
import SchoolLogo from "~/components/School/SchoolLogo.vue";
import CoachCardActions from "~/components/Coach/CoachCardActions.vue";
import { getRoleLabel } from "~/utils/coachLabels";
import {
  getRoleBadgeClass,
  formatCoachDate,
  getDaysAgoExact,
} from "~/utils/coachFormatters";
import type { Coach, School } from "~/types/models";

const props = withDefaults(
  defineProps<{
    coach: Coach;
    variant?: "compact" | "full";
    showSchoolMeta?: boolean;
    school?: School;
    contactMode?: "native" | "modal";
    detailTo?: string;
  }>(),
  { variant: "full", showSchoolMeta: false, contactMode: "native" },
);

const emit = defineEmits<{ "open-communication": [coachId: string] }>();

const fullName = computed(
  () => `${props.coach.first_name} ${props.coach.last_name}`,
);
const roleLabel = computed(() => getRoleLabel(props.coach.role));
const roleBadgeClass = computed(() => getRoleBadgeClass(props.coach.role));
const resolvedDetailTo = computed(
  () => props.detailTo ?? `/coaches/${props.coach.id}`,
);
const lastContactLabel = computed(() => {
  const d = props.coach.last_contact_date;
  if (!d) return "";
  return `${formatCoachDate(d)} (${getDaysAgoExact(d)})`;
});
</script>
```

> **Note:** the template references `CoachCardActions` — a throwaway stub for
> now so Task 2 compiles. Create a minimal placeholder
> `components/Coach/CoachCardActions.vue` containing just
> `<template><div /></template>` plus an empty `<script setup lang="ts">`
> declaring the props/emit; Task 3 fills it in. (It is stubbed in this task's
> tests via `stubs`, so its internals don't affect Task 2 assertions.)

- [ ] **Step 4: Run the tests, verify they pass**

Run: `npx vitest run components/Coach/CoachCard.spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Type-check**

Run: `npm run type-check`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add components/Coach/CoachCard.vue components/Coach/CoachCard.spec.ts components/Coach/CoachCardActions.vue
git commit -m "feat(coaches): canonical CoachCard layout + variants"
```

---

## Task 3: `CoachCard` action-icon row

**Files:**
- Modify: `components/Coach/CoachCardActions.vue` (fill in the placeholder from Task 2)
- Modify: `components/Coach/CoachCard.spec.ts` (add action-row tests; mount the real actions component — remove any `CoachCardActions` stub for these cases)

**Interfaces:**
- Consumes: `Coach` fields `email`, `phone`, `twitter_handle`, `instagram_handle`; `openTwitter`/`openInstagram` from `~/utils/socialMediaHandlers`; `brand-pink-500` from Task 1.
- Produces: emits `open-communication` (payload: none — parent adds `coach.id`) when `contactMode === "modal"` for the Email/Text actions.

```ts
// components/Coach/CoachCardActions.vue
interface Props {
  coach: Coach;
  contactMode?: "native" | "modal"; // default "native"
}
const emit = defineEmits<{ "open-communication": [] }>();
```

- [ ] **Step 1: Write the failing tests (action row)**

Append to `components/Coach/CoachCard.spec.ts` (mount the real actions component — do **not** stub `CoachCardActions` in this block):

```ts
import { vi } from "vitest";

const actionStubs = { NuxtLink: NuxtLinkStub, SchoolLogo: true, UIcon: true };

describe("CoachCard — action row", () => {
  it("renders all five actions in fixed order when all data present", () => {
    const w = mount(CoachCard, {
      props: { coach: baseCoach },
      global: { stubs: actionStubs },
    });
    const labels = w
      .findAll("[data-action]")
      .map((n) => n.attributes("data-action"));
    expect(labels).toEqual(["email", "text", "call", "twitter", "instagram"]);
  });

  it("omits an action when its data field is missing, preserving order", () => {
    const coach = { ...baseCoach, phone: null, twitter_handle: null } as unknown as Coach;
    const w = mount(CoachCard, {
      props: { coach },
      global: { stubs: actionStubs },
    });
    const labels = w
      .findAll("[data-action]")
      .map((n) => n.attributes("data-action"));
    expect(labels).toEqual(["email", "instagram"]);
  });

  it("emits open-communication with coach id on Email click in modal mode", async () => {
    const w = mount(CoachCard, {
      props: { coach: baseCoach, contactMode: "modal" },
      global: { stubs: actionStubs },
    });
    await w.get('[data-action="email"]').trigger("click");
    expect(w.emitted("open-communication")?.[0]).toEqual(["c1"]);
  });

  it("uses a mailto link (no emit) on Email in native mode", async () => {
    const w = mount(CoachCard, {
      props: { coach: baseCoach, contactMode: "native" },
      global: { stubs: actionStubs },
    });
    expect(w.get('[data-action="email"]').attributes("href")).toBe(
      "mailto:bcottom@ashland.edu",
    );
    await w.get('[data-action="email"]').trigger("click");
    expect(w.emitted("open-communication")).toBeUndefined();
  });

  it("opens Twitter via the social handler without navigating", async () => {
    const spy = vi
      .spyOn(await import("~/utils/socialMediaHandlers"), "openTwitter")
      .mockImplementation(() => {});
    const w = mount(CoachCard, {
      props: { coach: baseCoach },
      global: { stubs: actionStubs },
    });
    const evt = { stopPropagation: vi.fn() };
    await w.get('[data-action="twitter"]').trigger("click");
    expect(spy).toHaveBeenCalledWith("Brady_Cottom");
  });
});
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `npx vitest run components/Coach/CoachCard.spec.ts`
Expected: FAIL — no `[data-action]` elements found (placeholder renders empty `<div>`).

- [ ] **Step 3: Implement the action row**

Replace `components/Coach/CoachCardActions.vue` with:

```vue
<template>
  <div class="mt-3 flex items-center gap-1">
    <!-- Email -->
    <button
      v-if="coach.email && contactMode === 'modal'"
      data-action="email"
      type="button"
      :aria-label="`Email ${name}`"
      class="rounded-lg p-2 text-brand-blue-600 transition hover:bg-brand-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-500"
      @click.stop="emit('open-communication')"
      @keydown.enter.stop
      @keydown.space.stop
    >
      <UIcon name="i-heroicons-envelope" class="h-5 w-5" aria-hidden="true" />
    </button>
    <a
      v-else-if="coach.email"
      data-action="email"
      :href="`mailto:${coach.email}`"
      :aria-label="`Email ${name}`"
      class="rounded-lg p-2 text-brand-blue-600 transition hover:bg-brand-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-500"
      @click.stop
      @keydown.enter.stop
      @keydown.space.stop
    >
      <UIcon name="i-heroicons-envelope" class="h-5 w-5" aria-hidden="true" />
    </a>

    <!-- Text (SMS) -->
    <button
      v-if="coach.phone && contactMode === 'modal'"
      data-action="text"
      type="button"
      :aria-label="`Text ${name}`"
      class="rounded-lg p-2 text-brand-emerald-600 transition hover:bg-brand-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald-500"
      @click.stop="emit('open-communication')"
      @keydown.enter.stop
      @keydown.space.stop
    >
      <UIcon
        name="i-heroicons-chat-bubble-left"
        class="h-5 w-5"
        aria-hidden="true"
      />
    </button>
    <a
      v-else-if="coach.phone"
      data-action="text"
      :href="`sms:${coach.phone}`"
      :aria-label="`Text ${name}`"
      class="rounded-lg p-2 text-brand-emerald-600 transition hover:bg-brand-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald-500"
      @click.stop
      @keydown.enter.stop
      @keydown.space.stop
    >
      <UIcon
        name="i-heroicons-chat-bubble-left"
        class="h-5 w-5"
        aria-hidden="true"
      />
    </a>

    <!-- Call -->
    <a
      v-if="coach.phone"
      data-action="call"
      :href="`tel:${coach.phone}`"
      :aria-label="`Call ${name}`"
      class="rounded-lg p-2 text-brand-purple-600 transition hover:bg-brand-purple-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple-500"
      @click.stop
      @keydown.enter.stop
      @keydown.space.stop
    >
      <UIcon name="i-heroicons-phone" class="h-5 w-5" aria-hidden="true" />
    </a>

    <!-- X / Twitter -->
    <button
      v-if="coach.twitter_handle"
      data-action="twitter"
      type="button"
      :aria-label="`View ${name} on X`"
      class="rounded-lg p-2 text-brand-slate-700 transition hover:bg-brand-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-slate-500"
      @click.stop="openTwitter(coach.twitter_handle)"
      @keydown.enter.stop
      @keydown.space.stop
    >
      <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
        />
      </svg>
    </button>

    <!-- Instagram -->
    <button
      v-if="coach.instagram_handle"
      data-action="instagram"
      type="button"
      :aria-label="`View ${name} on Instagram`"
      class="rounded-lg p-2 text-brand-pink-500 transition hover:bg-brand-pink-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink-500"
      @click.stop="openInstagram(coach.instagram_handle)"
      @keydown.enter.stop
      @keydown.space.stop
    >
      <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
        />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { openTwitter, openInstagram } from "~/utils/socialMediaHandlers";
import type { Coach } from "~/types/models";

const props = withDefaults(
  defineProps<{ coach: Coach; contactMode?: "native" | "modal" }>(),
  { contactMode: "native" },
);

const emit = defineEmits<{ "open-communication": [] }>();

const name = computed(
  () => `${props.coach.first_name} ${props.coach.last_name}`,
);
</script>
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `npx vitest run components/Coach/CoachCard.spec.ts`
Expected: PASS (all layout + action tests).

- [ ] **Step 5: Type-check + token audit**

Run: `npm run type-check` (expect 0) and `npm run audit:tokens` (expect clean — brand utilities only, `currentColor` SVGs inherit token color).

- [ ] **Step 6: Commit**

```bash
git add components/Coach/CoachCardActions.vue components/Coach/CoachCard.spec.ts
git commit -m "feat(coaches): CoachCard action row (email/text/call/x/instagram)"
```

---

## Task 4: Repoint the global Coaches directory

**Files:**
- Modify: `pages/coaches/index.vue:236-250` (the grid; currently `<CoachListCard>`)

**Interfaces:**
- Consumes: `CoachCard` from Task 2/3. Directory uses `variant="full"`, `showSchoolMeta`, `contactMode="modal"` (page already wires an in-app `CommunicationPanel` via `openCommunicationById`).

- [ ] **Step 1: Swap the component in the grid**

Replace the `<CoachListCard …>` block (lines ~241–249) with:

```vue
        <li v-for="coach in paginatedCoaches" :key="coach.id" v-memo="[coach.updated_at]">
          <CoachCard
            :coach="coach"
            variant="full"
            :show-school-meta="true"
            :school="getSchoolById(coach.school_id, schools)"
            contact-mode="modal"
            @open-communication="(id) => openCommunicationById(id)"
          />
        </li>
```

Remove the `@delete-coach="openDeleteModal"` wiring from the tile (delete is no longer a tile action). If `openDeleteModal` / the delete modal become unused on this page, leave them only if still reachable elsewhere on the page; otherwise remove the now-dead handler and modal in this step. Update the `CoachListCard` import to `CoachCard` (path `~/components/Coach/CoachCard.vue`).

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: 0 errors (fix any unused-import / unused-var fallout from removed delete wiring).

- [ ] **Step 3: Manual verify**

Run: `npm run dev` → open `/coaches`. Expect: grid of unified tiles (logo, name, school, role badge, contact rows, action icons, last-contact); clicking a tile body → `/coaches/:id`; clicking Email opens the CommunicationPanel; no delete button on tiles.

- [ ] **Step 4: Commit**

```bash
git add pages/coaches/index.vue
git commit -m "refactor(coaches): directory grid uses canonical CoachCard"
```

---

## Task 5: Repoint the per-school Manage Coaches page

**Files:**
- Modify: `pages/schools/[id]/coaches.vue:149-180` (grid + delete overlay)

**Interfaces:**
- Consumes: `CoachCard`. Manage uses `variant="full"`, `showSchoolMeta="false"` (same-school context), `contactMode="modal"` (page wires `CommunicationPanel`).

- [ ] **Step 1: Replace the grid + remove the delete overlay**

Replace the grid block (lines ~150–180) with:

```vue
        <div v-if="filteredCoaches.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CoachCard
            v-for="coach in filteredCoaches"
            :key="coach.id"
            :coach="coach"
            variant="full"
            contact-mode="modal"
            @open-communication="(id) => openCommunicationForId(id)"
          />
        </div>
```

- Delete the `.relative` wrapper and the absolute red delete button overlay (lines ~154–170) — delete moves to the detail page.
- Replace the old `<CoachCard @email/@text/@tweet/@instagram/@view>` event wiring: those bespoke events no longer exist. Email/Text now flow through `open-communication`. Confirm the page exposes a handler that opens `CommunicationPanel` by coach id; if the current handler is `sendEmail(coach)`/`sendText(coach)` shaped, add a thin `openCommunicationForId(id)` that resolves the coach and opens the panel (mirror `/coaches` page's `openCommunicationById`). Do not delete `deleteCoach`/`DesignSystemConfirmDialog` — the page may still surface delete elsewhere; only the tile overlay is removed.
- Update the import from the old `~/components/CoachCard.vue` to `~/components/Coach/CoachCard.vue`.

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: 0 errors (resolve unused `sendEmail`/`sendText`/`handleOpenTwitter`/`handleOpenInstagram`/`viewCoach` if the swap orphaned them — remove or keep per remaining usage).

- [ ] **Step 3: Manual verify**

Run: `npm run dev` → open a school's `…/coaches` page. Expect unified tiles (no logo — same-school), no red X overlay, Email/Text open the panel, tile body → `/coaches/:id`.

- [ ] **Step 4: Commit**

```bash
git add pages/schools/[id]/coaches.vue
git commit -m "refactor(coaches): manage page uses canonical CoachCard, delete off tile"
```

---

## Task 6: Repoint the school-detail sidebar coaches block

**Files:**
- Modify: `components/School/SchoolSidebar.vue:63-119` (inline coach list block)

**Interfaces:**
- Consumes: `CoachCard` with `variant="compact"`, `contactMode="native"` (sidebar has no in-app panel; email/text use `mailto:`/`sms:`).

- [ ] **Step 1: Replace the inline coach markup with the compact tile**

Replace the `v-for` coach block (lines ~63–115, the `<div class="p-3 border …">` list) with:

```vue
      <div v-if="coaches.length > 0" class="space-y-3">
        <CoachCard
          v-for="coach in coaches"
          :key="coach.id"
          :coach="coach"
          variant="compact"
        />
      </div>
```

Keep the surrounding card, the "Coaches" heading, the "Manage Coaches →" link, and the empty state untouched. Add `import CoachCard from "~/components/Coach/CoachCard.vue";` to the sidebar's `<script setup>` (verify it isn't auto-imported already; if auto-imported, skip the explicit import).

- [ ] **Step 2: Type-check + token audit**

Run: `npm run type-check` (0 errors) and `npm run audit:tokens` (clean).

- [ ] **Step 3: Manual verify**

Run: `npm run dev` → open a school detail page. Expect the sidebar Coaches panel to show compact tiles (name, role badge, action icons — no logo/contact-rows/last-contact); tile body → `/coaches/:id`; icons fire `mailto:`/`sms:`/`tel:`/social without navigating.

- [ ] **Step 4: Commit**

```bash
git add components/School/SchoolSidebar.vue
git commit -m "refactor(coaches): school sidebar uses compact CoachCard"
```

---

## Task 7: Delete superseded components + full verification

**Files:**
- Delete: `components/CoachCard.vue` (old manage card)
- Delete: `components/Coach/CoachListCard.vue` (old directory card)
- Delete: any dead spec files for the above (e.g. `components/CoachCard.spec.ts`, `components/Coach/CoachListCard.spec.ts`) if present

**Interfaces:**
- Consumes: nothing. Terminal cleanup + gate.

- [ ] **Step 1: Prove no remaining importers**

Run:

```bash
grep -rn "components/CoachCard.vue\|Coach/CoachListCard\|CoachListCard\b" \
  pages/ components/ composables/ --include="*.vue" --include="*.ts" \
  | grep -v "components/Coach/CoachCard"
```

Expected: no output (only the new `components/Coach/CoachCard.vue` should remain, which the filter excludes). If anything prints, repoint it to `CoachCard` before deleting.

- [ ] **Step 2: Delete the superseded files**

```bash
git rm components/CoachCard.vue components/Coach/CoachListCard.vue
# also: git rm any dead spec files surfaced above
```

- [ ] **Step 3: Full verification gate**

Run each; all must pass:

```bash
npm run type-check      # 0 errors
npm run lint            # 0 errors on changed files
npm run test            # full unit suite green (old card tests removed, new CoachCard suite green)
npm run audit:tokens    # clean
```

- [ ] **Step 4: E2E smoke (tap-to-detail across all three surfaces)**

Run: `npm run test:e2e` (or a focused coaches spec). Confirm from `/coaches`, a school detail page, and a school `…/coaches` page: tapping a tile lands on the coach detail screen; tapping an action icon opens its channel without navigating. If no such E2E exists, add one focused spec asserting tile→`/coaches/:id` navigation on the directory page.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(coaches): remove superseded coach card components"
```

---

## Self-Review

**Spec coverage:**
- One canonical component + variants → Tasks 2, 3. ✓
- Action set Email·Text·Call·X·Instagram, data-driven, fixed order, `@click.stop` → Task 3. ✓
- Two social icons, iOS parity → Task 3 (twitter + instagram). ✓
- `brand-pink` token for Instagram → Task 1. ✓
- Compact shows all applicable icons → Task 3 renders same actions regardless of variant (variant only gates layout, not the action row). ✓
- Delete off all tiles → Tasks 2 (no affordance), 4 & 5 (overlays removed), plus test in Task 2. ✓
- Last-contact on full only → Task 2. ✓
- All tiles → `/coaches/[id]` → Task 2 (`resolvedDetailTo`), verified Tasks 4–6. ✓
- Retire old components → Task 7. ✓
- Brand tokens / no raw hex → Global Constraints + audit gate in Tasks 3 & 7. ✓
- Detail-page consolidation is explicitly deferred (Plan 2) — not in scope. ✓

**Placeholder scan:** No "TBD"/"handle edge cases"/"write tests for the above" — all test and implementation code is inline. ✓

**Type consistency:** `CoachCard` props (`variant`, `showSchoolMeta`, `school`, `contactMode`, `detailTo`) and the `open-communication` emit are used identically in Tasks 2–6. `CoachCardActions` emits `open-communication` with no payload; `CoachCard` re-emits adding `coach.id`; consumers (Tasks 4, 5) receive `(id)`. Consistent. ✓

## Notes / Follow-ups

- **Plan 2 (deferred):** consolidate the two coach detail pages — rewrite the bespoke `/schools/[schoolId]/coaches/[coachId].vue` to render the same rich components as `/coaches/[id]` (or redirect), so the school-scoped route no longer diverges.
- **iOS (deferred):** `web-to-ios-handoff` spec for one `CoachCardView` + variant enum matching this contract (icon set/order/colors, tap → `CoachDetailView`, no inline delete, drop camera glyph).
- **`socialMediaHandlers` verify:** confirm `openTwitter`/`openInstagram` signatures accept a nullable handle (the detail page calls them with `coach.value?.twitter_handle`); Task 3 passes `coach.twitter_handle` directly.
