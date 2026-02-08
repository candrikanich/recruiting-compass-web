<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Page Header -->
    <div class="bg-white border-b border-slate-200">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-4">
        <NuxtLink
          to="/settings"
          class="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-2"
        >
          <ArrowLeftIcon class="w-4 h-4" />
          Back to Settings
        </NuxtLink>
        <h1 class="text-2xl font-semibold text-slate-900">Family Management</h1>
        <p class="text-slate-600">
          Manage your family and share recruiting data with family members
        </p>
      </div>
    </div>

    <main class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <!-- Error Alert -->
      <div
        v-if="error"
        class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4"
      >
        <p class="text-sm text-red-700">{{ error }}</p>
      </div>

      <!-- Success Messages -->
      <div
        v-if="familyCodeSuccess"
        class="mb-6 bg-green-50 border border-green-200 rounded-lg p-4"
      >
        <p class="text-sm text-green-700">{{ familyCodeSuccess }}</p>
      </div>

      <div
        v-if="familyCodeError"
        class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4"
      >
        <p class="text-sm text-red-700">{{ familyCodeError }}</p>
      </div>

      <!-- Family Code Section for Students -->
      <section
        v-if="isPlayer && myFamilyCode"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6"
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
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6"
      >
        <h2 class="text-xl font-bold text-gray-900 mb-4">
          Family Members
          <span class="text-sm text-gray-600"
            >({{ familyMembers.length }})</span
          >
        </h2>

        <div v-if="loadingMembers" class="text-center py-4">
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
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6"
      >
        <FamilyCodeInput
          :loading="familyCodeLoading"
          @submit="handleJoinFamily"
        />
      </section>

      <!-- Joined Families for Parents -->
      <section
        v-if="isParent && parentFamilies.length > 0"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6"
      >
        <h2 class="text-xl font-bold text-gray-900 mb-4">
          My Families
          <span class="text-sm text-gray-600"
            >({{ parentFamilies.length }})</span
          >
        </h2>
        <div class="space-y-3">
          <div
            v-for="family in parentFamilies"
            :key="family.familyId"
            class="border border-green-200 bg-green-50 rounded-lg p-4"
          >
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-semibold text-green-900">
                  {{ family.familyName }}
                </h3>
                <p class="text-sm text-green-700 font-mono">
                  {{ family.familyCode }}
                </p>
              </div>
              <span
                class="px-2 py-1 bg-green-200 text-green-800 rounded text-xs"
              >
                ✓ Joined
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Empty state if nothing present -->
      <div
        v-if="isParent && parentFamilies.length === 0 && !familyCodeLoading"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center"
      >
        <p class="text-gray-500 mb-2">No families joined yet</p>
        <p class="text-sm text-gray-400">
          Ask a player to share their family code above to join their family
        </p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { ArrowLeftIcon } from "@heroicons/vue/24/outline";
import { useFamilyCode } from "~/composables/useFamilyCode";
import { useUserStore } from "~/stores/user";
import { useAuthFetch } from "~/composables/useAuthFetch";
import FamilyCodeDisplay from "~/components/Family/FamilyCodeDisplay.vue";
import FamilyCodeInput from "~/components/Family/FamilyCodeInput.vue";
import FamilyMemberCard from "~/components/Family/FamilyMemberCard.vue";

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

const {
  myFamilyCode,
  myFamilyId,
  myFamilyName,
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

const codeGeneratedAt = ref<string | null>(null);
const error = ref<string | null>(null);
const familyMembers = ref<FamilyMember[]>([]);
const loadingMembers = ref(false);

const fetchFamilyMembers = async () => {
  console.log(
    "[family-management] fetchFamilyMembers called, myFamilyId:",
    myFamilyId.value,
  );
  if (!myFamilyId.value) {
    console.log("[family-management] No family ID, returning early");
    return;
  }
  loadingMembers.value = true;
  try {
    const { $fetchAuth } = useAuthFetch();
    console.log(
      "[family-management] Fetching members for family:",
      myFamilyId.value,
    );
    const response = (await $fetchAuth(
      `/api/family/members?familyId=${myFamilyId.value}`,
    )) as {
      success: boolean;
      members: FamilyMember[];
    };
    console.log("[family-management] API response:", response);
    familyMembers.value = response.members || [];
    console.log(
      "[family-management] Set familyMembers to:",
      familyMembers.value,
    );
  } catch (err) {
    error.value = "Failed to load family members";
    console.error("fetchFamilyMembers error:", err);
  } finally {
    loadingMembers.value = false;
  }
};

onMounted(async () => {
  console.log(
    "[family-management] onMounted, isPlayer:",
    isPlayer.value,
    "myFamilyId:",
    myFamilyId.value,
  );
  await fetchMyCode();
  console.log(
    "[family-management] After fetchMyCode, isPlayer:",
    isPlayer.value,
    "myFamilyId:",
    myFamilyId.value,
  );

  // Auto-create family for students without one
  if (isPlayer.value && !myFamilyCode.value) {
    console.log("[family-management] No family found, auto-creating...");
    await createFamily();
    console.log(
      "[family-management] After auto-create, myFamilyId:",
      myFamilyId.value,
    );
  }

  if (isPlayer.value && myFamilyId.value) {
    console.log("[family-management] Calling fetchFamilyMembers");
    await fetchFamilyMembers();
  } else {
    console.log(
      "[family-management] Not fetching members - isPlayer:",
      isPlayer.value,
      "myFamilyId:",
      myFamilyId.value,
    );
  }
});

const handleJoinFamily = async (code: string) => {
  await joinByCode(code);
};

const handleCopyCode = async (code: string) => {
  await copyCodeToClipboard(code);
};

const handleRegenerateCode = async () => {
  const confirmed = confirm(
    "Are you sure you want to regenerate your family code? The old code will no longer work.",
  );
  if (confirmed) {
    await regenerateCode();
  }
};

const handleRemoveMember = async (memberId: string) => {
  const member = familyMembers.value.find((m) => m.id === memberId);
  const memberName =
    member?.users?.full_name || member?.users?.email || "this member";

  const confirmed = confirm(
    `Are you sure you want to remove ${memberName}? They will lose access to your recruiting data.`,
  );
  if (!confirmed) return;

  const success = await removeFamilyMember(memberId);
  if (success) {
    await fetchFamilyMembers();
  }
};
</script>
