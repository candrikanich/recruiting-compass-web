<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
  >
    <div
      class="rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col bg-white"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between p-6 border-b border-slate-300"
      >
        <h2 class="text-2xl font-bold text-slate-900">Select Template</h2>
        <button
          @click="emit('close')"
          class="transition text-slate-600 hover:text-slate-900"
          aria-label="Close"
        >
          <XMarkIcon class="w-6 h-6" />
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <!-- Type Filter -->
        <div class="mb-6">
          <label class="block text-sm font-medium mb-3 text-slate-600"
            >Message Type</label
          >
          <div class="flex gap-2 flex-wrap">
            <button
              v-for="t in templateTypes"
              :key="t"
              @click="selectedType = t"
              :class="[
                'px-4 py-2 rounded-lg text-sm font-medium transition',
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
        <div v-if="loadingUnlockStatus" class="text-center py-8">
          <div
            class="animate-spin rounded-full h-8 w-8 border border-blue-300 border-t-blue-600 mx-auto"
          />
        </div>

        <!-- Templates List -->
        <div v-else class="space-y-3">
          <div
            v-if="filteredTemplates.length === 0"
            class="text-center py-8 text-slate-600"
          >
            No templates found
          </div>

          <button
            v-for="item in filteredTemplates"
            :key="item.template.id"
            @click="selectTemplate(item.template)"
            :disabled="!item.unlocked"
            :class="[
              'w-full text-left p-4 rounded-lg transition',
              item.unlocked
                ? 'border border-slate-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer'
                : 'border border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed',
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
                    class="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700 font-medium"
                  >
                    Suggested
                  </span>
                  <span
                    v-if="!item.unlocked"
                    class="px-2 py-0.5 text-xs rounded bg-slate-200 text-slate-600"
                  >
                    Locked
                  </span>
                </div>
                <p class="text-sm mt-1 text-slate-600">
                  {{ item.template.description }}
                </p>

                <!-- Missing Requirements -->
                <div
                  v-if="!item.unlocked && item.missingConditions.length > 0"
                  class="mt-2"
                >
                  <p class="text-xs text-slate-500 font-medium">Required:</p>
                  <ul class="mt-1 space-y-0.5">
                    <li
                      v-for="(condition, idx) in item.missingConditions"
                      :key="idx"
                      class="text-xs text-slate-500 flex items-center gap-1"
                    >
                      <XMarkIcon class="w-3 h-3 text-red-500" />
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
                  <div class="text-xs text-slate-600 mb-1">
                    Progress: {{ item.progressPercent }}%
                  </div>
                  <div class="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-blue-500"
                      :style="{ width: `${item.progressPercent}%` }"
                    />
                  </div>
                </div>
              </div>

              <CheckCircleIcon
                v-if="item.unlocked"
                class="w-5 h-5 text-green-500 flex-shrink-0 mt-1"
              />
            </div>
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex gap-3 p-6 border-t border-slate-300 bg-slate-50">
        <button
          @click="emit('close')"
          class="flex-1 px-4 py-2 font-medium rounded-lg transition border border-slate-300 text-slate-900 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { XMarkIcon, CheckCircleIcon } from "@heroicons/vue/24/outline";
import {
  useCommunicationTemplates,
  type TemplateWithUnlockStatus,
} from "~/composables/useCommunicationTemplates";
import type { CommunicationTemplate } from "~/types/models";

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
    console.error("Error initializing templates:", err);
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
