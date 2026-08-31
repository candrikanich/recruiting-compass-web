<template>
  <div
    class="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Page Header -->
    <div class="border-b border-slate-200 bg-white">
      <div class="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        <NuxtLink
          to="/settings"
          class="mb-3 inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 hover:text-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <UIcon name="i-heroicons-arrow-left" class="h-4 w-4" />
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

    <main class="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <!-- Tabs -->
      <div class="mb-8 flex gap-4">
        <button
          @click="activeTab = 'list'"
          :class="[
            'rounded-lg px-4 py-2 font-medium transition',
            activeTab === 'list'
              ? 'bg-blue-600 text-white'
              : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
          ]"
        >
          My Templates ({{ templates.length }})
        </button>
        <button
          @click="activeTab = 'create'"
          :class="[
            'rounded-lg px-4 py-2 font-medium transition',
            activeTab === 'create'
              ? 'bg-blue-600 text-white'
              : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
          ]"
        >
          Create New
        </button>
      </div>

      <!-- Templates List Tab -->
      <div v-if="activeTab === 'list'" class="space-y-6">
        <!-- Filter by Type -->
        <div class="flex flex-wrap gap-2">
          <button
            @click="filterType = null"
            :class="[
              'rounded-lg px-4 py-2 text-sm font-medium transition',
              filterType === null
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
            ]"
          >
            All Types ({{ templates.length }})
          </button>
          <button
            v-for="type in templateTypes"
            :key="type"
            @click="filterType = type"
            :class="[
              'rounded-lg px-4 py-2 text-sm font-medium transition',
              filterType === type
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
            ]"
          >
            {{ typeLabel(type) }}
            ({{
              templates.filter((t: CommunicationTemplate) => t.type === type)
                .length
            }})
          </button>
        </div>

        <!-- Empty State -->
        <DesignSystemEmptyState
          v-if="filteredTemplates.length === 0"
          title="No templates found"
          description="Ready-to-send emails personalized with your recruiting data"
        >
          <template #icon>
            <UIcon name="i-heroicons-document-text" class="h-8 w-8 text-brand-slate-400" />
          </template>
          <template #action>
            <DesignSystemButton color="blue" variant="solid" @click="filterType = null">
              Browse Coach Outreach Templates
            </DesignSystemButton>
          </template>
        </DesignSystemEmptyState>

        <!-- Templates Grid -->
        <div v-if="filteredTemplates.length > 0" class="grid gap-4">
          <div
            v-for="template in filteredTemplates"
            :key="template.id"
            class="rounded-lg bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <div class="mb-3 flex items-start justify-between">
              <div class="flex-1">
                <h3 class="font-bold text-gray-900">{{ template.name }}</h3>
                <p class="mt-1 text-xs text-gray-500">
                  {{ typeLabel(template.type) }}
                  {{
                    template.created_at
                      ? ` • ${formatDate(template.created_at)}`
                      : ""
                  }}
                </p>
              </div>
              <button
                @click="editTemplate(template)"
                class="rounded-sm bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                Edit
              </button>
            </div>
            <p class="line-clamp-3 text-sm text-gray-700">
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
import { useCommunicationTemplates } from "~/composables/useCommunicationTemplates";
import type { CommunicationTemplate } from "~/composables/useCommunicationTemplates";

definePageMeta({
  middleware: "auth",
});

const { templates, loadUserTemplates } = useCommunicationTemplates();

const templateTypes = ["email", "message", "phone_script", "social"] as const;
type TemplateType = (typeof templateTypes)[number];

const TYPE_LABELS: Record<string, string> = {
  email: "Email",
  message: "Text",
  phone_script: "Phone Script",
  social: "Social",
};

const typeLabel = (type: string): string =>
  TYPE_LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1);

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

const onTemplateSaved = async () => {
  editingTemplate.value = null;
  activeTab.value = "list";
  // TemplateEditor mutates its own useCommunicationTemplates() instance, so the
  // page's list ref is stale after a create/edit — refetch to surface the row.
  await loadUserTemplates();
};

const onEditCancel = () => {
  editingTemplate.value = null;
  if (templates.value.length > 0) {
    activeTab.value = "list";
  }
};

const onTemplateDeleted = async () => {
  editingTemplate.value = null;
  activeTab.value = "list";
  await loadUserTemplates();
};

onMounted(() => {
  loadUserTemplates();
});
</script>
