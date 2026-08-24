<template>
  <!-- Invite CTA: player not yet connected -->
  <div
    v-if="showInviteCta"
    data-testid="invite-athlete-cta"
    role="region"
    aria-label="Athlete onboarding"
    class="mb-6 rounded-r-lg border-l-4 border-amber-500 bg-amber-50 p-4"
  >
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <UIcon
          name="i-heroicons-user-plus-solid"
          class="h-5 w-5 shrink-0 text-amber-600"
          aria-hidden="true"
        />
        <p class="text-sm text-amber-800">
          <strong>Connect your athlete to get started</strong> — invite them to
          join your family or share your family code.
        </p>
      </div>
      <NuxtLink
        to="/settings/family-management"
        class="shrink-0 rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-amber-700 focus:ring-2 focus:ring-amber-600 focus:ring-offset-2"
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
    class="mb-6 rounded-r-lg border-l-4 border-green-500 bg-green-50 p-4"
  >
    <div class="flex items-center gap-3">
      <UIcon
        name="i-heroicons-check-circle-solid"
        class="h-5 w-5 shrink-0 text-green-600"
        aria-hidden="true"
      />
      <p class="text-sm text-green-800">
        <strong>You're connected!</strong> Your athlete has joined your family.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, inject } from "vue";
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
  () => !loading.value && !hasConnectedPlayer.value && !acknowledged.value,
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
