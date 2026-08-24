<template>
  <div
    v-if="isOpen"
    class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4"
  >
    <div
      class="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between border-b border-slate-300 p-6"
      >
        <h2 class="text-2xl font-bold text-slate-900">Select Template</h2>
        <button
          @click="emit('close')"
          class="text-slate-600 transition hover:text-slate-900"
          aria-label="Close"
        >
          <UIcon name="i-heroicons-x-mark" class="h-6 w-6" />
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <!-- Type Filter -->
        <div class="mb-6">
          <label class="mb-3 block text-sm font-medium text-slate-600"
            >Message Type</label
          >
          <div class="flex flex-wrap gap-2">
            <button
              v-for="t in templateTypes"
              :key="t"
              @click="selectedType = t"
              :class="[
                'rounded-lg px-4 py-2 text-sm font-medium transition',
                selectedType === t
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-50 text-slate-900 hover:bg-slate-100',
              ]"
            >
              {{ formatTypeLabel(t) }}
            </button>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loadingUnlockStatus" class="py-8 text-center">
          <div
            class="mx-auto h-8 w-8 animate-spin rounded-full border border-blue-300 border-t-blue-600"
          />
        </div>

        <!-- Templates List -->
        <div v-else class="space-y-3">
          <div
            v-if="filteredTemplates.length === 0"
            class="py-8 text-center text-slate-600"
          >
            No templates found
          </div>

          <button
            v-for="item in filteredTemplates"
            :key="item.template.id"
            @click="selectTemplate(item.template)"
            :disabled="!item.unlocked"
            :class="[
              'w-full rounded-lg p-4 text-left transition',
              item.unlocked
                ? 'cursor-pointer border border-slate-300 hover:border-blue-500 hover:bg-blue-50'
                : 'cursor-not-allowed border border-slate-200 bg-slate-50 opacity-60',
            ]"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <h3 class="font-semibold text-slate-900">
                    {{ item.template.name }}
                  </h3>
                  <span
                    v-if="item.template.is_predefined"
                    class="rounded-sm bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
                  >
                    Suggested
                  </span>
                  <span
                    v-if="!item.unlocked"
                    class="rounded-sm bg-slate-200 px-2 py-0.5 text-xs text-slate-600"
                  >
                    Locked
                  </span>
                </div>
                <p class="mt-1 text-sm text-slate-600">
                  {{ item.template.description }}
                </p>

                <!-- Missing Requirements -->
                <div
                  v-if="!item.unlocked && item.missingConditions.length > 0"
                  class="mt-2"
                >
                  <p class="text-xs font-medium text-slate-500">Required:</p>
                  <ul class="mt-1 space-y-0.5">
                    <li
                      v-for="(condition, idx) in item.missingConditions"
                      :key="idx"
                      class="flex items-center gap-1 text-xs text-slate-500"
                    >
                      <UIcon
                        name="i-heroicons-x-mark"
                        class="h-3 w-3 text-red-500"
                      />
                      {{ condition.description }}
                    </li>
                  </ul>
                </div>

                <!-- Progress Bar -->
                <div
                  v-if="
                    item.template.is_predefined && item.progressPercent < 100
                  "
                  class="mt-2"
                >
                  <div class="mb-1 text-xs text-slate-600">
                    Progress: {{ item.progressPercent }}%
                  </div>
                  <div class="h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      class="h-full bg-blue-500"
                      :style="{ width: `${item.progressPercent}%` }"
                    />
                  </div>
                </div>
              </div>

              <UIcon
                name="i-heroicons-check-circle"
                v-if="item.unlocked"
                class="mt-1 h-5 w-5 shrink-0 text-green-500"
              />
            </div>
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex gap-3 border-t border-slate-300 bg-slate-50 p-6">
        <button
          @click="emit('close')"
          class="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-900 transition hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import {
  useCommunicationTemplates,
  type TemplateWithUnlockStatus,
} from "~/composables/useCommunicationTemplates";
import type { CommunicationTemplate } from "~/types/models";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("TemplateSelector");

interface Props {
  isOpen: boolean;
  coachFirstName?: string;
  coachLastName?: string;
  schoolName?: string;
  playerName?: string;
}

defineProps<Props>();

const emit = defineEmits<{
  close: [];
  select: [template: CommunicationTemplate];
}>();

const { templates, loadTemplates, getTemplatesWithUnlockStatus } =
  useCommunicationTemplates();

const templateTypes = ["email", "message", "phone_script"] as const;
type TemplateType = (typeof templateTypes)[number];

const selectedType = ref<TemplateType>("email");
const loadingUnlockStatus = ref(false);
const templatesWithUnlock = ref<TemplateWithUnlockStatus[]>([]);

const formatTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    email: "Email",
    message: "Message",
    phone_script: "Phone Script",
  };
  return labels[type] || type;
};

const initializeTemplates = async () => {
  loadingUnlockStatus.value = true;
  try {
    await loadTemplates();
    // Get all templates (user + predefined)
    const allTemplates = templates.value;
    templatesWithUnlock.value =
      await getTemplatesWithUnlockStatus(allTemplates);
  } catch (err) {
    logger.error("Error initializing templates", err);
  } finally {
    loadingUnlockStatus.value = false;
  }
};

onMounted(initializeTemplates);

const filteredTemplates = computed(() => {
  return templatesWithUnlock.value.filter(
    (item) => item.template.type === selectedType.value,
  );
});

const selectTemplate = (template: CommunicationTemplate) => {
  emit("select", template);
  emit("close");
};
</script>
