<template>
  <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <h2 class="text-lg font-semibold text-slate-900">
        💬 Quick Communication
      </h2>
      <button
        @click="showTemplateManager = !showTemplateManager"
        class="rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
      >
        Manage Templates
      </button>
    </div>

    <!-- Coach/School Context -->
    <div
      v-if="coach"
      class="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4"
    >
      <p class="mb-1 text-sm text-slate-900">
        <span class="font-semibold"
          >{{ coach.first_name }} {{ coach.last_name }}</span
        >
        <span class="text-slate-500"> • {{ getRoleLabel(coach.role) }}</span>
      </p>
      <p v-if="schoolName" class="text-sm text-slate-600">{{ schoolName }}</p>
    </div>

    <!-- Questionnaire, intended major, why-program/why-fit, and the metric nudge
         are collected in the composer's unified "Complete your info" step. -->

    <!-- Communication Buttons -->
    <div class="mb-6 space-y-3">
      <!-- Email -->
      <div v-if="coach.email">
        <button
          @click="showEmailComposer = true"
          class="flex w-full items-center justify-between rounded-lg border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100"
            >
              <span class="text-lg">📧</span>
            </div>
            <div class="text-left">
              <p class="font-medium text-slate-900">Send Email</p>
              <p class="text-sm text-slate-500">{{ coach.email }}</p>
            </div>
          </div>
          <span class="text-slate-400">→</span>
        </button>
      </div>

      <!-- Text Message -->
      <div v-if="coach.phone">
        <button
          @click="showTextComposer = true"
          class="flex w-full items-center justify-between rounded-lg border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100"
            >
              <span class="text-lg">💬</span>
            </div>
            <div class="text-left">
              <p class="font-medium text-slate-900">Send Text</p>
              <p class="text-sm text-slate-500">
                {{ formatPhoneDisplay(coach.phone) }}
              </p>
            </div>
          </div>
          <span class="text-slate-400">→</span>
        </button>
      </div>

      <!-- Instagram DM -->
      <div v-if="coach.instagram_handle">
        <button
          @click="openInstagram"
          class="flex w-full items-center justify-between rounded-lg border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-100"
            >
              <span class="text-lg">📸</span>
            </div>
            <div class="text-left">
              <p class="font-medium text-slate-900">DM on Instagram</p>
              <p class="text-sm text-slate-500">@{{ coach.instagram_handle }}</p>
            </div>
          </div>
          <span class="text-slate-400">→</span>
        </button>
      </div>
    </div>

    <!-- Email + Text composer drawers -->
    <CommunicationMessageComposer
      v-model:open="showEmailComposer"
      v-model:log-interaction="qc.shouldLogInteraction.value"
      :channel="qc.email"
      :coach="coach"
      :can-edit-profile="qc.canEditProfile.value"
      :athlete-name="qc.athleteName.value"
    />
    <CommunicationMessageComposer
      v-model:open="showTextComposer"
      v-model:log-interaction="qc.shouldLogInteraction.value"
      :channel="qc.text"
      :coach="coach"
      :can-edit-profile="qc.canEditProfile.value"
      :athlete-name="qc.athleteName.value"
    />

    <!-- Template Manager Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showTemplateManager"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          @keydown.escape="handleCloseTemplate"
        >
          <div
            ref="templateDialogRef"
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-modal-title"
            class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
          >
            <div
              class="flex items-center justify-between border-b border-slate-200 p-6"
            >
              <h3
                id="template-modal-title"
                class="text-lg font-semibold text-slate-900"
              >
                Communication Templates
              </h3>
              <button
                @click="handleCloseTemplate"
                aria-label="Close template manager"
                class="text-2xl text-slate-500 transition hover:text-slate-900"
              >
                ×
              </button>
            </div>

            <div class="p-6">
              <p class="mb-4 text-sm text-slate-600">
                Manage your custom communication templates
              </p>
              <p class="text-center text-slate-500 py-8 text-sm">
                Template management coming in next update
              </p>
            </div>

            <div class="border-t border-slate-200 p-6">
              <button
                @click="handleCloseTemplate"
                class="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { useFocusTrap } from "~/composables/useFocusTrap";
import { useQuickCommunication } from "~/composables/useQuickCommunication";
import { formatPhoneDisplay } from "~/utils/phone";
import { getRoleLabel } from "~/utils/coachLabels";
import type { Coach, School } from "~/types/models";

interface Props {
  coach: Coach;
  /** Full selected-school row (3 of 4 call sites already bind :school); unlocks
   *  division/conference/city/state/twitter vars. Falls back to schoolName. */
  school?: Partial<School>;
  schoolName?: string;
  playerName?: string;
  highSchool?: string;
}

const props = withDefaults(defineProps<Props>(), {
  playerName: "Player Name",
  highSchool: "Your School",
});

const emit = defineEmits<{
  "interaction-logged": [{ type: string; direction: string; content: string }];
}>();

const qc = useQuickCommunication({
  coach: () => props.coach,
  school: () => props.school,
  schoolName: () => props.schoolName,
  emit,
});
qc.init();

const showEmailComposer = ref(false);
const showTextComposer = ref(false);
const showTemplateManager = ref(false);

const openInstagram = (): void => {
  window.open(`https://instagram.com/${props.coach.instagram_handle}`, "_blank");
};

// Template Manager focus trap (composer drawers own their own traps).
const templateDialogRef = ref<HTMLElement | null>(null);
const { activate: activateTemplate, deactivate: deactivateTemplate } =
  useFocusTrap(templateDialogRef);

const handleCloseTemplate = (): void => {
  deactivateTemplate();
  showTemplateManager.value = false;
};

watch(showTemplateManager, async (isOpen) => {
  if (isOpen) {
    await nextTick();
    activateTemplate();
  } else {
    deactivateTemplate();
  }
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
