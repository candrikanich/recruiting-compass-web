# Inbound-Draft Unmatched School/Coach Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user reviewing an inbound-email draft (#678's `/interactions/add?draftId=` flow) prefill a new coach from the sender's info, and create a missing school without losing the draft in progress — closing issue #675's two gaps.

**Architecture:** Pure wiring on top of existing components — no new tables, no new components, no new endpoints. `AddCoachModal` gains an email field and prefill props; `InteractionForm` threads sender info to it and adds a "School not listed? Add it" link; `add.vue` supplies both from the loaded draft and reads a `schoolId` query param back; `/schools/new` gains `returnTo`/`prefillWebsite` query params so it can hand control back to `add.vue` instead of always landing on `/schools/{id}`.

**Tech Stack:** Nuxt 3 / Vue 3 `<script setup>`, TypeScript strict, Vitest + `@vue/test-utils`.

**Spec:** `docs/superpowers/specs/2026-09-09-inbound-draft-unmatched-resolution-design.md`

## Global Constraints

- No new tables, no migration, no new Vue components — only edits to existing files.
- No silent auto-create anywhere in this plan — every write is a user-initiated form submit.
- `prefillWebsite`/`returnTo` degrade gracefully to today's behavior when absent (existing `/schools/new` usage outside the draft-review flow is unaffected).
- TypeScript strict mode, no `any` outside existing `formData: any` call sites already in these files.

---

### Task 1: `AddCoachModal` — email field + sender prefill

**Files:**
- Modify: `components/Coach/AddCoachModal.vue`
- Test: `tests/unit/components/Coach/AddCoachModal.spec.ts` (new)

**Interfaces:**
- Consumes: `useCoaches().createCoach(schoolId, coachData)` (existing, unchanged signature).
- Produces: two new optional props, `senderName?: string | null` and `senderEmail?: string | null` — Task 2 (`InteractionForm`) passes these through from its own new props of the same names.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/components/Coach/AddCoachModal.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";

const createCoachMock = vi.fn();

vi.mock("~/composables/useCoaches", () => ({
  useCoaches: () => ({ createCoach: createCoachMock }),
}));

vi.mock("~/composables/useFocusTrap", () => ({
  useFocusTrap: () => ({ activate: vi.fn(), deactivate: vi.fn() }),
}));

import AddCoachModal from "~/components/Coach/AddCoachModal.vue";

describe("components/Coach/AddCoachModal.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefills first/last name and email from sender info when opened", async () => {
    const wrapper = mount(AddCoachModal, {
      props: {
        show: true,
        schoolId: "school-1",
        senderName: "Mark Royer",
        senderEmail: "mroyer@osu.edu",
      },
      global: { stubs: { Teleport: true } },
    });
    await wrapper.vm.$nextTick();

    expect((wrapper.find("#firstName").element as HTMLInputElement).value).toBe(
      "Mark",
    );
    expect((wrapper.find("#lastName").element as HTMLInputElement).value).toBe(
      "Royer",
    );
    expect((wrapper.find("#email").element as HTMLInputElement).value).toBe(
      "mroyer@osu.edu",
    );
  });

  it("submits the prefilled email as part of the new coach", async () => {
    createCoachMock.mockResolvedValue({ id: "coach-new-1" });
    const wrapper = mount(AddCoachModal, {
      props: {
        show: true,
        schoolId: "school-1",
        senderName: "Mark Royer",
        senderEmail: "mroyer@osu.edu",
      },
      global: { stubs: { Teleport: true } },
    });
    await wrapper.vm.$nextTick();

    await wrapper.find("form").trigger("submit.prevent");
    await wrapper.vm.$nextTick();

    expect(createCoachMock).toHaveBeenCalledWith(
      "school-1",
      expect.objectContaining({ email: "mroyer@osu.edu" }),
    );
  });

  it("opens empty when no sender info is provided (manual add-coach flow)", async () => {
    const wrapper = mount(AddCoachModal, {
      props: { show: true, schoolId: "school-1" },
      global: { stubs: { Teleport: true } },
    });
    await wrapper.vm.$nextTick();

    expect((wrapper.find("#firstName").element as HTMLInputElement).value).toBe(
      "",
    );
    expect((wrapper.find("#email").element as HTMLInputElement).value).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/components/Coach/AddCoachModal.spec.ts`
Expected: FAIL — no `#email` element exists yet, and `senderName`/`senderEmail` props aren't declared.

- [ ] **Step 3: Write minimal implementation**

In `components/Coach/AddCoachModal.vue`, replace the `<script setup>` block's props/state/submit/close/watch sections:

```typescript
interface Props {
  show: boolean;
  schoolId: string;
  senderName?: string | null;
  senderEmail?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  senderName: null,
  senderEmail: null,
});

const emit = defineEmits<{
  close: [];
  "coach-created": [coach: Coach];
}>();

const { createCoach } = useCoaches();

const dialogRef = ref<HTMLElement | null>(null);
const { activate, deactivate } = useFocusTrap(dialogRef);

const firstName = ref("");
const lastName = ref("");
const email = ref("");
const role = ref("assistant");
const loading = ref(false);
const error = ref<string | null>(null);

// Best-effort first/last split for prefilling from an inbound draft's sender
// name — unlike the server-side splitSenderName (matchCoachByEmail.ts) this
// never needs a non-empty fallback since both fields stay user-editable here.
function splitSenderName(senderName: string | null): { firstName: string; lastName: string } {
  const trimmed = senderName?.trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const parts = trimmed.split(/\s+/);
  if (parts.length > 1) {
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  }
  return { firstName: parts[0], lastName: "" };
}

const handleSubmit = async () => {
  error.value = null;

  if (!firstName.value.trim() || !lastName.value.trim()) {
    error.value = "First name and last name are required";
    return;
  }

  loading.value = true;

  try {
    const newCoach = await createCoach(props.schoolId, {
      school_id: props.schoolId,
      first_name: firstName.value.trim(),
      last_name: lastName.value.trim(),
      role: role.value as "head" | "assistant" | "recruiting",
      email: email.value.trim() || null,
      phone: null,
      twitter_handle: null,
      instagram_handle: null,
      notes: null,
      tags: [],
      source: null,
      last_contact_date: null,
    });

    emit("coach-created", newCoach);
    handleClose();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to create coach";
  } finally {
    loading.value = false;
  }
};

const handleClose = () => {
  firstName.value = "";
  lastName.value = "";
  email.value = "";
  role.value = "assistant";
  error.value = null;
  loading.value = false;
  deactivate();
  emit("close");
};

watch(
  () => props.show,
  async (show) => {
    if (show) {
      const prefill = splitSenderName(props.senderName);
      firstName.value = prefill.firstName;
      lastName.value = prefill.lastName;
      email.value = props.senderEmail?.trim() ?? "";
      await nextTick();
      activate();
    } else {
      deactivate();
    }
  },
);
```

Add the email field to the template, right after the Last Name field (before the Role field):

```html
              <div>
                <label
                  for="email"
                  class="block text-sm font-medium text-slate-700"
                >
                  Email (Optional)
                </label>
                <input
                  id="email"
                  v-model="email"
                  type="email"
                  :disabled="loading"
                  class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/components/Coach/AddCoachModal.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add components/Coach/AddCoachModal.vue tests/unit/components/Coach/AddCoachModal.spec.ts
git commit -m "feat: prefill add-coach modal from inbound-draft sender info"
```

---

### Task 2: `InteractionForm` — thread sender props + "Add school" link

**Files:**
- Modify: `components/Interaction/InteractionForm.vue`
- Test: `tests/unit/components/Interaction/InteractionForm.spec.ts` (new)

**Interfaces:**
- Consumes: `AddCoachModal`'s new `senderName`/`senderEmail` props (Task 1).
- Produces: three new optional `InteractionForm` props — `senderName?: string | null`, `senderEmail?: string | null`, `draftReturnTo?: string | null` — Task 3 (`add.vue`) passes these.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/components/Interaction/InteractionForm.spec.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";

vi.mock("~/composables/useFormValidation", () => ({
  useFormValidation: () => ({ fieldErrors: {} }),
}));

import InteractionForm from "~/components/Interaction/InteractionForm.vue";

const SchoolSelectStub = { name: "SchoolSelect", template: "<div />" };
const CoachSelectStub = { name: "CoachSelect", template: "<div />" };
const AddCoachModalStub = {
  name: "CoachAddCoachModal",
  props: ["show", "schoolId", "senderName", "senderEmail"],
  template: "<div />",
};
const OtherCoachModalStub = { name: "CoachOtherCoachModal", template: "<div />" };
const InterestCalibrationStub = { name: "InterestCalibration", template: "<div />" };
const FileUploadStub = { name: "FileUpload", template: "<div />" };
const NuxtLinkStub = {
  props: ["to"],
  template: '<a :href="to"><slot /></a>',
};

const GLOBAL_STUBS = {
  SchoolSelect: SchoolSelectStub,
  CoachSelect: CoachSelectStub,
  CoachAddCoachModal: AddCoachModalStub,
  CoachOtherCoachModal: OtherCoachModalStub,
  InterestCalibration: InterestCalibrationStub,
  FileUpload: FileUploadStub,
  NuxtLink: NuxtLinkStub,
};

describe("components/Interaction/InteractionForm.vue", () => {
  it("passes senderName/senderEmail through to the add-coach modal", () => {
    const wrapper = mount(InteractionForm, {
      props: {
        loading: false,
        senderName: "Mark Royer",
        senderEmail: "mroyer@osu.edu",
      },
      global: { stubs: GLOBAL_STUBS },
    });

    const modal = wrapper.findComponent(AddCoachModalStub);
    expect(modal.props("senderName")).toBe("Mark Royer");
    expect(modal.props("senderEmail")).toBe("mroyer@osu.edu");
  });

  it("shows an 'Add it' school link with returnTo + prefillWebsite when draftReturnTo is set", () => {
    const wrapper = mount(InteractionForm, {
      props: {
        loading: false,
        draftReturnTo: "/interactions/add?draftId=draft-1",
        senderEmail: "mroyer@osu.edu",
      },
      global: { stubs: GLOBAL_STUBS },
    });

    const link = wrapper.find("[data-testid='add-school-link']");
    expect(link.exists()).toBe(true);
    const href = link.attributes("href") ?? "";
    expect(href).toContain("returnTo=%2Finteractions%2Fadd%3FdraftId%3Ddraft-1");
    expect(href).toContain("prefillWebsite=https%3A%2F%2Fosu.edu");
  });

  it("hides the 'Add it' school link outside the draft-review flow", () => {
    const wrapper = mount(InteractionForm, {
      props: { loading: false },
      global: { stubs: GLOBAL_STUBS },
    });

    expect(wrapper.find("[data-testid='add-school-link']").exists()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/components/Interaction/InteractionForm.spec.ts`
Expected: FAIL — new props don't exist, link isn't rendered.

- [ ] **Step 3: Write minimal implementation**

In `components/Interaction/InteractionForm.vue`, update the `Props` interface and `withDefaults`:

```typescript
interface Props {
  loading: boolean;
  initialData?: Partial<Interaction>;
  senderName?: string | null;
  senderEmail?: string | null;
  draftReturnTo?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  initialData: undefined,
  senderName: null,
  senderEmail: null,
  draftReturnTo: null,
});
```

Add a computed for the "Add it" link href, near the other computeds:

```typescript
const addSchoolHref = computed(() => {
  if (!props.draftReturnTo) return null;
  const params = new URLSearchParams({ returnTo: props.draftReturnTo });
  const domain = props.senderEmail?.split("@")[1]?.trim();
  if (domain) params.set("prefillWebsite", `https://${domain}`);
  return `/schools/new?${params.toString()}`;
});
```

Update the `SchoolSelect` block in the template to add the link right after it:

```html
    <!-- School Selection -->
    <SchoolSelect
      v-model="form.school_id"
      :disabled="loading"
      :required="true"
      :error="fieldErrors.school_id"
    />
    <NuxtLink
      v-if="addSchoolHref"
      data-testid="add-school-link"
      :to="addSchoolHref"
      class="mt-1 inline-block text-sm text-blue-600 hover:text-blue-700 hover:underline"
    >
      School not listed? Add it
    </NuxtLink>
```

Update the `CoachAddCoachModal` usage to pass the sender props through:

```html
    <CoachAddCoachModal
      :show="showAddCoachModal"
      :school-id="form.school_id"
      :sender-name="senderName"
      :sender-email="senderEmail"
      @close="showAddCoachModal = false"
      @coach-created="handleCoachCreated"
    />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/components/Interaction/InteractionForm.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add components/Interaction/InteractionForm.vue tests/unit/components/Interaction/InteractionForm.spec.ts
git commit -m "feat: add-school link + coach-modal sender passthrough on InteractionForm"
```

---

### Task 3: `add.vue` — supply sender info, `draftReturnTo`, and honor returned `schoolId`

**Files:**
- Modify: `pages/interactions/add.vue`
- Test: `tests/unit/pages/interactions-add.spec.ts`

**Interfaces:**
- Consumes: `InteractionForm`'s new `senderName`/`senderEmail`/`draftReturnTo` props (Task 2).
- Produces: nothing new consumed by later tasks — Task 4 only needs to know the query param names `returnTo`/`schoolId`, already fixed by this plan's spec.

- [ ] **Step 1: Write the failing test**

Add these tests to `tests/unit/pages/interactions-add.spec.ts` (the file already has `vi.mock("vue-router", ...)` returning `{ query: {} }` — these new tests need a route with `draftId` and, in the second case, `schoolId` too, so give this suite a mutable query object). Replace the existing `vi.mock("vue-router", ...)` block with:

```typescript
let routeQuery: Record<string, string> = {};

vi.mock("vue-router", () => ({
  useRoute: () => ({ query: routeQuery }),
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), go: vi.fn() }),
}));
```

Add a `useInboundDrafts` mock (the page now imports it) above the `InteractionsAddPage` import:

```typescript
const fetchDraftsMock = vi.fn();
const confirmDraftMock = vi.fn();
let mockDrafts: any[] = [];

vi.mock("~/composables/useInboundDrafts", () => ({
  useInboundDrafts: () => ({
    drafts: { value: mockDrafts },
    fetchDrafts: fetchDraftsMock,
    confirmDraft: confirmDraftMock,
  }),
}));
```

In `beforeEach`, reset the new state:

```typescript
    routeQuery = {};
    mockDrafts = [];
    fetchDraftsMock.mockImplementation(async () => {});
    confirmDraftMock.mockResolvedValue(undefined);
```

Add a new `describe` block at the end of the file, before the closing `});` of the outer `describe`:

```typescript
  describe("draft review with an unmatched school", () => {
    const draft = {
      id: "draft-1",
      matched_school_id: null,
      matched_coach_id: null,
      sender_name: "Mark Royer",
      sender_email: "mroyer@osu.edu",
      subject: "Recruiting interest",
      body_text: "Hi, we're interested in your son.",
      occurred_at: new Date().toISOString(),
    };

    it("passes sender info and a draftReturnTo pointing back at this draft", async () => {
      routeQuery = { draftId: "draft-1" };
      mockDrafts = [draft];
      const wrapper = mountPage();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const form = wrapper.findComponent(InteractionFormStub);
      expect(form.props("senderName")).toBe("Mark Royer");
      expect(form.props("senderEmail")).toBe("mroyer@osu.edu");
      expect(form.props("draftReturnTo")).toBe(
        "/interactions/add?draftId=draft-1",
      );
    });

    it("overrides the draft's school with a schoolId returned from /schools/new", async () => {
      routeQuery = { draftId: "draft-1", schoolId: "school-new-1" };
      mockDrafts = [draft];
      const wrapper = mountPage();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const form = wrapper.findComponent(InteractionFormStub);
      expect((form.props("initialData") as any).school_id).toBe(
        "school-new-1",
      );
    });
  });
```

Update `InteractionFormStub`'s `props` array (near the top of the file) to accept the new props so `findComponent(...).props(...)` reads them:

```typescript
const InteractionFormStub = {
  name: "InteractionFormStub",
  props: ["loading", "initialData", "senderName", "senderEmail", "draftReturnTo"],
  emits: ["submit", "cancel"],
  template: "<div />",
};
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/pages/interactions-add.spec.ts`
Expected: FAIL — `senderName`/`senderEmail`/`draftReturnTo` props are `undefined`, and the `schoolId` override test sees the draft's `null` `matched_school_id` instead of `"school-new-1"`.

- [ ] **Step 3: Write minimal implementation**

In `pages/interactions/add.vue`, update the `initialData` computed and add the new computeds, then pass them to `InteractionForm`:

```typescript
// Prefill coach/school when arriving from a coach's "Log Interaction" action,
// or the full parsed draft when reviewing an inbound-email draft. A
// `schoolId` query param — set when returning from creating a new school via
// InteractionForm's "Add it" link (#675) — always wins over the draft's own
// matched_school_id, since it represents the user's most recent choice.
const schoolIdOverride = computed(() =>
  typeof route.query.schoolId === "string" ? route.query.schoolId : "",
);

const initialData = computed<Partial<Interaction>>(() => {
  if (draft.value) {
    return {
      school_id: schoolIdOverride.value || draft.value.matched_school_id || "",
      coach_id: draft.value.matched_coach_id,
      type: "email",
      direction: "inbound",
      subject: draft.value.subject ?? "",
      content: draft.value.body_text ?? "",
      occurred_at: draft.value.occurred_at,
    };
  }
  const coachId =
    typeof route.query.coachId === "string" ? route.query.coachId : "";
  return {
    ...(coachId ? { coach_id: coachId } : {}),
    ...(schoolIdOverride.value ? { school_id: schoolIdOverride.value } : {}),
  };
});

const senderName = computed(() => draft.value?.sender_name ?? null);
const senderEmail = computed(() => draft.value?.sender_email ?? null);
const draftReturnTo = computed(() =>
  draftId.value ? `/interactions/add?draftId=${draftId.value}` : null,
);
```

Update the template:

```html
    <InteractionForm
      :loading="loading"
      :initial-data="initialData"
      :sender-name="senderName"
      :sender-email="senderEmail"
      :draft-return-to="draftReturnTo"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/pages/interactions-add.spec.ts`
Expected: PASS (all tests, including the 4 pre-existing ones — confirm none regressed)

- [ ] **Step 5: Commit**

```bash
git add pages/interactions/add.vue tests/unit/pages/interactions-add.spec.ts
git commit -m "feat: pass draft sender info + honor returned schoolId in interaction form"
```

---

### Task 4: `/schools/new` — `returnTo` + `prefillWebsite`

**Files:**
- Modify: `pages/schools/new.vue`
- Test: `tests/unit/pages/schools-new.spec.ts` (new)

**Interfaces:**
- Consumes: nothing from earlier tasks (query param names `returnTo`/`schoolId`/`prefillWebsite` are fixed by the spec and already used by Task 2/3's link construction).
- Produces: nothing consumed by a later task — this is the last task.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/pages/schools-new.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";

let routeQuery: Record<string, string> = {};
const navigateToMock = vi.fn();
const createSchoolMock = vi.fn();
const findDuplicateMock = vi.fn(() => ({ duplicate: null, matchType: null }));

vi.mock("vue-router", () => ({
  useRoute: () => ({ query: routeQuery }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("#app", () => ({
  navigateTo: navigateToMock,
}));

vi.mock("~/composables/useSchools", () => ({
  useSchools: () => ({
    createSchool: createSchoolMock,
    findDuplicate: findDuplicateMock,
    fetchSchools: vi.fn().mockResolvedValue(undefined),
    loading: { value: false },
    error: { value: null },
  }),
}));

vi.mock("~/composables/useNcaaLookup", () => ({
  useNcaaLookup: () => ({ lookupDivision: vi.fn().mockResolvedValue(null) }),
}));

vi.mock("~/composables/useCollegeData", () => ({
  useCollegeData: () => ({
    fetchByName: vi.fn().mockResolvedValue(null),
    loading: { value: false },
    error: { value: null },
  }),
}));

vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: vi.fn().mockResolvedValue(null) }),
}));

import SchoolsNewPage from "~/pages/schools/new.vue";

const SchoolFormStub = {
  name: "SchoolForm",
  props: ["loading", "useAutocomplete", "collegeScorecardData", "initialData", "initialAutoFilledFields"],
  emits: ["submit", "collegeSelect", "cancel"],
  template: "<div />",
};

describe("pages/schools/new.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeQuery = {};
  });

  const mountPage = () =>
    mount(SchoolsNewPage, {
      global: {
        stubs: {
          FormPageLayout: { template: "<div><slot /></div>" },
          SchoolForm: SchoolFormStub,
          SchoolDuplicateDialog: true,
        },
      },
    });

  it("seeds SchoolForm's website from prefillWebsite when no college is selected", () => {
    routeQuery = { prefillWebsite: "https://osu.edu" };
    const wrapper = mountPage();

    const form = wrapper.findComponent(SchoolFormStub);
    expect((form.props("initialData") as any).website).toBe("https://osu.edu");
  });

  it("redirects to returnTo with the new schoolId on save instead of /schools/{id}", async () => {
    routeQuery = { returnTo: "/interactions/add?draftId=draft-1" };
    createSchoolMock.mockResolvedValue({ id: "school-new-1" });
    const wrapper = mountPage();
    const form = wrapper.findComponent(SchoolFormStub);

    await form.vm.$emit("submit", { name: "Ohio State", website: "https://osu.edu" });
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect(navigateToMock).toHaveBeenCalledWith(
      "/interactions/add?draftId=draft-1&schoolId=school-new-1",
    );
  });

  it("falls back to /schools/{id} when there's no returnTo", async () => {
    routeQuery = {};
    createSchoolMock.mockResolvedValue({ id: "school-new-2" });
    const wrapper = mountPage();
    const form = wrapper.findComponent(SchoolFormStub);

    await form.vm.$emit("submit", { name: "Ohio State" });
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect(navigateToMock).toHaveBeenCalledWith("/schools/school-new-2");
  });

  it("cancels back to returnTo when present", async () => {
    routeQuery = { returnTo: "/interactions/add?draftId=draft-1" };
    const wrapper = mountPage();
    const form = wrapper.findComponent(SchoolFormStub);

    await form.vm.$emit("cancel");

    expect(navigateToMock).toHaveBeenCalledWith(
      "/interactions/add?draftId=draft-1",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/pages/schools-new.spec.ts`
Expected: FAIL — `returnTo`/`prefillWebsite` aren't read yet, save always navigates to `/schools/{id}`, cancel always navigates to `/schools`.

- [ ] **Step 3: Write minimal implementation**

In `pages/schools/new.vue`, add the route import and computeds, near the top of the `<script setup>` block (after the existing imports):

```typescript
import { useRoute } from "vue-router";
```

After `const logger = createClientLogger("SchoolNew");`:

```typescript
const route = useRoute();
// Set when this page is opened from InteractionForm's "Add it" link (#675) —
// redirect back there with the new school's id instead of the default
// /schools/{id} landing, so the in-progress draft review isn't lost.
const returnTo = computed(() =>
  typeof route.query.returnTo === "string" && route.query.returnTo
    ? route.query.returnTo
    : null,
);
const prefillWebsite = computed(() =>
  typeof route.query.prefillWebsite === "string" ? route.query.prefillWebsite : "",
);
```

Update the `SchoolForm`'s `initialData` website field and the `cancel` handler in the template:

```html
    <SchoolForm
      :loading="loading"
      :useAutocomplete="useAutocomplete"
      :collegeScorecardData="collegeScorecardData"
      :initialData="{
        name: selectedCollege?.name || '',
        location: selectedCollege?.location || '',
        website: selectedCollege?.website || prefillWebsite || '',
        division: selectedCollege?.division || '',
        conference: selectedCollege?.conference || '',
        mascot: selectedCollege?.mascot || '',
        athletics_url: selectedCollege?.athletics_url || '',
        school_colors: selectedCollege?.school_colors || [],
      }"
      :initialAutoFilledFields="autoFilledFields"
      @submit="handleSchoolFormSubmit"
      @collegeSelect="handleCollegeSelect"
      @cancel="() => navigateTo(returnTo || '/schools')"
    />
```

Update `createSchoolWithData`'s success branch:

```typescript
    if (school) {
      if (returnTo.value) {
        const separator = returnTo.value.includes("?") ? "&" : "?";
        await navigateTo(`${returnTo.value}${separator}schoolId=${school.id}`);
      } else {
        await navigateTo(`/schools/${school.id}`);
      }
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/pages/schools-new.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add pages/schools/new.vue tests/unit/pages/schools-new.spec.ts
git commit -m "feat: returnTo/prefillWebsite on /schools/new for the draft-review round-trip"
```

---

### Task 5: Full-suite verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit suite**

Run: `npm test`
Expected: all tests pass, no regressions outside the four files touched above.

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: 0 errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: 0 errors on changed files.

- [ ] **Step 4: Manual browser verification**

Run `npm run dev`, sign in as a demo family (`demo tester accounts` — see project memory), open `/inbox/inbound-drafts` with a draft that has no `matched_school_id`, click Confirm, click "School not listed? Add it", confirm the website field is prefilled from the sender's domain, save, and confirm you land back on `/interactions/add?draftId=...&schoolId=...` with the new school selected and the coach picker enabled. Then open the add-coach modal and confirm name/email are prefilled from the sender.

- [ ] **Step 5: Commit (if the manual pass required fixes)**

```bash
git add -A
git commit -m "fix: address manual-verification findings for #675"
```
