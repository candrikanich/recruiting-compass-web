<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Page Header -->
    <div class="bg-white border-b border-slate-200">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-4">
        <NuxtLink
          to="/settings"
          class="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <ArrowLeftIcon class="w-4 h-4" />
          Back to Settings
        </NuxtLink>
        <h1 class="text-2xl font-semibold text-slate-900">
          Communication Templates
        </h1>
        <p class="text-slate-600">
          Create and manage email, text, and social media templates
        </p>
      </div>
    </div>

    <main class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <!-- Tabs -->
      <div class="flex gap-4 mb-8">
        <button
          @click="activeTab = 'list'"
          :class="[
            'px-4 py-2 font-medium rounded-lg transition',
            activeTab === 'list'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
          ]"
        >
          My Templates ({{ templates.length }})
        </button>
        <button
          @click="activeTab = 'create'"
          :class="[
            'px-4 py-2 font-medium rounded-lg transition',
            activeTab === 'create'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
          ]"
        >
          Create New
        </button>
      </div>

      <!-- Templates List Tab -->
      <div v-if="activeTab === 'list'" class="space-y-6">
        <!-- Filter by Type -->
        <div class="flex gap-2 flex-wrap">
          <button
            @click="filterType = null"
            :class="[
              'px-4 py-2 rounded-lg text-sm font-medium transition',
              filterType === null
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
            ]"
          >
            All Types ({{ templates.length }})
          </button>
          <button
            v-for="type in templateTypes"
            :key="type"
            @click="filterType = type"
            :class="[
              'px-4 py-2 rounded-lg text-sm font-medium transition',
              filterType === type
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
            ]"
          >
            {{ type.charAt(0).toUpperCase() + type.slice(1) }}
            ({{
              templates.filter((t: CommunicationTemplate) => t.type === type)
                .length
            }})
          </button>
        </div>

        <!-- Empty State -->
        <div
          v-if="filteredTemplates.length === 0"
          class="bg-white rounded-lg shadow p-8 text-center"
        >
          <p class="text-gray-600">No templates found</p>
        </div>

        <!-- Templates Grid -->
        <div v-if="filteredTemplates.length > 0" class="grid gap-4">
          <div
            v-for="template in filteredTemplates"
            :key="template.id"
            class="bg-white rounded-lg shadow p-6 hover:shadow-md transition"
          >
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1">
                <h3 class="font-bold text-gray-900">{{ template.name }}</h3>
                <p class="text-xs text-gray-500 mt-1">
                  {{
                    template.type.charAt(0).toUpperCase() +
                    template.type.slice(1)
                  }}
                  {{
                    template.created_at
                      ? ` • ${formatDate(template.created_at)}`
                      : ""
                  }}
                </p>
              </div>
              <button
                @click="editTemplate(template)"
                class="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded hover:bg-blue-100 transition"
              >
                Edit
              </button>
            </div>
            <p class="text-sm text-gray-700 line-clamp-3">
              {{ template.body }}
            </p>
          </div>
        </div>
      </div>

      <!-- Create/Edit Template Tab -->
      <div v-if="activeTab === 'create' || editingTemplate">
        <TemplateEditor
          :template="editingTemplate || undefined"
          @save="onTemplateSaved"
          @cancel="onEditCancel"
          @delete="onTemplateDeleted"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { ArrowLeftIcon } from "@heroicons/vue/24/outline";
import { useCommunicationTemplates } from "~/composables/useCommunicationTemplates";
import type { CommunicationTemplate } from "~/composables/useCommunicationTemplates";

definePageMeta({
  middleware: "auth",
});

const { templates, loadUserTemplates } = useCommunicationTemplates();

const templateTypes = ["email", "text", "twitter"] as const;
type TemplateType = (typeof templateTypes)[number];

const activeTab = ref<"list" | "create">("list");
const filterType = ref<TemplateType | null>(null);
const editingTemplate = ref<CommunicationTemplate | null>(null);

const filteredTemplates = computed(() => {
  if (filterType.value === null) {
    return templates.value;
  }
  return templates.value.filter(
    (t: CommunicationTemplate) => t.type === filterType.value,
  );
});

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const editTemplate = (template: CommunicationTemplate) => {
  editingTemplate.value = template;
  activeTab.value = "create";
};

const onTemplateSaved = () => {
  editingTemplate.value = null;
  activeTab.value = "list";
};

const onEditCancel = () => {
  editingTemplate.value = null;
  if (templates.value.length > 0) {
    activeTab.value = "list";
  }
};

const onTemplateDeleted = () => {
  editingTemplate.value = null;
  activeTab.value = "list";
};

onMounted(() => {
  loadUserTemplates();
});
</script>
