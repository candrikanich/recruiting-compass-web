<template>
  <div class="rounded-lg bg-white p-6 shadow-sm">
    <!-- Header -->
    <h2 class="mb-6 text-2xl font-bold text-slate-900">
      {{ headerTitle }}
    </h2>

    <!-- Predefined copy note -->
    <div
      v-if="isCustomizingPredefined"
      class="mb-6 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800"
    >
      <span aria-hidden="true">📄</span>
      <span>
        You're customizing a copy — the built-in template stays unchanged. Save
        creates your own editable version.
      </span>
    </div>

    <form @submit.prevent="saveTemplate" class="space-y-6">
      <!-- Template Name -->
      <div>
        <label class="mb-2 block text-sm font-medium text-slate-600"
          >Template Name</label
        >
        <input
          v-model="formData.name"
          type="text"
          placeholder="e.g., Initial Outreach"
          class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900"
          required
        />
      </div>

      <!-- Type -->
      <div>
        <label class="mb-2 block text-sm font-medium text-slate-600"
          >Message Type</label
        >
        <select
          v-model="formData.type"
          class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900"
          required
        >
          <option value="email">Email</option>
          <option value="message">Text/SMS</option>
          <option value="phone_script">Phone Script</option>
        </select>
      </div>

      <!-- Subject (Email only) -->
      <div v-if="formData.type === 'email'">
        <label class="mb-2 block text-sm font-medium text-slate-600"
          >Subject</label
        >
        <input
          v-model="formData.subject"
          type="text"
          placeholder="e.g., Recruiting Inquiry - {{playerName}}"
          class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900"
        />
        <p class="mt-1 text-xs text-slate-600">
          Optional. Use {{ "{" }}{{ "{" }}variable{{ "}" }}{{ "}" }} syntax for
          dynamic content.
        </p>
      </div>

      <!-- Body -->
      <div>
        <label class="mb-2 block text-sm font-medium text-slate-600"
          >Message</label
        >
        <textarea
          v-model="formData.body"
          :placeholder="`Enter template body. Use ${'{{'}}variable${'}'}} syntax for dynamic content.`"
          rows="8"
          class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 font-mono text-sm text-slate-900"
          required
        />
        <p class="mt-1 text-xs text-slate-600">
          Use {{ "{" }}{{ "{" }}variable{{ "}" }}{{ "}" }} syntax for dynamic
          content.
        </p>
      </div>

      <!-- Available Variables -->
      <div>
        <details class="text-sm">
          <summary class="cursor-pointer font-medium text-blue-600 transition">
            Available Variables
          </summary>
          <div class="mt-3 rounded-sm border border-slate-300 bg-slate-50 p-3">
            <div
              v-for="variable in availableVariables"
              :key="variable.key"
              class="flex justify-between space-y-2 text-xs"
            >
              <code class="font-semibold text-blue-600">{{
                formatVariableDisplay(variable.key)
              }}</code>
              <span class="text-slate-600">{{ variable.description }}</span>
            </div>
          </div>
        </details>
      </div>

      <!-- Preview -->
      <div v-if="preview">
        <label class="mb-2 block text-sm font-medium text-slate-600"
          >Preview</label
        >
        <div
          class="max-h-40 overflow-y-auto rounded-sm border border-slate-300 bg-slate-50 p-4 text-sm wrap-break-word whitespace-pre-wrap text-slate-900"
        >
          {{ preview }}
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3 border-t border-slate-300 pt-4">
        <button
          v-if="isEditing"
          type="button"
          @click="deleteTemplate"
          class="rounded-lg px-4 py-2 font-medium text-red-600 transition hover:bg-red-50 hover:opacity-20"
        >
          Delete
        </button>
        <button
          type="button"
          @click="emit('cancel')"
          class="rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 font-medium text-slate-900 transition hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition hover:bg-blue-700"
        >
          Save Template
        </button>
      </div>
    </form>

    <DesignSystemConfirmDialog
      :is-open="isDeleteDialogOpen"
      title="Delete Template"
      message="Are you sure you want to delete this template? This action cannot be undone."
      confirm-text="Delete"
      cancel-text="Cancel"
      variant="danger"
      @confirm="confirmDeleteTemplate"
      @cancel="cancelDeleteTemplate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import {
  useCommunicationTemplates,
  type CommunicationTemplate,
} from "~/composables/useCommunicationTemplates";
import { AVAILABLE_VARIABLES } from "~/utils/templateVariables";
import { useAppToast } from "~/composables/useAppToast";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("TemplateEditor");

const { showToast } = useAppToast();

interface Props {
  template?: CommunicationTemplate;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  save: [template: CommunicationTemplate];
  cancel: [];
  delete: [id: string];
}>();

const {
  createTemplate,
  updateTemplate,
  deleteTemplate: deleteFromComposable,
  interpolateTemplate,
} = useCommunicationTemplates();

// A predefined (global, is_predefined === true) template is a read-only
// built-in. You don't update it in place — you save a user-owned copy.
const isCustomizingPredefined = computed(
  () => props.template?.is_predefined === true,
);

// Only owned, non-predefined templates edit in place (and can be deleted).
const isEditing = computed(
  () => !!props.template && !isCustomizingPredefined.value,
);

const headerTitle = computed(() => {
  if (isCustomizingPredefined.value) return "Customize Template";
  return isEditing.value ? "Edit Template" : "Create Template";
});

const formData = ref({
  name: props.template
    ? isCustomizingPredefined.value
      ? `Copy of ${props.template.name}`
      : props.template.name
    : "",
  type: (props.template?.type || "email") as
    "email" | "message" | "phone_script",
  subject: props.template?.subject || "",
  body: props.template?.body || "",
});

const availableVariables = AVAILABLE_VARIABLES;

// Helper to interpolate text containing variables
const interpolateText = (
  text: string,
  variables: Record<string, string>,
): string => {
  let result = text;
  Object.entries(variables).forEach(([key, value]) => {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    result = result.replace(pattern, value);
  });
  return result;
};

const preview = computed(() => {
  if (!formData.value.body) return null;

  // Create sample variables for preview
  const sampleVars: Record<string, string> = {
    playerName: "John Smith",
    coachFirstName: "Mike",
    coachLastName: "Johnson",
    schoolName: "Ohio State University",
    highSchool: "Lincoln High School",
    gradYear: "2025",
    position: "Captain",
    division: "D1",
    eventName: "Area Code Games",
    schoolTwitter: "OhioStateAthletics",
    todayDate: new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
  };

  const body = interpolateTemplate(
    {
      ...formData.value,
      id: "preview",
      created_at: new Date().toISOString(),
    } as CommunicationTemplate,
    sampleVars,
  );
  const subject = formData.value.subject
    ? interpolateText(formData.value.subject, sampleVars)
    : "";

  return subject ? `${subject}\n\n${body}` : body;
});

const saveTemplate = async () => {
  if (!formData.value.name || !formData.value.body) {
    showToast("Please fill in all required fields", "warning");
    return;
  }

  // Owned, non-predefined template → update in place.
  if (isEditing.value && props.template) {
    const ok = await updateTemplate(props.template.id, formData.value);
    if (!ok) {
      showToast(
        "Something went wrong saving this template. Please try again.",
        "error",
      );
      return;
    }
    emit("save", {
      ...props.template,
      ...formData.value,
    } as CommunicationTemplate);
    return;
  }

  // New template OR customizing a predefined built-in → insert an owned copy.
  const newTemplate = await createTemplate(
    formData.value.name,
    formData.value.type,
    formData.value.body,
    formData.value.subject,
    undefined,
    undefined,
  );
  if (!newTemplate) {
    showToast(
      "Something went wrong saving this template. Please try again.",
      "error",
    );
    return;
  }
  emit("save", newTemplate);
};

const isDeleteDialogOpen = ref(false);

const deleteTemplate = () => {
  if (!props.template) return;
  isDeleteDialogOpen.value = true;
};

const confirmDeleteTemplate = async () => {
  isDeleteDialogOpen.value = false;
  if (!props.template) return;
  const templateId = props.template.id;
  try {
    await deleteFromComposable(templateId);
    emit("delete", templateId);
  } catch (err) {
    logger.error("Failed to delete template", err);
    showToast(
      "Something went wrong deleting this template. Please try again.",
      "error",
    );
  }
};

const cancelDeleteTemplate = () => {
  isDeleteDialogOpen.value = false;
};

const formatVariableDisplay = (key: string): string => {
  return "{{" + key + "}}";
};
</script>
