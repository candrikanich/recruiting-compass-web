<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    @keydown.escape="handleClose"
  >
    <div
      ref="dialogRef"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-send-title"
      class="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between border-b border-slate-300 p-6"
      >
        <h2 id="template-send-title" class="text-2xl font-bold text-slate-900">
          Send {{ messageType }}
        </h2>
        <button
          @click="handleClose"
          class="text-slate-600 transition hover:text-slate-900"
          aria-label="Close send message dialog"
        >
          <UIcon name="i-heroicons-x-mark-solid" class="h-6 w-6" />
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 space-y-6 overflow-y-auto p-6">
        <!-- Template Selection Step -->
        <div v-if="step === 'select'" class="space-y-4">
          <p class="mb-4 text-sm text-slate-600">
            Choose a template or start from scratch
          </p>
          <button
            v-for="template in availableTemplates"
            :key="template.id"
            @click="selectTemplate(template)"
            class="w-full rounded-lg border border-slate-300 p-4 text-left transition hover:border-blue-500 hover:bg-blue-50"
          >
            <h3 class="font-semibold text-slate-900">{{ template.name }}</h3>
            <p class="mt-1 line-clamp-2 text-sm text-slate-600">
              {{ template.body }}
            </p>
          </button>
        </div>

        <!-- Message Customization Step -->
        <div v-if="step === 'customize'" class="space-y-4">
          <!-- Contextual NUX Prompt -->
          <div
            v-if="activePrompt"
            class="flex items-center justify-between rounded-md border border-brand-blue-100 bg-brand-blue-50 px-4 py-2 text-sm dark:border-brand-blue-800 dark:bg-brand-blue-900/20"
          >
            <span
              >{{ activePrompt.message }}
              <NuxtLink
                :to="activePrompt.link"
                class="font-medium text-brand-blue-600 hover:underline"
                >Update →</NuxtLink
              ></span
            >
            <button
              class="ml-2 text-brand-slate-400 hover:text-brand-slate-600"
              @click="dismissActivePrompt"
            >
              Not now
            </button>
          </div>

          <!-- Subject (Email only) -->
          <div v-if="messageType === 'Email'">
            <label
              for="template-send-subject"
              class="mb-2 block text-sm font-medium text-slate-600"
              >Subject</label
            >
            <input
              id="template-send-subject"
              v-model="composedMessage.subject"
              type="text"
              class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900"
            />
          </div>

          <!-- Message Body -->
          <div>
            <label
              for="template-send-body"
              class="mb-2 block text-sm font-medium text-slate-600"
              >Message</label
            >
            <textarea
              id="template-send-body"
              v-model="composedMessage.body"
              rows="10"
              class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 font-mono text-sm text-slate-900"
            />
            <p class="mt-1 text-xs text-slate-600">
              You can edit the message before sending
            </p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex gap-3 border-t border-slate-300 bg-slate-50 p-6">
        <button
          v-if="step === 'customize'"
          @click="step = 'select'"
          class="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-900 transition hover:bg-slate-100"
        >
          Back
        </button>
        <button
          @click="handleClose"
          class="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-900 transition hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          v-if="step === 'select'"
          @click="handleClose"
          class="rounded-lg bg-slate-50 px-4 py-2 font-medium text-slate-900 transition hover:bg-slate-100"
        >
          Close
        </button>
        <button
          v-if="step === 'customize'"
          @click="sendMessage"
          :disabled="!composedMessage.body"
          :class="[
            'rounded-lg px-6 py-2 font-medium text-white transition',
            !composedMessage.body
              ? 'cursor-not-allowed bg-blue-600 opacity-50'
              : 'bg-blue-600 hover:bg-blue-700',
          ]"
        >
          Send {{ messageType }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { useFocusTrap } from "~/composables/useFocusTrap";
import { renderTemplate as interpolateText } from "~/utils/templateResolver";
import {
  useCommunicationTemplates,
  type CommunicationTemplate,
} from "~/composables/useCommunicationTemplates";
import { useVideoLinks } from "~/composables/useVideoLinks";
import { useNuxPrompts } from "~/composables/useNuxPrompts";
import { usePreferenceManager } from "~/composables/usePreferenceManager";

interface Props {
  isOpen: boolean;
  coach: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
  };
  school?: {
    name: string;
  };
  messageType: "Email" | "Text" | "Twitter";
  playerName?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  send: [message: { subject?: string; body: string }];
}>();

const { allTemplates, loadUserTemplates, interpolateTemplate } =
  useCommunicationTemplates();
const { links: videoLinks, load: loadVideoLinks } = useVideoLinks();
const { activePrompt, evaluatePrompts, dismissActivePrompt } = useNuxPrompts();
const { getPlayerDetails } = usePreferenceManager();

const step = ref<"select" | "customize">("select");
const selectedTemplate = ref<CommunicationTemplate | null>(null);
const composedMessage = ref({ subject: "", body: "" });

loadUserTemplates();
loadVideoLinks();

const highlightVideoUrl = computed(() => {
  if (videoLinks.value.length === 0) return "";
  const healthy = videoLinks.value.find(
    (link) => link.health_status === "healthy",
  );
  return (healthy ?? videoLinks.value[0]).url;
});

const filmLinksText = computed(() => {
  return videoLinks.value
    .map(
      (link) =>
        `${link.title ?? link.url} (${link.platform.toUpperCase()}): ${link.url}`,
    )
    .join("\n");
});

const messageTypeMap: Record<string, "email" | "message" | "phone_script"> = {
  Email: "email",
  Text: "message",
  Twitter: "message", // Twitter can use message templates
};

const availableTemplates = computed(() => {
  const type = messageTypeMap[props.messageType];
  return allTemplates.value.filter((t) => t.type === type);
});

const dialogRef = ref<HTMLElement | null>(null);
const { activate, deactivate } = useFocusTrap(dialogRef);

const handleClose = () => {
  deactivate();
  emit("close");
};

watch(
  () => props.isOpen,
  async (newVal) => {
    if (newVal) {
      step.value = "select";
      selectedTemplate.value = null;
      composedMessage.value = { subject: "", body: "" };
      await nextTick();
      activate();
    } else {
      deactivate();
    }
  },
);

const selectTemplate = (template: CommunicationTemplate) => {
  selectedTemplate.value = template;

  evaluatePrompts({
    context: "template",
    userPosition: getPlayerDetails()?.primary_position ?? null,
  });

  // Interpolate variables
  const variables: Record<string, string> = {
    playerName: props.playerName || "Player",
    coachFirstName: props.coach.first_name,
    coachLastName: props.coach.last_name,
    schoolName: props.school?.name || "School",
    todayDate: new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    highlightVideo: highlightVideoUrl.value,
    filmLinks: filmLinksText.value,
  };

  const body = interpolateTemplate(template, variables);
  const subject = template.subject
    ? interpolateText(template.subject, variables)
    : "";
  composedMessage.value = {
    subject: subject,
    body: body,
  };

  step.value = "customize";
};

const sendMessage = () => {
  emit("send", composedMessage.value);
  handleClose();
};
</script>
