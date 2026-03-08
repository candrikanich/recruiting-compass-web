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
import { ref, computed, watch, onUnmounted, inject } from "vue";
import { UserPlusIcon, CheckCircleIcon } from "@heroicons/vue/24/solid";
import type { UseActiveFamilyReturn } from "~/composables/useActiveFamily";

const userStore = useUserStore();
const activeFamily =
  inject<UseActiveFamilyReturn>("activeFamily") || useFamilyContext();
const { parentAccessibleFamilies, loading } = activeFamily;

const ackKey = () => `family_connected_ack_${userStore.user?.id}`;

const acknowledged = ref(
  typeof window !== "undefined" ? !!localStorage.getItem(ackKey()) : false,
);
const showConnected = ref(false);

const hasConnectedPlayer = computed(() =>
  parentAccessibleFamilies.value.some((f) => f.athleteId !== null),
);

const showInviteCta = computed(
  () =>
    !loading.value &&
    !hasConnectedPlayer.value &&
    !acknowledged.value,
);

let timeoutId: ReturnType<typeof setTimeout> | null = null;

watch(hasConnectedPlayer, (connected) => {
  if (connected && !acknowledged.value) {
    showConnected.value = true;
    localStorage.setItem(ackKey(), "true");
    acknowledged.value = true;
    timeoutId = setTimeout(() => {
      showConnected.value = false;
    }, 3000);
  }
});

onUnmounted(() => {
  if (timeoutId !== null) clearTimeout(timeoutId);
});
</script>
