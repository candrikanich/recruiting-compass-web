<template>
  <div
    class="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Page Header -->
    <div class="border-b border-slate-200 bg-white">
      <div class="mx-auto max-w-4xl px-4 py-4 sm:px-6">
        <NuxtLink
          to="/settings"
          class="mb-3 inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 hover:text-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <UIcon name="i-heroicons-arrow-left" class="h-4 w-4" />
          Back to Settings
        </NuxtLink>
        <h1 class="text-2xl font-semibold text-slate-900">Family Management</h1>
        <p class="text-slate-600">
          Manage your family and share recruiting data with family members
        </p>
      </div>
    </div>

    <main class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <!-- Error Alert -->
      <div
        v-if="error"
        class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4"
      >
        <p class="text-sm text-red-700">{{ error }}</p>
      </div>

      <!-- Success Messages -->
      <div
        v-if="familyCodeSuccess"
        class="mb-6 rounded-lg border border-green-200 bg-green-50 p-4"
      >
        <p class="text-sm text-green-700">{{ familyCodeSuccess }}</p>
      </div>

      <div
        v-if="familyCodeError"
        class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4"
      >
        <p class="text-sm text-red-700">{{ familyCodeError }}</p>
      </div>

      <!-- Family Code Section for Students -->
      <section
        v-if="isPlayer && myFamilyCode"
        class="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-xs"
      >
        <FamilyCodeDisplay
          :family-code="myFamilyCode"
          :code-generated-at="codeGeneratedAt"
          @copy="handleCopyCode"
          @regenerate="handleRegenerateCode"
        />
      </section>

      <!-- Family Members Section for Students -->
      <section
        v-if="isPlayer && myFamilyCode && familyMembers.length > 0"
        class="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-xs"
      >
        <h2 class="mb-4 text-xl font-bold text-gray-900">
          Family Members
          <span class="text-sm text-gray-600"
            >({{ familyMembers.length }})</span
          >
        </h2>

        <div v-if="loadingMembers" class="py-4 text-center">
          <p class="text-gray-500">Loading members...</p>
        </div>

        <div v-else class="space-y-3">
          <FamilyMemberCard
            v-for="member in familyMembers"
            :key="member.id"
            :member="member"
            :is-player="isPlayer"
            @remove="handleRemoveMember"
          />
        </div>
      </section>

      <!-- Join Family Section for Parents -->
      <section
        v-if="isParent"
        class="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-xs"
      >
        <FamilyCodeInput
          :loading="familyCodeLoading"
          @submit="handleJoinFamily"
        />
      </section>

      <!-- Joined Families for Parents -->
      <section
        v-if="isParent && parentFamilies.length > 0"
        class="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-xs"
      >
        <h2 class="mb-4 text-xl font-bold text-gray-900">
          My Families
          <span class="text-sm text-gray-600"
            >({{ parentFamilies.length }})</span
          >
        </h2>
        <div class="space-y-3">
          <div
            v-for="family in parentFamilies"
            :key="family.familyId"
            class="rounded-lg border border-green-200 bg-green-50 p-4"
          >
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-semibold text-green-900">
                  {{ family.familyName }}
                </h3>
                <p class="font-mono text-sm text-green-700">
                  {{ family.familyCode }}
                </p>
              </div>
              <span
                class="rounded-sm bg-green-200 px-2 py-1 text-xs text-green-800"
              >
                ✓ Joined
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Invite a Family Member -->
      <section
        class="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-xs"
        data-testid="invite-member-form"
      >
        <h2 class="mb-4 text-xl font-bold text-slate-900">
          Invite a Family Member
        </h2>
        <div class="space-y-4">
          <div>
            <label
              for="inviteMemberEmail"
              class="mb-1 block text-sm font-medium text-slate-700"
            >
              Email address
            </label>
            <input
              id="inviteMemberEmail"
              v-model="inviteEmail"
              data-testid="invite-email-input"
              type="email"
              autocomplete="email"
              placeholder="family@example.com"
              class="w-full rounded-lg border border-slate-300 px-4 py-2 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>
          <div>
            <label
              for="inviteMemberRole"
              class="mb-1 block text-sm font-medium text-slate-700"
            >
              Role
            </label>
            <select
              id="inviteMemberRole"
              v-model="inviteRole"
              data-testid="invite-role-select"
              class="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            >
              <option value="player">Player</option>
              <option value="parent">Parent</option>
            </select>
          </div>
          <button
            data-testid="send-invite-submit"
            type="button"
            :disabled="!inviteEmail || inviteLoading"
            class="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            @click="handleSendInvite"
          >
            {{ inviteLoading ? "Sending\u2026" : "Send invite" }}
          </button>
          <p v-if="inviteError" class="text-sm text-red-600">
            {{ inviteError }}
          </p>
          <p v-if="inviteSuccess" class="text-sm text-green-600">
            {{ inviteSuccess }}
          </p>
        </div>
      </section>

      <!-- Pending Invitations Section -->
      <section
        v-if="pendingInvitations.length > 0"
        class="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-xs"
      >
        <h2 class="mb-4 text-xl font-bold text-slate-900">
          Pending Invitations
          <span class="ml-1 text-sm font-normal text-slate-500">
            ({{ pendingInvitations.length }})
          </span>
        </h2>
        <div class="space-y-3">
          <FamilyPendingInviteCard
            v-for="inv in pendingInvitations"
            :key="inv.id"
            :invitation="inv"
            @revoke="revokeInvitation"
            @resend="handleResendInvitation"
          />
        </div>
      </section>

      <!-- Empty state if nothing present -->
      <div
        v-if="isParent && parentFamilies.length === 0 && !familyCodeLoading"
        class="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs"
      >
        <p class="mb-2 text-gray-500">No families joined yet</p>
        <p class="text-sm text-gray-400">
          Ask a player to share their family code above to join their family
        </p>
      </div>
    </main>

    <DesignSystemConfirmDialog
      :is-open="isRegenerateDialogOpen"
      title="Regenerate Family Code"
      message="Are you sure you want to regenerate your family code? The old code will no longer work."
      confirm-text="Regenerate"
      cancel-text="Cancel"
      variant="warning"
      @confirm="confirmRegenerateCode"
      @cancel="cancelRegenerateCode"
    />

    <DesignSystemConfirmDialog
      :is-open="isRemoveMemberDialogOpen"
      title="Remove Family Member"
      :message="`Are you sure you want to remove ${memberToRemoveName}? They will lose access to your recruiting data.`"
      confirm-text="Remove"
      cancel-text="Cancel"
      variant="danger"
      @confirm="confirmRemoveMember"
      @cancel="cancelRemoveMember"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useFamilyCode } from "~/composables/useFamilyCode";
import { useFamilyInvitations } from "~/composables/useFamilyInvitations";
import { useFamilyInvite } from "~/composables/useFamilyInvite";
import { useAppToast } from "~/composables/useAppToast";
import { useUserStore } from "~/stores/user";
import { useAuthFetch } from "~/composables/useAuthFetch";
import FamilyCodeDisplay from "~/components/Family/FamilyCodeDisplay.vue";
import FamilyCodeInput from "~/components/Family/FamilyCodeInput.vue";
import FamilyMemberCard from "~/components/Family/FamilyMemberCard.vue";
import FamilyPendingInviteCard from "~/components/Family/FamilyPendingInviteCard.vue";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

interface FamilyMember {
  id: string;
  family_unit_id: string;
  user_id: string;
  role: string;
  added_at: string;
  users: User;
}

definePageMeta({
  middleware: "auth",
});

const userStore = useUserStore();
const isPlayer = computed(() => userStore.user?.role === "player");
const isParent = computed(() => userStore.user?.role === "parent");
const { showToast } = useAppToast();

const {
  myFamilyCode,
  myFamilyId,
  parentFamilies,
  loading: familyCodeLoading,
  error: familyCodeError,
  successMessage: familyCodeSuccess,
  fetchMyCode,
  createFamily,
  joinByCode,
  regenerateCode,
  copyCodeToClipboard,
  removeFamilyMember,
} = useFamilyCode();

const {
  invitations: pendingInvitations,
  fetchInvitations,
  revokeInvitation,
  resendInvitation,
} = useFamilyInvitations();

const inviteEmail = ref("");
const inviteRole = ref<"player" | "parent">("player");
const inviteSuccess = ref<string | null>(null);

const {
  sendInvite,
  loading: inviteLoading,
  error: inviteError,
} = useFamilyInvite();

async function handleSendInvite() {
  if (!inviteEmail.value) return;
  inviteSuccess.value = null;
  const sentTo = inviteEmail.value;
  try {
    await sendInvite({ email: sentTo, role: inviteRole.value });
    inviteEmail.value = "";
    inviteSuccess.value = `Invite sent to ${sentTo}`;
    await fetchInvitations().catch(() => {});
  } catch {
    // inviteError ref from useFamilyInvite is already set by the composable
  }
}

async function handleResendInvitation(payload: {
  id: string;
  email: string;
  role: "player" | "parent";
}) {
  try {
    await resendInvitation(payload.id, payload.email, payload.role);
    showToast(`Invite resent to ${payload.email}`, "success");
  } catch {
    showToast("Failed to resend invite. Please try again.", "error");
  }
}

const codeGeneratedAt = ref<string | null>(null);
const error = ref<string | null>(null);
const familyMembers = ref<FamilyMember[]>([]);
const loadingMembers = ref(false);

const fetchFamilyMembers = async () => {
  if (!myFamilyId.value) return;
  loadingMembers.value = true;
  try {
    const { $fetchAuth } = useAuthFetch();
    const response = (await $fetchAuth(
      `/api/family/members?familyId=${myFamilyId.value}`,
    )) as {
      success: boolean;
      members: FamilyMember[];
    };
    familyMembers.value = response.members || [];
  } catch (err) {
    error.value = "Failed to load family members";
  } finally {
    loadingMembers.value = false;
  }
};

onMounted(async () => {
  await fetchMyCode();

  // Auto-create a family for any user who doesn't have one yet.
  // Parents own a family they invite the player into (mirrors onboarding/parent);
  // players get their own. Without this, a parent who skipped the onboarding
  // bootstrap has no family_members row and /api/family/invite returns 403.
  if (!myFamilyCode.value) {
    await createFamily();
    await fetchMyCode();
  }

  if (isPlayer.value && myFamilyId.value) {
    await fetchFamilyMembers();
  }

  fetchInvitations().catch(() => {});
});

const handleJoinFamily = async (code: string) => {
  await joinByCode(code);
};

const handleCopyCode = async (code: string) => {
  await copyCodeToClipboard(code);
};

const isRegenerateDialogOpen = ref(false);
const isRemoveMemberDialogOpen = ref(false);
const memberToRemoveId = ref<string | null>(null);

const memberToRemoveName = computed(() => {
  const member = familyMembers.value.find(
    (m) => m.id === memberToRemoveId.value,
  );
  return member?.users?.full_name || member?.users?.email || "this member";
});

const handleRegenerateCode = () => {
  isRegenerateDialogOpen.value = true;
};

const confirmRegenerateCode = async () => {
  isRegenerateDialogOpen.value = false;
  const success = await regenerateCode();
  if (!success) {
    showToast(
      "Something went wrong regenerating your family code. Please try again.",
      "error",
    );
  }
};

const cancelRegenerateCode = () => {
  isRegenerateDialogOpen.value = false;
};

const handleRemoveMember = (memberId: string) => {
  memberToRemoveId.value = memberId;
  isRemoveMemberDialogOpen.value = true;
};

const confirmRemoveMember = async () => {
  const memberId = memberToRemoveId.value;
  isRemoveMemberDialogOpen.value = false;
  memberToRemoveId.value = null;
  if (!memberId) return;

  const success = await removeFamilyMember(memberId);
  if (success) {
    await fetchFamilyMembers();
  } else {
    showToast(
      "Something went wrong removing this member. Please try again.",
      "error",
    );
  }
};

const cancelRemoveMember = () => {
  isRemoveMemberDialogOpen.value = false;
  memberToRemoveId.value = null;
};
</script>
