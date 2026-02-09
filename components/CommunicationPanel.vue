<template>
  <div class="rounded-xl border border-slate-200 shadow-sm p-6 bg-white">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-slate-900">
        💬 Quick Communication
      </h2>
      <button
        @click="showTemplateManager = !showTemplateManager"
        class="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
      >
        Manage Templates
      </button>
    </div>

    <!-- Coach/School Context -->
    <div
      v-if="coach"
      class="mb-6 p-4 rounded-lg border border-blue-200 bg-blue-50"
    >
      <p class="text-sm mb-1 text-slate-900">
        <span class="font-semibold"
          >{{ coach.first_name }} {{ coach.last_name }}</span
        >
        <span class="text-slate-500"> • {{ getRoleLabel(coach.role) }}</span>
      </p>
      <p v-if="schoolName" class="text-sm text-slate-600">{{ schoolName }}</p>
    </div>

    <!-- Communication Buttons -->
    <div class="space-y-3 mb-6">
      <!-- Email -->
      <div v-if="coach.email">
        <button
          @click="showEmailComposer = true"
          class="w-full flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"
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
          class="w-full flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"
            >
              <span class="text-lg">💬</span>
            </div>
            <div class="text-left">
              <p class="font-medium text-slate-900">Send Text</p>
              <p class="text-sm text-slate-500">
                {{ formatPhone(coach.phone) }}
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
          class="w-full flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center"
            >
              <span class="text-lg">📸</span>
            </div>
            <div class="text-left">
              <p class="font-medium text-slate-900">DM on Instagram</p>
              <p class="text-sm text-slate-500">
                @{{ coach.instagram_handle }}
              </p>
            </div>
          </div>
          <span class="text-slate-400">→</span>
        </button>
      </div>
    </div>

    <!-- Email Composer Modal -->
    <div
      v-if="showEmailComposer"
      class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    >
      <div
        class="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200"
      >
        <div class="p-6 border-b border-slate-200">
          <h3 class="text-lg font-semibold text-slate-900">
            Send Email to {{ coach.first_name }}
          </h3>
        </div>

        <div class="p-6 space-y-5">
          <!-- Template Selection -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2"
              >Template</label
            >
            <select
              v-model="selectedEmailTemplate"
              class="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">Custom message</option>
              <option v-for="t in emailTemplates" :key="t.id" :value="t.id">
                {{ t.name }}
              </option>
            </select>
          </div>

          <!-- Subject -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2"
              >Subject</label
            >
            <input
              v-model="emailComposer.subject"
              type="text"
              class="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Email subject..."
            />
          </div>

          <!-- Body -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2"
              >Message</label
            >
            <textarea
              v-model="emailComposer.body"
              rows="6"
              class="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Your message..."
            />
          </div>

          <!-- Variables Helper -->
          <div class="rounded-lg p-3 bg-blue-50 border border-blue-200">
            <p class="text-xs font-semibold mb-2 text-blue-900">
              Available Variables:
            </p>
            <div class="grid grid-cols-2 gap-2 text-xs text-blue-800 font-mono">
              <div>{{ props.playerName }}</div>
              <div>{{ props.coach.first_name }}</div>
              <div>{{ props.schoolName }}</div>
              <div>{{ props.highSchool }}</div>
            </div>
          </div>

          <!-- Log Interaction Checkbox -->
          <div class="flex items-center gap-2 pt-2">
            <input
              id="emailLogInteraction"
              v-model="shouldLogInteraction"
              type="checkbox"
              class="w-4 h-4 rounded border-slate-300 text-blue-600"
            />
            <label for="emailLogInteraction" class="text-sm text-slate-700">
              Log this interaction in coach history
            </label>
          </div>
        </div>

        <div class="p-6 border-t border-slate-200 flex gap-3">
          <button
            @click="sendEmail"
            class="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition text-sm"
          >
            Send Email
          </button>
          <button
            @click="showEmailComposer = false"
            class="flex-1 px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Text Composer Modal -->
    <div
      v-if="showTextComposer"
      class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    >
      <div
        class="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200"
      >
        <div class="p-6 border-b border-slate-200">
          <h3 class="text-lg font-semibold text-slate-900">
            Send Text to {{ coach.first_name }}
          </h3>
        </div>

        <div class="p-6 space-y-5">
          <!-- Template Selection -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2"
              >Template</label
            >
            <select
              v-model="selectedTextTemplate"
              class="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">Custom message</option>
              <option v-for="t in messageTemplates" :key="t.id" :value="t.id">
                {{ t.name }}
              </option>
            </select>
          </div>

          <!-- Body -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-medium text-slate-700"
                >Message</label
              >
              <span class="text-xs text-slate-500"
                >{{ textComposer.body.length }}/160</span
              >
            </div>
            <textarea
              v-model="textComposer.body"
              rows="4"
              maxlength="160"
              class="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Your message..."
            />
            <p class="text-xs text-slate-500 mt-2">
              SMS limited to 160 characters
            </p>
          </div>

          <!-- Log Interaction Checkbox -->
          <div class="flex items-center gap-2 pt-2">
            <input
              id="textLogInteraction"
              v-model="shouldLogInteraction"
              type="checkbox"
              class="w-4 h-4 rounded border-slate-300 text-blue-600"
            />
            <label for="textLogInteraction" class="text-sm text-slate-700">
              Log this interaction in coach history
            </label>
          </div>
        </div>

        <div class="p-6 border-t border-slate-200 flex gap-3">
          <button
            @click="sendText"
            class="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-medium rounded-lg hover:from-green-600 hover:to-green-700 transition text-sm"
          >
            Send Text
          </button>
          <button
            @click="showTextComposer = false"
            class="flex-1 px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Template Manager Modal -->
    <div
      v-if="showTemplateManager"
      class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    >
      <div
        class="bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200"
      >
        <div class="p-6 border-b border-slate-200">
          <h3 class="text-lg font-semibold text-slate-900">
            Communication Templates
          </h3>
        </div>

        <div class="p-6">
          <p class="text-sm text-slate-600 mb-4">
            Manage your custom communication templates
          </p>
          <!-- Template list would go here in full implementation -->
          <p class="text-center text-slate-500 py-8 text-sm">
            Template management coming in next update
          </p>
        </div>

        <div class="p-6 border-t border-slate-200">
          <button
            @click="showTemplateManager = false"
            class="w-full px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useCommunicationTemplates } from "~/composables/useCommunicationTemplates";
import { getRoleLabel } from "~/utils/coachLabels";
import type { Coach } from "~/types/models";

interface Props {
  coach: Coach;
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

const { getTemplatesByType, interpolateTemplate } = useCommunicationTemplates();

const showEmailComposer = ref(false);
const showTextComposer = ref(false);

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
const showTemplateManager = ref(false);
const shouldLogInteraction = ref(true);

const selectedEmailTemplate = ref("");
const selectedTextTemplate = ref("");

const emailComposer = ref({ subject: "", body: "" });
const textComposer = ref({ body: "" });

const emailTemplates = computed(() => getTemplatesByType("email"));
const messageTemplates = computed(() => getTemplatesByType("message"));

// Template variables
const templateVars = {
  playerName: props.playerName,
  coachFirstName: props.coach.first_name,
  schoolName: props.schoolName || "Your School",
  highSchool: props.highSchool,
};

// Watch for template selection
watch(selectedEmailTemplate, (templateId) => {
  if (templateId) {
    const template = emailTemplates.value.find((t) => t.id === templateId);
    if (template) {
      emailComposer.value = {
        subject: template.subject
          ? interpolateText(template.subject, templateVars)
          : "",
        body: interpolateTemplate(template, templateVars),
      };
    }
  }
});

watch(selectedTextTemplate, (templateId) => {
  if (templateId) {
    const template = messageTemplates.value.find((t) => t.id === templateId);
    if (template) {
      textComposer.value = {
        body: interpolateTemplate(template, templateVars),
      };
    }
  }
});

const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

const sendEmail = async () => {
  const mailtoLink = `mailto:${props.coach.email}?subject=${encodeURIComponent(emailComposer.value.subject)}&body=${encodeURIComponent(emailComposer.value.body)}`;
  window.location.href = mailtoLink;

  if (shouldLogInteraction.value) {
    emit("interaction-logged", {
      type: "email",
      direction: "outbound",
      content: emailComposer.value.body,
    });
  }

  showEmailComposer.value = false;
};

const sendText = async () => {
  const smsLink = `sms:${props.coach.phone?.replace(/\D/g, "")}?body=${encodeURIComponent(textComposer.value.body)}`;
  window.location.href = smsLink;

  if (shouldLogInteraction.value) {
    emit("interaction-logged", {
      type: "text",
      direction: "outbound",
      content: textComposer.value.body,
    });
  }

  showTextComposer.value = false;
};

const openInstagram = () => {
  window.open(
    `https://instagram.com/${props.coach.instagram_handle}`,
    "_blank",
  );
};
</script>
