# Coach Detail Consolidation (Plan 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire the bespoke, inferior `/schools/[schoolId]/coaches/[coachId]` detail page so every coach detail renders the single rich `/coaches/[id]` page, with a context-aware "Back" link that returns the user to wherever they came from (coaches list, a school's coaches, or a school detail page).

**Architecture:** The rich `/coaches/[id]` page already exists and is the survivor — no component extraction. Each coach tile passes an explicit origin (`backTo` + `backLabel`) that `CoachCard` encodes as query params on the detail URL. The detail page reads and sanitizes those params to render a context-aware back-link (open-redirect-safe). The old school-scoped route becomes a thin 301 redirect that preserves school context. E2E helpers repoint to the surviving route.

**Tech Stack:** Nuxt 3 / Vue 3 `<script setup lang="ts">` (TS strict), Vue Router, Vitest + @vue/test-utils, Playwright.

**Spec:** design captured in this plan (bounded feature; no separate spec doc). Prior context: `docs/superpowers/specs/2026-08-14-coach-tile-unification-design.md` (Plan 1).

## Global Constraints

- TypeScript strict, **no `any`** in source (`as unknown as` in tests only). `<script setup lang="ts">`, `withDefaults(defineProps<{}>(), {})`.
- No raw hex/rgba; brand-token utilities only. `npm run audit:tokens` stays clean.
- **Open-redirect safety:** the `back` query value is untrusted. Only same-origin relative paths are allowed: must start with a single `/`, must NOT start with `//` or `/\`, must not contain a scheme (`:`) or backslash. Anything else falls back to `/coaches`.
- Every coach tile still routes to `/coaches/[id]` (now with an optional `?back=&label=` suffix). No delete affordance on tiles (unchanged from Plan 1).
- Commit after every task, conventional commits, append the trailer:

```

Claude-Session: https://claude.ai/code/session_018EuPiLCNX6XMdiKUt78oVU
```

- Verify gates before a task is done: `npm run type-check`, `npm run lint` (changed files), relevant Vitest suite, `npm run audit:tokens`.

## File Structure

| File | Responsibility |
|------|----------------|
| `utils/safeInternalPath.ts` | **NEW** pure fn: sanitize an untrusted `back` path → safe internal path or `/coaches` |
| `tests/unit/utils/safeInternalPath.spec.ts` | **NEW** unit tests (security-focused) |
| `components/Coach/CoachCard.vue` | Add `backTo?`/`backLabel?` props; encode as query on `resolvedDetailTo` |
| `tests/unit/components/CoachCard.spec.ts` | Add back-query tests |
| `pages/coaches/[id]/index.vue` | Dynamic, sanitized back-link from `?back=&label=` |
| `pages/coaches/index.vue` | Directory tiles pass `back-to="/coaches"` / `back-label="All Coaches"` |
| `pages/schools/[id]/coaches.vue` | Manage tiles pass `back-to="/schools/[id]/coaches"` / `back-label="Coaches"` |
| `components/School/SchoolSidebar.vue` | Sidebar tiles pass `back-to="/schools/[id]"` / `back-label=<school name>` |
| `pages/schools/[schoolId]/coaches/[coachId].vue` | **REPLACE** bespoke page with a thin 301 redirect carrying back context |
| `tests/e2e/pages/CoachesPage.ts`, `tests/e2e/fixtures/coaches.fixture.ts` | Repoint helpers to `/coaches/[id]` |
| `tests/e2e/tier2-important/coach-detail-backnav.spec.ts` | **NEW** redirect + back-nav E2E |

---

## Task 1: `safeInternalPath` sanitizer

**Files:**
- Create: `utils/safeInternalPath.ts`
- Test: `tests/unit/utils/safeInternalPath.spec.ts`

**Interfaces:**
- Produces: `safeInternalPath(raw: unknown, fallback?: string): string` — consumed by Task 3 (detail page).

- [ ] **Step 1: Write the failing test**

Create `tests/unit/utils/safeInternalPath.spec.ts`:

```ts
import { describe, it, expect } from "vitest";
import { safeInternalPath } from "~/utils/safeInternalPath";

describe("safeInternalPath", () => {
  it("returns a valid single-slash internal path unchanged", () => {
    expect(safeInternalPath("/schools/abc/coaches")).toBe("/schools/abc/coaches");
    expect(safeInternalPath("/coaches")).toBe("/coaches");
  });

  it("preserves an internal path's own query/hash", () => {
    expect(safeInternalPath("/schools/1/coaches?x=1")).toBe("/schools/1/coaches?x=1");
  });

  it("falls back for protocol-relative and absolute URLs (open-redirect vectors)", () => {
    expect(safeInternalPath("//evil.com")).toBe("/coaches");
    expect(safeInternalPath("https://evil.com")).toBe("/coaches");
    expect(safeInternalPath("http:/evil.com")).toBe("/coaches");
    expect(safeInternalPath("/\\evil.com")).toBe("/coaches");
  });

  it("falls back for non-slash, empty, and non-string input", () => {
    expect(safeInternalPath("coaches")).toBe("/coaches");
    expect(safeInternalPath("")).toBe("/coaches");
    expect(safeInternalPath(undefined)).toBe("/coaches");
    expect(safeInternalPath(["/a", "/b"])).toBe("/coaches");
    expect(safeInternalPath(42)).toBe("/coaches");
  });

  it("honors a custom fallback", () => {
    expect(safeInternalPath("//evil.com", "/home")).toBe("/home");
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run tests/unit/utils/safeInternalPath.spec.ts`
Expected: FAIL — cannot resolve `~/utils/safeInternalPath`.

- [ ] **Step 3: Implement**

Create `utils/safeInternalPath.ts`:

```ts
/**
 * Sanitize an untrusted "back"/redirect target into a safe same-origin path.
 * Rejects protocol-relative (`//host`), absolute (`https://`), backslash, and
 * non-slash-leading values — all open-redirect vectors — returning `fallback`.
 */
export function safeInternalPath(raw: unknown, fallback = "/coaches"): string {
  if (typeof raw !== "string" || raw.length === 0) return fallback;
  // Must start with exactly one forward slash.
  if (raw[0] !== "/") return fallback;
  // Reject protocol-relative and backslash tricks: `//`, `/\`.
  if (raw[1] === "/" || raw[1] === "\\") return fallback;
  // Reject any scheme or backslash anywhere.
  if (raw.includes(":") || raw.includes("\\")) return fallback;
  return raw;
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run tests/unit/utils/safeInternalPath.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Type-check + commit**

Run: `npm run type-check` (0 errors).

```bash
git add utils/safeInternalPath.ts tests/unit/utils/safeInternalPath.spec.ts
git commit -m "feat(coaches): add safeInternalPath sanitizer for back-nav"
```

---

## Task 2: `CoachCard` encodes back-context as query

**Files:**
- Modify: `components/Coach/CoachCard.vue`
- Test: `tests/unit/components/CoachCard.spec.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: two new optional props `backTo?: string`, `backLabel?: string`. When `backTo` is set (and no explicit `detailTo` override), `resolvedDetailTo` becomes `/coaches/${id}?back=<enc>&label=<enc>` (label omitted if unset). Consumers in Task 4 rely on this.

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/components/CoachCard.spec.ts` (reuse existing `baseCoach`, `stubs`, `mountCard`):

```ts
describe("CoachCard — back-context query", () => {
  it("appends encoded back + label query when backTo is provided", () => {
    const w = mountCard({ backTo: "/schools/s1/coaches", backLabel: "Coaches" });
    expect(w.get("a").attributes("href")).toBe(
      "/coaches/c1?back=%2Fschools%2Fs1%2Fcoaches&label=Coaches",
    );
  });

  it("omits the label param when only backTo is given", () => {
    const w = mountCard({ backTo: "/coaches" });
    expect(w.get("a").attributes("href")).toBe("/coaches/c1?back=%2Fcoaches");
  });

  it("uses the plain detail route when no backTo is provided", () => {
    const w = mountCard();
    expect(w.get("a").attributes("href")).toBe("/coaches/c1");
  });

  it("lets an explicit detailTo override win over backTo", () => {
    const w = mountCard({ detailTo: "/custom", backTo: "/coaches" });
    expect(w.get("a").attributes("href")).toBe("/custom");
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `npx vitest run tests/unit/components/CoachCard.spec.ts`
Expected: FAIL on the new block (query not built; hrefs are plain `/coaches/c1`).

- [ ] **Step 3: Implement**

In `components/Coach/CoachCard.vue`, add `backTo`/`backLabel` to the props interface (both `?: string`), then replace the `resolvedDetailTo` computed:

```ts
const resolvedDetailTo = computed(() => {
  if (props.detailTo) return props.detailTo;
  const base = `/coaches/${props.coach.id}`;
  if (!props.backTo) return base;
  const params = new URLSearchParams({ back: props.backTo });
  if (props.backLabel) params.set("label", props.backLabel);
  return `${base}?${params.toString()}`;
});
```

> Note: `URLSearchParams` encodes `/` as `%2F` and a space in the label as `+`; the tests above expect exactly that encoding. If a consumer passes a label with spaces (e.g. a school name), `+` in the query is correct and the detail page reads it back via `route.query.label` (Vue Router decodes it).

- [ ] **Step 4: Run, verify pass**

Run: `npx vitest run tests/unit/components/CoachCard.spec.ts`
Expected: PASS (all prior + 4 new).

- [ ] **Step 5: Type-check + commit**

Run: `npm run type-check` (0).

```bash
git add components/Coach/CoachCard.vue tests/unit/components/CoachCard.spec.ts
git commit -m "feat(coaches): CoachCard encodes back-context as detail query"
```

---

## Task 3: Detail page renders a sanitized, context-aware back-link

**Files:**
- Modify: `pages/coaches/[id]/index.vue`
- Test: `tests/unit/pages/coaches-id-backnav.spec.ts` (new; if the page is impractical to mount in isolation, cover the logic by testing `safeInternalPath` (Task 1) + a small extracted computed — see Step 3 note — and record that decision in the report)

**Interfaces:**
- Consumes: `safeInternalPath` (Task 1); `route.query.back`, `route.query.label`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/pages/coaches-id-backnav.spec.ts`. Because the full page has heavy composable dependencies, test the pure back-link derivation. Extract it into a tiny composable `composables/useBackLink.ts` (created in Step 3) and test that:

```ts
import { describe, it, expect } from "vitest";
import { deriveBackLink } from "~/composables/useBackLink";

describe("deriveBackLink", () => {
  it("uses sanitized back + provided label", () => {
    expect(deriveBackLink({ back: "/schools/s1/coaches", label: "Coaches" })).toEqual({
      to: "/schools/s1/coaches",
      text: "Back to Coaches",
    });
  });

  it("defaults to All Coaches when query is absent", () => {
    expect(deriveBackLink({})).toEqual({ to: "/coaches", text: "Back to All Coaches" });
  });

  it("sanitizes an open-redirect back value and falls back", () => {
    expect(deriveBackLink({ back: "//evil.com", label: "X" })).toEqual({
      to: "/coaches",
      text: "Back to X",
    });
  });

  it("ignores array-valued query (defensive)", () => {
    expect(deriveBackLink({ back: ["/a", "/b"], label: ["x"] })).toEqual({
      to: "/coaches",
      text: "Back to All Coaches",
    });
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `npx vitest run tests/unit/pages/coaches-id-backnav.spec.ts`
Expected: FAIL — cannot resolve `~/composables/useBackLink`.

- [ ] **Step 3: Implement the composable, then wire the page**

Create `composables/useBackLink.ts`:

```ts
import { safeInternalPath } from "~/utils/safeInternalPath";
import type { LocationQuery } from "vue-router";

export interface BackLink {
  to: string;
  text: string;
}

/** Derive a safe back-link from route query (`back`, `label`). */
export function deriveBackLink(query: Partial<LocationQuery>): BackLink {
  const rawBack = typeof query.back === "string" ? query.back : undefined;
  const rawLabel = typeof query.label === "string" ? query.label : undefined;
  const to = safeInternalPath(rawBack);
  const text = `Back to ${rawLabel ?? "All Coaches"}`;
  return { to, text };
}
```

Then in `pages/coaches/[id]/index.vue`:
- Import `deriveBackLink`, compute `const backLink = computed(() => deriveBackLink(route.value?.query ?? route.query));` (use the existing `route` from `useRoute()`).
- Replace the static back-link markup (currently `<NuxtLink to="/coaches" ...>Back to All Coaches</NuxtLink>`) with:

```vue
<NuxtLink
  :to="backLink.to"
  class="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
>
  <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
  {{ backLink.text }}
</NuxtLink>
```

- [ ] **Step 4: Run, verify pass**

Run: `npx vitest run tests/unit/pages/coaches-id-backnav.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Type-check + commit**

Run: `npm run type-check` (0).

```bash
git add composables/useBackLink.ts tests/unit/pages/coaches-id-backnav.spec.ts pages/coaches/[id]/index.vue
git commit -m "feat(coaches): context-aware sanitized back-link on coach detail"
```

---

## Task 4: Consumers pass back-context

**Files:**
- Modify: `pages/coaches/index.vue` (directory)
- Modify: `pages/schools/[id]/coaches.vue` (manage)
- Modify: `components/School/SchoolSidebar.vue` (sidebar)

**Interfaces:**
- Consumes: `CoachCard` `backTo`/`backLabel` (Task 2).

- [ ] **Step 1: Directory — pass list origin**

In `pages/coaches/index.vue`, on the `<CoachCard>` add:

```vue
back-to="/coaches"
back-label="All Coaches"
```

- [ ] **Step 2: Manage — pass that school's coaches origin**

In `pages/schools/[id]/coaches.vue`, on the `<CoachCard>` bind (the page has `schoolId` in scope from the route):

```vue
:back-to="`/schools/${schoolId}/coaches`"
back-label="Coaches"
```

- [ ] **Step 3: Sidebar — pass the school detail origin**

In `components/School/SchoolSidebar.vue`, on the `<CoachCard>` bind (the sidebar has `schoolId` and `school` in scope — confirm the prop names by reading the component's `<script setup>`; use the school's display name for the label):

```vue
:back-to="`/schools/${schoolId}`"
:back-label="school?.name ?? 'School'"
```

- [ ] **Step 4: Type-check + manual verify + commit**

Run: `npm run type-check` (0). Then `npm run dev` → from each surface, click a tile: URL is `/coaches/:id?back=…&label=…`; the detail page's Back link reads the right label and returns to the right place.

```bash
git add pages/coaches/index.vue pages/schools/[id]/coaches.vue components/School/SchoolSidebar.vue
git commit -m "refactor(coaches): tiles pass back-context to coach detail"
```

---

## Task 5: Replace the bespoke school-scoped page with a 301 redirect

**Files:**
- Replace contents: `pages/schools/[schoolId]/coaches/[coachId].vue`
- Test: `tests/unit/pages/schools-coach-redirect.spec.ts` (new; optional if the redirect is impractical to unit-test — the E2E in Task 6 covers it. If skipped, record why in the report.)

**Interfaces:**
- Consumes: nothing. Removes the bespoke detail implementation entirely.

- [ ] **Step 1: Replace the page with a redirect**

Overwrite `pages/schools/[schoolId]/coaches/[coachId].vue` with:

```vue
<template>
  <div />
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";

definePageMeta({ middleware: "auth" });

const route = useRoute();
const schoolId = route.params.schoolId as string;
const coachId = route.params.coachId as string;
const params = new URLSearchParams({
  back: `/schools/${schoolId}/coaches`,
  label: "Coaches",
});
await navigateTo(`/coaches/${coachId}?${params.toString()}`, {
  redirectCode: 301,
  replace: true,
});
</script>
```

> This preserves school context: users (or old bookmarks) hitting the legacy URL land on the rich detail page with a "Back to Coaches" link returning to that school's coaches list.

- [ ] **Step 2: Verify no orphaned imports/components**

Run: `git diff --stat` and confirm the file no longer imports the removed bespoke machinery (Supabase composable, edit forms, delete dialog). Grep the repo to confirm nothing imports symbols that only lived in the old page body:

```bash
grep -rn "schools/\[schoolId\]/coaches/\[coachId\]" tests/ --include="*.ts" | head
```

(Test-helper hits are handled in Task 6.)

- [ ] **Step 3: Type-check + commit**

Run: `npm run type-check` (0).

```bash
git add "pages/schools/[schoolId]/coaches/[coachId].vue"
git commit -m "refactor(coaches): redirect legacy school-scoped coach detail to /coaches/:id"
```

---

## Task 6: Repoint E2E helpers + add back-nav/redirect E2E + full gate

**Files:**
- Modify: `tests/e2e/pages/CoachesPage.ts` (`goToCoachDetail`, `goToCoachCommunications`)
- Modify: `tests/e2e/fixtures/coaches.fixture.ts` (`navigateToCoachDetail`)
- Create: `tests/e2e/tier2-important/coach-detail-backnav.spec.ts`

**Interfaces:**
- Consumes: the redirect (Task 5) and back-link (Task 3).

- [ ] **Step 1: Repoint the helpers**

In `tests/e2e/pages/CoachesPage.ts` and `tests/e2e/fixtures/coaches.fixture.ts`, change any navigation that builds `/schools/${schoolId}/coaches/${coachId}` to target `/coaches/${coachId}` directly (the detail route). Keep signatures stable if other specs call them (a `schoolId` arg may become unused — leave it or mark it optional; do not break callers). Read each helper's callers first and preserve their expectations.

- [ ] **Step 2: Add the back-nav + redirect E2E**

Create `tests/e2e/tier2-important/coach-detail-backnav.spec.ts` covering:
- Legacy URL `/schools/<id>/coaches/<coachId>` redirects to `/coaches/<coachId>` and the page shows a "Back to Coaches" link whose href is `/schools/<id>/coaches`.
- From the global `/coaches` directory, opening a tile lands on `/coaches/:id?back=%2Fcoaches&label=All+Coaches` and the Back link reads "Back to All Coaches".
Follow the existing tier2 spec conventions (seed guards, `data-action`/role selectors) used by `coaches-tile-navigation.spec.ts`. Gate on seeding like the sibling spec.

- [ ] **Step 3: Full verification gate**

Run each; all must pass:

```bash
npm run type-check      # 0
npm run lint            # 0 on changed files
npm run test            # full unit suite green (new safeInternalPath + useBackLink + CoachCard back tests included)
npm run audit:tokens    # clean
```

- [ ] **Step 4: E2E smoke**

Run: `npx playwright test tests/e2e/tier2-important/coach-detail-backnav.spec.ts tests/e2e/tier2-important/coaches-tile-navigation.spec.ts` if the environment supports it (Node 22+). If E2E can't run cleanly here, report exactly what ran and what didn't — never claim a pass you didn't observe.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/pages/CoachesPage.ts tests/e2e/fixtures/coaches.fixture.ts tests/e2e/tier2-important/coach-detail-backnav.spec.ts
git commit -m "test(coaches): repoint e2e to unified detail route + back-nav coverage"
```

---

## Self-Review

**Spec coverage:**
- Retire bespoke page → Task 5. ✓
- Single rich detail survives → no change needed (already exists); all entry points route there → Tasks 2, 4, 5. ✓
- Context-aware back (list / school-coaches / school-detail) → Tasks 2 (encode), 3 (render), 4 (per-surface origin). ✓
- Open-redirect safety → Task 1 (`safeInternalPath`), enforced in Task 3. ✓
- Legacy URL preserves school context → Task 5 redirect carries `back`+`label`. ✓
- Tests repointed + coverage → Task 6. ✓

**Placeholder scan:** No TBD/"handle edge cases"/"tests for the above" — all code and tests inline. ✓

**Type consistency:** `backTo`/`backLabel` props (Task 2) consumed with identical names in Task 4. `safeInternalPath(raw, fallback?)` (Task 1) called by `deriveBackLink` (Task 3). `deriveBackLink(query)` returns `{ to, text }` used by the page and asserted in tests. Consistent. ✓

## Notes / Follow-ups

- iOS parity (single `CoachCardView`) remains a separate deferred handoff.
- Plan 1's 3 minor cleanups (button-in-anchor, native email/text copy affordance, unused `deleteCoachAPI`/`getCoach` bindings) are still open — not part of this plan.
