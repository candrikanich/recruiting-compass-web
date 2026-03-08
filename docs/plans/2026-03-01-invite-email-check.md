# Invite Email Check Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When a user lands on `/join?token=xxx`, detect whether their invited email already has an account and route them to login-and-connect or signup-and-connect accordingly.

**Architecture:** Extend the existing invite GET endpoint to return `emailExists` and optional `prefill` data. The join page branches on `emailExists` to show a login form (email locked) or a compact inline signup form (email locked, name pre-filled from inviter-entered data). Both paths end with `accept()` then role-based onboarding navigation. New accounts skip `POST /api/family/create` since the invite accept endpoint handles family membership.

**Tech Stack:** Nuxt 3, Vue 3 `<script setup>`, Supabase admin client, Vitest + Vue Test Utils, DesignSystem/Button + DesignSystem/Input

---

### Task 1: Extend invite GET endpoint with `emailExists` + `prefill`

**Files:**
- Modify: `server/api/family/invite/[token].get.ts`
- Create: `tests/unit/server/api/family/invite/token.get.spec.ts`

**Step 1: Create the failing test**

```typescript
// tests/unit/server/api/family/invite/token.get.spec.ts
import { describe, it, expect, beforeEach, vi } from "vitest";

const mockState = {
  invitation: null as object | null,
  family: null as object | null,
  inviter: null as object | null,
  userByEmail: null as object | null,
  familyUnit: null as object | null,
};

vi.mock("~/server/utils/supabase", () => ({
  useSupabaseAdmin: vi.fn(() => ({
    from: (table: string) => ({
      select: () => ({
        eq: (col: string, _val: string) => ({
          eq: () => ({ single: () => Promise.resolve({ data: mockState.invitation }) }),
          single: () => {
            if (table === "family_invitations") return Promise.resolve({ data: mockState.invitation });
            if (table === "family_units") return Promise.resolve({ data: mockState.familyUnit });
            if (table === "users") {
              if (col === "id") return Promise.resolve({ data: mockState.inviter });
              return Promise.resolve({ data: mockState.userByEmail });
            }
            return Promise.resolve({ data: null });
          },
          maybeSingle: () => Promise.resolve({ data: mockState.userByEmail }),
        }),
      }),
    }),
  })),
}));

vi.mock("~/server/utils/logger", () => ({
  useLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
}));

vi.mock("h3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("h3")>();
  return {
    ...actual,
    getRouterParam: vi.fn(() => "test-token"),
  };
});

const { default: handler } = await import(
  "~/server/api/family/invite/[token].get"
);

const mockEvent = {} as any;

describe("GET /api/family/invite/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.invitation = {
      id: "inv-1",
      invited_email: "player@example.com",
      role: "player",
      status: "pending",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      family_unit_id: "fam-1",
      invited_by: "user-1",
    };
    mockState.family = { family_name: "The Smiths" };
    mockState.familyUnit = { family_name: "The Smiths", pending_player_details: null };
    mockState.inviter = { full_name: "Jane Smith" };
    mockState.userByEmail = null;
  });

  it("returns emailExists false when email not in users table", async () => {
    mockState.userByEmail = null;
    const result = await handler(mockEvent);
    expect(result.emailExists).toBe(false);
  });

  it("returns emailExists true when email found in users table", async () => {
    mockState.userByEmail = { id: "u-existing" };
    const result = await handler(mockEvent);
    expect(result.emailExists).toBe(true);
  });

  it("returns prefill name when role is player and pending_player_details has playerName", async () => {
    mockState.familyUnit = {
      family_name: "The Smiths",
      pending_player_details: { playerName: "Alex Johnson", graduationYear: 2026 },
    };
    const result = await handler(mockEvent);
    expect(result.prefill).toEqual({ firstName: "Alex", lastName: "Johnson" });
  });

  it("returns no prefill when role is parent", async () => {
    (mockState.invitation as any).role = "parent";
    mockState.familyUnit = {
      family_name: "The Smiths",
      pending_player_details: { playerName: "Alex Johnson" },
    };
    const result = await handler(mockEvent);
    expect(result.prefill).toBeUndefined();
  });

  it("returns no prefill when pending_player_details is null", async () => {
    mockState.familyUnit = { family_name: "The Smiths", pending_player_details: null };
    const result = await handler(mockEvent);
    expect(result.prefill).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test -- tests/unit/server/api/family/invite/token.get.spec.ts --reporter=verbose
```

Expected: FAIL — `emailExists` not returned from handler

**Step 3: Update the handler**

```typescript
// server/api/family/invite/[token].get.ts
import { defineEventHandler, getRouterParam, createError } from "h3";
import { useLogger } from "~/server/utils/logger";
import { useSupabaseAdmin } from "~/server/utils/supabase";

export default defineEventHandler(async (event) => {
  const logger = useLogger(event, "family/invite/token");
  const token = getRouterParam(event, "token");

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: "Token is required" });
  }

  const supabase = useSupabaseAdmin();

  const { data: invitation } = await supabase
    .from("family_invitations")
    .select("id, invited_email, role, status, expires_at, family_unit_id, invited_by")
    .eq("token", token)
    .single();

  if (!invitation) {
    throw createError({ statusCode: 404, statusMessage: "Invitation not found" });
  }

  if (invitation.status === "accepted") {
    throw createError({ statusCode: 409, statusMessage: "This invitation has already been accepted" });
  }

  if (new Date(invitation.expires_at) < new Date()) {
    throw createError({ statusCode: 410, statusMessage: "This invitation has expired" });
  }

  // Fetch family unit (includes pending_player_details), inviter, and email existence in parallel
  const [{ data: familyUnit }, { data: inviter }, { data: existingUser }] = await Promise.all([
    supabase
      .from("family_units")
      .select("family_name, pending_player_details")
      .eq("id", invitation.family_unit_id)
      .single(),
    supabase.from("users").select("full_name").eq("id", invitation.invited_by).single(),
    supabase.from("users").select("id").eq("email", invitation.invited_email).maybeSingle(),
  ]);

  // Build prefill from parent-entered player details (only for player invitees)
  let prefill: { firstName: string; lastName: string } | undefined;
  const pendingDetails = (familyUnit as any)?.pending_player_details;
  if (invitation.role === "player" && pendingDetails?.playerName) {
    const parts = (pendingDetails.playerName as string).trim().split(/\s+/);
    prefill = {
      firstName: parts[0] ?? "",
      lastName: parts.slice(1).join(" "),
    };
  }

  logger.info("Invitation token lookup", { invitationId: invitation.id });
  return {
    invitationId: invitation.id,
    email: invitation.invited_email,
    role: invitation.role,
    familyName: familyUnit?.family_name ?? "My Family",
    inviterName: inviter?.full_name ?? "A family member",
    emailExists: !!existingUser,
    ...(prefill ? { prefill } : {}),
  };
});
```

**Step 4: Run tests to verify they pass**

```bash
npm run test -- tests/unit/server/api/family/invite/token.get.spec.ts --reporter=verbose
```

Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add server/api/family/invite/[token].get.ts tests/unit/server/api/family/invite/token.get.spec.ts
git commit -m "feat(invite): add emailExists and prefill to invite GET endpoint"
```

---

### Task 2: Create InviteSignupForm component

**Files:**
- Create: `components/Auth/InviteSignupForm.vue`
- Create: `tests/unit/components/Auth/InviteSignupForm.spec.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/components/Auth/InviteSignupForm.spec.ts
import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import InviteSignupForm from "~/components/Auth/InviteSignupForm.vue";

const createWrapper = (props = {}) =>
  mount(InviteSignupForm, {
    props: {
      email: "player@example.com",
      loading: false,
      ...props,
    },
    global: {
      stubs: {
        DesignSystemButton: { template: "<button type='submit'><slot /></button>", props: ["loading", "type"] },
        DesignSystemInput: {
          template: '<input :data-testid="id || type" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          props: ["modelValue", "label", "type", "disabled", "id"],
          emits: ["update:modelValue"],
        },
      },
    },
  });

describe("InviteSignupForm", () => {
  it("shows email as read-only pre-filled", () => {
    const wrapper = createWrapper({ email: "test@example.com" });
    const emailInput = wrapper.find('[data-testid="invite-email"]');
    expect(emailInput.attributes("disabled")).toBeDefined();
  });

  it("pre-fills firstName and lastName when provided", () => {
    const wrapper = createWrapper({
      prefill: { firstName: "Alex", lastName: "Johnson" },
    });
    // Props flow through — check emitted values are pre-set
    expect(wrapper.html()).toContain("Alex");
  });

  it("emits submit with form data when submitted", async () => {
    const wrapper = createWrapper();
    await wrapper.find("form").trigger("submit");
    expect(wrapper.emitted("submit")).toBeTruthy();
  });

  it("shows loading state on button", () => {
    const wrapper = createWrapper({ loading: true });
    expect(wrapper.text()).toContain("Creating account");
  });

  it("emits field update events", async () => {
    const wrapper = createWrapper();
    const firstNameInput = wrapper.find('[data-testid="firstName"]');
    await firstNameInput.setValue("Sam");
    expect(wrapper.emitted("update:firstName")).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test -- tests/unit/components/Auth/InviteSignupForm.spec.ts --reporter=verbose
```

Expected: FAIL — component file not found

**Step 3: Create the component**

```vue
<!-- components/Auth/InviteSignupForm.vue -->
<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  email: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  password?: string;
  confirmPassword?: string;
  agreeToTerms?: boolean;
  loading?: boolean;
  prefill?: { firstName: string; lastName: string };
}>();

const emit = defineEmits<{
  "update:firstName": [value: string];
  "update:lastName": [value: string];
  "update:dateOfBirth": [value: string];
  "update:password": [value: string];
  "update:confirmPassword": [value: string];
  "update:agreeToTerms": [value: boolean];
  submit: [];
}>();

const maxDateOfBirth = computed(() => new Date().toISOString().split("T")[0]);
</script>

<template>
  <form class="space-y-4" @submit.prevent="emit('submit')">
    <div class="grid grid-cols-2 gap-3">
      <DesignSystemInput
        id="firstName"
        label="First Name"
        type="text"
        placeholder="First name"
        :model-value="firstName ?? prefill?.firstName ?? ''"
        :disabled="loading"
        @update:model-value="emit('update:firstName', $event as string)"
      />
      <DesignSystemInput
        id="lastName"
        label="Last Name"
        type="text"
        placeholder="Last name"
        :model-value="lastName ?? prefill?.lastName ?? ''"
        :disabled="loading"
        @update:model-value="emit('update:lastName', $event as string)"
      />
    </div>

    <div>
      <label for="invite-dob" class="block text-sm font-medium text-slate-700 mb-1.5">
        Date of Birth <span class="text-red-600">*</span>
      </label>
      <input
        id="invite-dob"
        data-testid="invite-dob"
        type="date"
        required
        :max="maxDateOfBirth"
        :value="dateOfBirth ?? ''"
        :disabled="loading"
        class="w-full px-3 py-2 text-base border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors duration-200"
        @input="emit('update:dateOfBirth', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
      <input
        data-testid="invite-email"
        type="email"
        :value="email"
        disabled
        class="w-full px-3 py-2 text-base border border-slate-300 rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed"
      />
      <p class="mt-1 text-xs text-slate-500">This is the email address your invitation was sent to.</p>
    </div>

    <DesignSystemInput
      id="password"
      label="Password"
      type="password"
      placeholder="Create a password"
      :model-value="password ?? ''"
      :disabled="loading"
      hint="8+ characters with uppercase, lowercase, and a number"
      @update:model-value="emit('update:password', $event as string)"
    />

    <DesignSystemInput
      id="confirmPassword"
      label="Confirm Password"
      type="password"
      placeholder="Confirm your password"
      :model-value="confirmPassword ?? ''"
      :disabled="loading"
      @update:model-value="emit('update:confirmPassword', $event as string)"
    />

    <div class="flex items-start gap-2">
      <input
        id="invite-terms"
        type="checkbox"
        :checked="agreeToTerms ?? false"
        :disabled="loading"
        class="mt-1 rounded-sm border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
        @change="emit('update:agreeToTerms', ($event.target as HTMLInputElement).checked)"
      />
      <label for="invite-terms" class="text-sm text-slate-600">
        I agree to the
        <NuxtLink to="/legal/terms" class="text-blue-600 hover:underline">Terms</NuxtLink>
        and
        <NuxtLink to="/legal/privacy" class="text-blue-600 hover:underline">Privacy Policy</NuxtLink>
      </label>
    </div>

    <DesignSystemButton type="submit" :loading="loading" full-width>
      {{ loading ? "Creating account..." : "Create account and connect" }}
    </DesignSystemButton>
  </form>
</template>
```

**Step 4: Run tests to verify they pass**

```bash
npm run test -- tests/unit/components/Auth/InviteSignupForm.spec.ts --reporter=verbose
```

Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add components/Auth/InviteSignupForm.vue tests/unit/components/Auth/InviteSignupForm.spec.ts
git commit -m "feat(invite): add InviteSignupForm component for new account creation"
```

---

### Task 3: Update join.vue to branch on emailExists

**Files:**
- Modify: `pages/join.vue`
- Modify: `tests/unit/pages/join.spec.ts`

**Step 1: Write the failing tests first** (add to existing spec)

In `tests/unit/pages/join.spec.ts`, add these cases to the `"valid invite"` describe block and update `createWrapper` stubs:

```typescript
// Update stubs in createWrapper to add InviteSignupForm:
stubs: {
  NuxtLink: { template: "<a><slot /></a>", props: ["to"] },
  DesignSystemButton: { template: "<button><slot /></button>", props: ["loading", "to", "variant", "color", "type", "fullWidth"] },
  DesignSystemInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ["modelValue", "label", "type", "placeholder"],
    emits: ["update:modelValue"],
  },
  InviteSignupForm: {
    template: '<form data-testid="invite-signup-form"><slot /></form>',
    props: ["email", "firstName", "lastName", "dateOfBirth", "password", "confirmPassword", "agreeToTerms", "loading", "prefill"],
    emits: ["update:firstName", "update:lastName", "update:dateOfBirth", "update:password", "update:confirmPassword", "update:agreeToTerms", "submit"],
  },
},

// New test cases:
it("shows login form when emailExists is true", async () => {
  mockFetch.mockResolvedValue({
    invitationId: "inv-123",
    email: "player@example.com",
    role: "player",
    familyName: "The Smiths",
    inviterName: "Jane Smith",
    emailExists: true,
  });
  const wrapper = createWrapper();
  await flushPromises();
  expect(wrapper.find('[data-testid="email-input"]').exists()).toBe(true);
  expect(wrapper.find('[data-testid="invite-signup-form"]').exists()).toBe(false);
});

it("shows signup form when emailExists is false", async () => {
  mockFetch.mockResolvedValue({
    invitationId: "inv-123",
    email: "player@example.com",
    role: "player",
    familyName: "The Smiths",
    inviterName: "Jane Smith",
    emailExists: false,
  });
  const wrapper = createWrapper();
  await flushPromises();
  expect(wrapper.find('[data-testid="invite-signup-form"]').exists()).toBe(true);
  expect(wrapper.find('[data-testid="email-input"]').exists()).toBe(false);
});

it("calls signup then accept then navigates to player onboarding on new account submit", async () => {
  mockFetch
    .mockResolvedValueOnce({
      invitationId: "inv-123",
      email: "player@example.com",
      role: "player",
      familyName: "The Smiths",
      inviterName: "Jane Smith",
      emailExists: false,
    })
    .mockResolvedValueOnce({ success: true, familyUnitId: "fam-1" }); // accept

  const mockSignup = vi.fn().mockResolvedValue({ data: { user: { id: "new-u-1" } } });
  vi.mocked(useAuth).mockReturnValue({ login: mockLogin, signup: mockSignup } as any);

  const wrapper = createWrapper();
  await flushPromises();
  await wrapper.find('[data-testid="invite-signup-form"]').trigger("submit");
  await flushPromises();

  expect(mockSignup).toHaveBeenCalled();
  expect(mockFetch).toHaveBeenCalledWith(
    "/api/family/invite/valid-token-123/accept",
    { method: "POST" },
  );
  expect(global.navigateTo).toHaveBeenCalledWith("/onboarding");
});

it("navigates to parent onboarding when role is parent on new account submit", async () => {
  mockFetch
    .mockResolvedValueOnce({
      invitationId: "inv-123",
      email: "parent@example.com",
      role: "parent",
      familyName: "The Smiths",
      inviterName: "Alex Smith",
      emailExists: false,
    })
    .mockResolvedValueOnce({ success: true });

  const mockSignup = vi.fn().mockResolvedValue({ data: { user: { id: "new-u-2" } } });
  vi.mocked(useAuth).mockReturnValue({ login: mockLogin, signup: mockSignup } as any);

  const wrapper = createWrapper();
  await flushPromises();
  await wrapper.find('[data-testid="invite-signup-form"]').trigger("submit");
  await flushPromises();

  expect(global.navigateTo).toHaveBeenCalledWith("/onboarding/parent");
});
```

**Step 2: Run tests to verify new ones fail**

```bash
npm run test -- tests/unit/pages/join.spec.ts --reporter=verbose
```

Expected: New tests FAIL, existing 10 PASS

**Step 3: Update join.vue**

Replace the `<script setup>` and `<template>` with the following. Key changes:
- `invite` type gains `emailExists: boolean` and `prefill?`
- Unauthenticated section branches on `invite.emailExists`
- New `signup()` function handles the create-account path (no `POST /api/family/create`)
- Onboarding redirect is role-aware

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useAuth } from "~/composables/useAuth";
import { useUserStore } from "~/stores/user";
import { useSupabase } from "~/composables/useSupabase";

definePageMeta({ auth: false })

const route = useRoute()
const token = computed(() => route.query.token as string)

const { login, signup } = useAuth()
const userStore = useUserStore()
const supabase = useSupabase()

interface InviteDetails {
  invitationId: string
  email: string
  role: 'player' | 'parent'
  familyName: string
  inviterName: string
  emailExists: boolean
  prefill?: { firstName: string; lastName: string }
}

const invite = ref<InviteDetails | null>(null)
const fetchError = ref<{ statusCode: number; statusMessage?: string } | null>(null)
const fetchStatus = ref<'pending' | 'success' | 'error' | 'declined'>('pending')

// Login form state
const loginEmail = ref('')
const loginPassword = ref('')

// Signup form state
const signupFirstName = ref('')
const signupLastName = ref('')
const signupDateOfBirth = ref('')
const signupPassword = ref('')
const signupConfirmPassword = ref('')
const signupAgreeToTerms = ref(false)

const loading = ref(false)
const declining = ref(false)
const signupError = ref<string | null>(null)

onMounted(async () => {
  if (!token.value) {
    fetchStatus.value = 'error'
    fetchError.value = { statusCode: 404, statusMessage: 'No token provided' }
    return
  }
  try {
    invite.value = await $fetch<InviteDetails>(`/api/family/invite/${token.value}`)
    fetchStatus.value = 'success'
    // Pre-fill login email from invite
    loginEmail.value = invite.value.email
  } catch (err: unknown) {
    fetchStatus.value = 'error'
    const e = err as { statusCode?: number; statusMessage?: string }
    fetchError.value = { statusCode: e?.statusCode ?? 500, statusMessage: e?.statusMessage }
  }
})

async function accept() {
  loading.value = true
  try {
    if (!userStore.isAuthenticated) {
      await login(loginEmail.value, loginPassword.value)
    }
    await $fetch(`/api/family/invite/${token.value}/accept`, { method: 'POST' })
    await navigateTo('/dashboard')
  } finally {
    loading.value = false
  }
}

async function signupAndConnect() {
  if (!invite.value) return
  signupError.value = null

  if (signupPassword.value !== signupConfirmPassword.value) {
    signupError.value = "Passwords don't match"
    return
  }

  loading.value = true
  try {
    const fullName = `${signupFirstName.value} ${signupLastName.value}`.trim()
    const authData = await signup(invite.value.email, signupPassword.value, fullName, invite.value.role)

    if (!authData?.data?.user?.id) throw new Error("Signup failed")

    // Upsert user profile
    await supabase.from("users").upsert([{
      id: authData.data.user.id,
      email: invite.value.email,
      full_name: fullName,
      role: invite.value.role,
      date_of_birth: signupDateOfBirth.value,
    }], { onConflict: "id" })

    // Accept invite (adds them to the family — no separate family creation)
    await $fetch(`/api/family/invite/${token.value}/accept`, { method: 'POST' })

    // Role-based onboarding
    await navigateTo(invite.value.role === 'parent' ? '/onboarding/parent' : '/onboarding')
  } catch (err: unknown) {
    signupError.value = err instanceof Error ? err.message : 'Could not create account'
    loading.value = false
  }
}

async function decline() {
  declining.value = true
  try {
    await $fetch(`/api/family/invite/${token.value}/decline`, { method: 'POST' })
    fetchStatus.value = 'declined'
  } finally {
    declining.value = false
  }
}
</script>

<template>
  <div class="max-w-md mx-auto py-16 px-4">
    <!-- Loading -->
    <div v-if="fetchStatus === 'pending'" data-testid="loading">
      Loading invite...
    </div>

    <!-- Declined -->
    <div v-else-if="fetchStatus === 'declined'" data-testid="invite-declined">
      <h1 class="text-xl font-semibold mb-2">Invitation declined</h1>
      <p class="text-gray-600">You've declined this invitation. No action is needed.</p>
    </div>

    <!-- Error: expired -->
    <div v-else-if="fetchError?.statusCode === 410" data-testid="error-expired">
      <h1 class="text-xl font-semibold mb-2">This invite has expired</h1>
      <p class="text-gray-600">Ask {{ invite?.inviterName ?? 'the sender' }} to send a new invite.</p>
    </div>

    <!-- Error: already accepted -->
    <div v-else-if="fetchError?.statusCode === 409" data-testid="error-accepted">
      <h1 class="text-xl font-semibold mb-2">Already connected</h1>
      <p class="text-gray-600">You're already a member of this family.</p>
      <DesignSystemButton to="/dashboard" class="mt-4">Go to dashboard</DesignSystemButton>
    </div>

    <!-- Error: not found or other -->
    <div v-else-if="fetchStatus === 'error'" data-testid="error-not-found">
      <h1 class="text-xl font-semibold mb-2">Invite not found</h1>
      <p class="text-gray-600">This link may be invalid or already used.</p>
    </div>

    <!-- Valid invite -->
    <div v-else-if="invite">
      <h1 class="text-2xl font-semibold mb-1">
        You're invited to join {{ invite.familyName }}'s recruiting journey
      </h1>
      <p class="text-gray-600 mb-6">
        {{ invite.inviterName }} has invited you as a {{ invite.role }}.
      </p>

      <!-- Authenticated: just confirm -->
      <div v-if="userStore.isAuthenticated">
        <p class="text-sm text-gray-500 mb-4">
          Connecting as {{ userStore.user?.email }}
          <span
            v-if="userStore.user?.email !== invite.email"
            class="text-amber-600 ml-1"
          >
            (invite was sent to {{ invite.email }})
          </span>
        </p>
        <div class="flex gap-3">
          <DesignSystemButton
            data-testid="connect-button"
            :loading="loading"
            @click="accept"
          >
            Connect to {{ invite.familyName }}
          </DesignSystemButton>
          <DesignSystemButton
            data-testid="decline-button"
            variant="outline"
            color="red"
            :loading="declining"
            @click="decline"
          >
            Decline
          </DesignSystemButton>
        </div>
      </div>

      <!-- Not authenticated: login or signup -->
      <div v-else>
        <!-- Email has an account: show login -->
        <div v-if="invite.emailExists">
          <p class="text-sm text-gray-500 mb-4">
            Log in to connect your account.
          </p>
          <DesignSystemInput
            v-model="loginEmail"
            data-testid="email-input"
            label="Email"
            type="email"
            :placeholder="invite.email"
            class="mb-3"
          />
          <DesignSystemInput
            v-model="loginPassword"
            data-testid="password-input"
            label="Password"
            type="password"
            class="mb-4"
          />
          <div class="flex gap-3">
            <DesignSystemButton
              data-testid="login-connect-button"
              :loading="loading"
              @click="accept"
            >
              Log in and connect
            </DesignSystemButton>
            <DesignSystemButton
              data-testid="decline-button"
              variant="outline"
              color="red"
              :loading="declining"
              @click="decline"
            >
              Decline
            </DesignSystemButton>
          </div>
        </div>

        <!-- No account yet: show signup -->
        <div v-else>
          <p class="text-sm text-gray-500 mb-4">
            Create an account to connect, or
            <NuxtLink to="/login" class="text-blue-600 hover:underline">log in instead</NuxtLink>.
          </p>
          <p v-if="signupError" class="text-sm text-red-600 mb-3" role="alert">{{ signupError }}</p>
          <InviteSignupForm
            :email="invite.email"
            :first-name="signupFirstName"
            :last-name="signupLastName"
            :date-of-birth="signupDateOfBirth"
            :password="signupPassword"
            :confirm-password="signupConfirmPassword"
            :agree-to-terms="signupAgreeToTerms"
            :loading="loading"
            :prefill="invite.prefill"
            @update:first-name="signupFirstName = $event"
            @update:last-name="signupLastName = $event"
            @update:date-of-birth="signupDateOfBirth = $event"
            @update:password="signupPassword = $event"
            @update:confirm-password="signupConfirmPassword = $event"
            @update:agree-to-terms="signupAgreeToTerms = $event"
            @submit="signupAndConnect"
          />
          <div class="mt-4">
            <DesignSystemButton
              data-testid="decline-button"
              variant="outline"
              color="red"
              :loading="declining"
              @click="decline"
            >
              Decline invitation
            </DesignSystemButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

**Step 4: Run all join tests**

```bash
npm run test -- tests/unit/pages/join.spec.ts --reporter=verbose
```

Expected: All 14 tests PASS

**Step 5: Run the full test suite to check for regressions**

```bash
npm run test -- --reporter=verbose 2>&1 | tail -10
```

Expected: All tests PASS (no regressions)

**Step 6: Commit**

```bash
git add pages/join.vue tests/unit/pages/join.spec.ts
git commit -m "feat(invite): branch join page on emailExists — login vs signup flow"
```

---

### Task 4: Type-check and lint

**Step 1: Run type-check**

```bash
npm run type-check
```

Fix any errors before proceeding. Common issue: `supabase.from("users").upsert(...)` may need a type cast — use `(supabase.from("users") as any).upsert(...)` consistent with `pages/signup.vue:276`.

**Step 2: Run lint**

```bash
npm run lint:fix
```

**Step 3: Commit if any auto-fixes applied**

```bash
git add -p
git commit -m "chore: lint fixes for invite email check feature"
```
