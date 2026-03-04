# Family Connection UX Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the family connection feel real with a "You're connected!" toast on join, family code visible in the profile dropdown, and a one-time acknowledgment banner for parents when their player joins.

**Architecture:** Three isolated changes. Toast fires in `join.vue` before navigation (persists across SPA routing). Family code appears in `HeaderProfile.vue` via `useFamilyCode`. The parent banner moves its own show/hide logic internally, using localStorage for the one-time acknowledgment.

**Tech Stack:** Vue 3 Composition API, Nuxt 3, `useToast` (module-level singleton), `useFamilyCode` composable, Vitest + Vue Test Utils

---

### Task 1: "You're connected!" toast on join

**Files:**
- Modify: `pages/join.vue`
- Test: `tests/unit/pages/join.spec.ts`

**Step 1: Write the failing tests**

Add to `tests/unit/pages/join.spec.ts`. First add a `mockShowToast` to the existing mock setup block and wire up `useToast`:

```typescript
const mockShowToast = vi.fn();
vi.mock("~/composables/useToast", () => ({
  useToast: vi.fn(() => ({ showToast: mockShowToast })),
}));
global.useToast = vi.fn(() => ({ showToast: mockShowToast }));
```

Then add these two tests inside a new `describe("Connection toast")` block:

```typescript
describe("Connection toast", () => {
  it("shows connected toast when existing user accepts invite", async () => {
    mockFetch
      .mockResolvedValueOnce({
        invitationId: "inv-1",
        email: "parent@example.com",
        role: "parent",
        familyName: "Smith",
        inviterName: "Player",
        emailExists: true,
      })
      .mockResolvedValueOnce({ success: true }); // accept

    mockUserStore.isAuthenticated = true;
    mockUserStore.user.value = { id: "u1", email: "parent@example.com" };

    const wrapper = createWrapper();
    await flushPromises();

    await wrapper.find('[data-testid="connect-button"]').trigger("click");
    await flushPromises();

    expect(mockShowToast).toHaveBeenCalledWith("You're connected!", "success");
  });

  it("shows connected toast when new user signs up and accepts invite", async () => {
    mockFetch
      .mockResolvedValueOnce({
        invitationId: "inv-1",
        email: "newparent@example.com",
        role: "parent",
        familyName: "Jones",
        inviterName: "Player",
        emailExists: false,
      })
      .mockResolvedValueOnce({ success: true }); // accept

    mockSignup.mockResolvedValueOnce({ data: { user: { id: "u2" } } });
    mockUserStore.isAuthenticated = false;
    mockUserStore.user.value = null;

    const wrapper = createWrapper();
    await flushPromises();

    // Fill required signup fields
    const inputs = wrapper.findAll("input");
    await inputs[1].setValue("Jane"); // first name
    await inputs[2].setValue("Doe");  // last name
    await inputs[3].setValue("password123");
    await inputs[4].setValue("password123");
    await wrapper.find('[data-testid="invite-signup-form"]').trigger("submit");
    await flushPromises();

    expect(mockShowToast).toHaveBeenCalledWith("You're connected!", "success");
  });
});
```

**Step 2: Run tests to confirm they fail**

```bash
npm run test -- --run tests/unit/pages/join.spec.ts
```
Expected: 2 new tests fail with `mockShowToast not called`

**Step 3: Implement**

In `pages/join.vue`, add to the `<script setup>` imports:

```typescript
const { showToast } = useToast();
```

In `accept()`, add the toast before `navigateTo`:

```typescript
async function accept() {
  loginError.value = null;
  loading.value = true;
  try {
    if (!userStore.isAuthenticated) {
      await login(loginEmail.value, loginPassword.value);
    }
    await $fetchAuth(`/api/family/invite/${token.value}/accept`, { method: "POST" });
    showToast("You're connected!", "success");
    await navigateTo("/dashboard");
  } catch (err: unknown) {
    loginError.value = err instanceof Error ? err.message : "Login failed. Please check your credentials.";
  } finally {
    loading.value = false;
  }
}
```

In `signupAndConnect()`, add the toast before each `navigateTo`:

```typescript
    await $fetchAuth(`/api/family/invite/${token.value}/accept`, { method: "POST" });
    showToast("You're connected!", "success");
    if (invite.value.role === "parent") {
      await navigateTo("/onboarding/parent");
    } else {
      // ... existing query param logic
      await navigateTo(Object.keys(query).length ? { path: "/onboarding", query } : "/onboarding");
    }
```

**Step 4: Run tests**

```bash
npm run test -- --run tests/unit/pages/join.spec.ts
```
Expected: all tests pass

**Step 5: Commit**

```bash
git add pages/join.vue tests/unit/pages/join.spec.ts
git commit -m "feat: show connected toast when joining family via invite"
```

---

### Task 2: Family code in profile dropdown

**Files:**
- Modify: `components/Header/HeaderProfile.vue`
- Create: `tests/unit/components/Header/HeaderProfile.spec.ts`

**Step 1: Write the failing tests**

Create `tests/unit/components/Header/HeaderProfile.spec.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import HeaderProfile from "~/components/Header/HeaderProfile.vue";

const mockFamilyCode = ref<string | null>(null);
const mockFetchMyCode = vi.fn();

vi.mock("~/composables/useFamilyCode", () => ({
  useFamilyCode: vi.fn(() => ({
    myFamilyCode: mockFamilyCode,
    fetchMyCode: mockFetchMyCode,
    createFamily: vi.fn(),
  })),
}));

const mockUser = ref({ id: "u1", email: "test@example.com", full_name: "Test User", role: "player" });
vi.mock("~/stores/user", () => ({
  useUserStore: vi.fn(() => ({ user: mockUser, isAuthenticated: true })),
}));
vi.mock("~/composables/useAuth", () => ({
  useAuth: vi.fn(() => ({ logout: vi.fn() })),
}));

global.navigateTo = vi.fn();
global.useUserStore = vi.fn(() => ({ user: mockUser, isAuthenticated: true }));
global.useFamilyCode = vi.fn(() => ({
  myFamilyCode: mockFamilyCode,
  fetchMyCode: mockFetchMyCode,
  createFamily: vi.fn(),
}));

const createWrapper = () =>
  mount(HeaderProfile, {
    global: {
      stubs: { NuxtLink: { template: "<a><slot /></a>", props: ["to"] } },
    },
  });

describe("HeaderProfile", () => {
  beforeEach(() => {
    mockFamilyCode.value = null;
    mockFetchMyCode.mockReset();
  });

  it("calls fetchMyCode on mount", async () => {
    createWrapper();
    await flushPromises();
    expect(mockFetchMyCode).toHaveBeenCalledOnce();
  });

  it("shows family code in dropdown when available", async () => {
    mockFamilyCode.value = "FAM-ABC123";
    const wrapper = createWrapper();
    await wrapper.find('[data-testid="profile-menu"]').trigger("click");
    await flushPromises();
    expect(wrapper.find('[data-testid="family-code"]').text()).toContain("FAM-ABC123");
  });

  it("hides family code section when code is null", async () => {
    mockFamilyCode.value = null;
    const wrapper = createWrapper();
    await wrapper.find('[data-testid="profile-menu"]').trigger("click");
    await flushPromises();
    expect(wrapper.find('[data-testid="family-code"]').exists()).toBe(false);
  });
});
```

**Step 2: Run tests to confirm they fail**

```bash
npm run test -- --run tests/unit/components/Header/HeaderProfile.spec.ts
```
Expected: all 3 fail

**Step 3: Implement**

In `components/Header/HeaderProfile.vue`, add to `<script setup>`:

```typescript
import { ref, computed, nextTick, onMounted } from "vue";
import { useUserStore } from "~/stores/user";
import { useAuth } from "~/composables/useAuth";
import { useFamilyCode } from "~/composables/useFamilyCode";

const { myFamilyCode, fetchMyCode } = useFamilyCode();
const codeCopied = ref(false);

onMounted(() => {
  fetchMyCode().catch(() => {});
});

async function copyFamilyCode() {
  if (!myFamilyCode.value) return;
  await navigator.clipboard.writeText(myFamilyCode.value);
  codeCopied.value = true;
  setTimeout(() => { codeCopied.value = false; }, 2000);
}
```

In the template, add this block immediately after the `<!-- User Info -->` section (after the closing `</div>` at line 70, before `<!-- Menu Items -->`):

```html
<!-- Family Code -->
<div
  v-if="myFamilyCode"
  class="px-4 py-2 border-b border-slate-200"
>
  <p class="text-xs text-slate-400 mb-1">Family code</p>
  <div class="flex items-center gap-2">
    <span
      data-testid="family-code"
      class="font-mono text-xs font-semibold text-slate-700 tracking-widest"
    >{{ myFamilyCode }}</span>
    <button
      type="button"
      :title="codeCopied ? 'Copied!' : 'Copy'"
      class="text-slate-400 hover:text-slate-600 transition-colors"
      @click.stop="copyFamilyCode"
    >
      <svg v-if="!codeCopied" xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </button>
  </div>
</div>
```

**Step 4: Run tests**

```bash
npm run test -- --run tests/unit/components/Header/HeaderProfile.spec.ts
```
Expected: all 3 pass

**Step 5: Commit**

```bash
git add components/Header/HeaderProfile.vue tests/unit/components/Header/HeaderProfile.spec.ts
git commit -m "feat: show family code in profile dropdown"
```

---

### Task 3: Parent banner — one-time connection acknowledgment

**Files:**
- Modify: `components/Dashboard/ParentOnboardingBanner.vue`
- Modify: `pages/dashboard.vue`
- Create: `tests/unit/components/Dashboard/ParentOnboardingBanner.spec.ts`

**Context:** The banner currently has no logic — it's a pure presentational component controlled entirely by `dashboard.vue`. We're moving the show/hide logic into the banner itself so it can handle the one-time acknowledgment transition.

**Step 1: Write the failing tests**

Create `tests/unit/components/Dashboard/ParentOnboardingBanner.spec.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import ParentOnboardingBanner from "~/components/Dashboard/ParentOnboardingBanner.vue";

// Mock family context
const mockFamilies = ref<unknown[]>([]);
const mockLoading = ref(false);

vi.mock("~/composables/useFamilyContext", () => ({
  useFamilyContext: vi.fn(() => ({
    parentAccessibleFamilies: mockFamilies,
    loading: mockLoading,
  })),
}));
global.useFamilyContext = vi.fn(() => ({
  parentAccessibleFamilies: mockFamilies,
  loading: mockLoading,
}));

// Mock userStore
const mockUserId = ref("user-123");
vi.mock("~/stores/user", () => ({
  useUserStore: vi.fn(() => ({ user: { id: mockUserId.value } })),
}));
global.useUserStore = vi.fn(() => ({ user: { id: mockUserId.value } }));

// Mock inject (not provided in unit tests)
vi.mock("vue", async (importOriginal) => {
  const vue = await importOriginal<typeof import("vue")>();
  return { ...vue, inject: vi.fn(() => undefined) };
});

const createWrapper = () =>
  mount(ParentOnboardingBanner, {
    global: {
      stubs: { NuxtLink: { template: "<a><slot /></a>", props: ["to"] } },
    },
  });

describe("ParentOnboardingBanner", () => {
  beforeEach(() => {
    mockFamilies.value = [];
    mockLoading.value = false;
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows invite CTA when no family members", async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-testid="invite-athlete-cta"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="connected-state"]').exists()).toBe(false);
  });

  it("shows connected state on first view after player joins", async () => {
    const wrapper = createWrapper();
    await flushPromises();

    mockFamilies.value = [{ id: "fam-1" }];
    await flushPromises();

    expect(wrapper.find('[data-testid="connected-state"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="invite-athlete-cta"]').exists()).toBe(false);
  });

  it("sets localStorage flag when showing connected state", async () => {
    const wrapper = createWrapper();
    await flushPromises();

    mockFamilies.value = [{ id: "fam-1" }];
    await flushPromises();

    expect(localStorage.getItem("family_connected_ack_user-123")).toBe("true");
  });

  it("hides entirely after connected state timeout", async () => {
    const wrapper = createWrapper();
    await flushPromises();

    mockFamilies.value = [{ id: "fam-1" }];
    await flushPromises();

    expect(wrapper.find('[data-testid="connected-state"]').exists()).toBe(true);

    vi.advanceTimersByTime(3000);
    await flushPromises();

    // Banner renders nothing after acknowledgment
    expect(wrapper.find('[data-testid="connected-state"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="invite-athlete-cta"]').exists()).toBe(false);
  });

  it("stays hidden on mount when already acknowledged", async () => {
    localStorage.setItem("family_connected_ack_user-123", "true");
    mockFamilies.value = [{ id: "fam-1" }];

    const wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.find('[data-testid="invite-athlete-cta"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="connected-state"]').exists()).toBe(false);
  });
});
```

**Step 2: Run tests to confirm they fail**

```bash
npm run test -- --run tests/unit/components/Dashboard/ParentOnboardingBanner.spec.ts
```
Expected: all 5 fail

**Step 3: Rewrite ParentOnboardingBanner.vue**

Replace the entire file content:

```vue
<template>
  <!-- Invite CTA: player not yet connected -->
  <div
    v-if="showInviteCta"
    data-testid="invite-athlete-cta"
    role="region"
    aria-label="Athlete onboarding"
    class="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg mb-6"
  >
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div class="flex items-center gap-3">
        <UserPlusIcon class="w-5 h-5 text-amber-600 shrink-0" aria-hidden="true" />
        <p class="text-sm text-amber-800">
          <strong>Connect your athlete to get started</strong> —
          invite them to join your family or share your family code.
        </p>
      </div>
      <NuxtLink
        to="/settings/family-management"
        class="shrink-0 px-4 py-1.5 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-amber-600"
      >
        Invite Athlete <span aria-hidden="true">→</span>
      </NuxtLink>
    </div>
  </div>

  <!-- Connected state: shown briefly on first view after player joins -->
  <div
    v-else-if="showConnected"
    data-testid="connected-state"
    role="status"
    aria-live="polite"
    class="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg mb-6"
  >
    <div class="flex items-center gap-3">
      <CheckCircleIcon class="w-5 h-5 text-green-600 shrink-0" aria-hidden="true" />
      <p class="text-sm text-green-800">
        <strong>You're connected!</strong> Your athlete has joined your family.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, inject } from "vue";
import { UserPlusIcon, CheckCircleIcon } from "@heroicons/vue/24/solid";
import type { UseActiveFamilyReturn } from "~/composables/useActiveFamily";

const userStore = useUserStore();

const activeFamily =
  inject<UseActiveFamilyReturn>("activeFamily") || useFamilyContext();
const { parentAccessibleFamilies, loading } = activeFamily;

const acknowledged = ref(false);
const showConnected = ref(false);

const ackKey = () => `family_connected_ack_${userStore.user?.id}`;

const showInviteCta = computed(
  () => !loading.value && parentAccessibleFamilies.value.length === 0 && !acknowledged.value,
);

onMounted(() => {
  acknowledged.value = !!localStorage.getItem(ackKey());
});

watch(
  parentAccessibleFamilies,
  (families) => {
    if (families.length > 0 && !acknowledged.value) {
      showConnected.value = true;
      localStorage.setItem(ackKey(), "true");
      acknowledged.value = true;
      setTimeout(() => {
        showConnected.value = false;
      }, 3000);
    }
  },
);
</script>
```

**Step 4: Update dashboard.vue**

Change line 31 from:
```html
<ParentOnboardingBanner v-if="showParentOnboarding" />
```
to:
```html
<ParentOnboardingBanner v-if="userStore.isParent" />
```

Then remove the `showParentOnboarding` computed (lines 271–276) from `<script setup>` since the banner now owns that logic:

```typescript
// DELETE these lines:
const showParentOnboarding = computed(
  () =>
    userStore.isParent &&
    !activeFamily.loading.value &&
    parentAccessibleFamilies.value.length === 0,
);
```

**Step 5: Run tests**

```bash
npm run test -- --run tests/unit/components/Dashboard/ParentOnboardingBanner.spec.ts
```
Expected: all 5 pass

**Step 6: Run full test suite**

```bash
npm run test -- --run
```
Expected: all tests pass (dashboard.vue tests should still pass since `showParentOnboarding` removal only affects internal logic)

**Step 7: Commit**

```bash
git add components/Dashboard/ParentOnboardingBanner.vue pages/dashboard.vue tests/unit/components/Dashboard/ParentOnboardingBanner.spec.ts
git commit -m "feat: parent banner acknowledges player connection once and hides permanently"
```

---

### Task 4: Verify end-to-end

**Step 1: Type-check**

```bash
npm run type-check
```
Expected: 0 errors

**Step 2: Lint**

```bash
npm run lint
```
Expected: 0 errors

**Step 3: Full test suite**

```bash
npm run test -- --run
```
Expected: all tests pass

**Step 4: Manual smoke test**

1. Sign up as a parent → complete onboarding → confirm `ParentOnboardingBanner` shows "Connect your athlete"
2. Sign up as a player via invite link → confirm toast "You're connected!" appears on landing page
3. Return to parent dashboard → confirm banner briefly shows "You're connected!" then disappears
4. Refresh parent dashboard → confirm banner is gone permanently
5. Open profile dropdown → confirm family code is visible with copy button

**Step 5: Final commit if any cleanup needed**

```bash
git add -p
git commit -m "chore: cleanup after family connection UX"
```
