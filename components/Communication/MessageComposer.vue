<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 bg-black/40"
        @click.self="close"
        @keydown.escape="close"
      >
        <Transition name="drawer">
          <div
            v-if="open"
            ref="dialogRef"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="titleId"
            class="absolute top-0 right-0 h-full w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white shadow-2xl"
          >
            <div
              class="flex items-center justify-between border-b border-slate-200 p-6"
            >
              <h3 :id="titleId" class="text-lg font-semibold text-slate-900">
                {{ ui.title }} to {{ coach.first_name }}
              </h3>
              <button
                :aria-label="ui.closeLabel"
                class="text-2xl text-slate-500 transition hover:text-slate-900"
                @click="close"
              >
                ×
              </button>
            </div>

            <!-- Stage 1: Compose (template + subject + body) -->
            <div v-if="stage === 'compose'" class="space-y-5 p-6">
              <!-- Template Selection -->
              <div>
                <label class="mb-2 block text-sm font-medium text-slate-700"
                  >Template</label
                >
                <select
                  v-model="channel.selectedTemplateId.value"
                  class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Custom message</option>
                  <option
                    v-for="t in channel.templates.value"
                    :key="t.id"
                    :value="t.id"
                  >
                    {{ t.name }}
                  </option>
                </select>
              </div>

              <!-- Subject (email only) -->
              <div v-if="isEmail">
                <label class="mb-2 block text-sm font-medium text-slate-700"
                  >Subject</label
                >
                <input
                  v-model="channel.composer.value.subject"
                  type="text"
                  class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  placeholder="Email subject..."
                />
              </div>

              <!-- Body -->
              <div>
                <div
                  :class="
                    isEmail ? 'mb-2' : 'mb-2 flex items-center justify-between'
                  "
                >
                  <label class="block text-sm font-medium text-slate-700"
                    >Message</label
                  >
                  <span v-if="!isEmail" class="text-xs text-slate-500"
                    >{{ channel.composer.value.body.length }}/{{
                      SMS_TEXT_LIMIT
                    }}</span
                  >
                </div>
                <textarea
                  v-model="channel.composer.value.body"
                  :rows="isEmail ? 6 : 4"
                  :maxlength="isEmail ? undefined : SMS_TEXT_LIMIT"
                  class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  placeholder="Your message..."
                />
                <p v-if="!isEmail" class="mt-2 text-xs text-slate-500">
                  Texts are limited to {{ SMS_TEXT_LIMIT }} characters
                </p>
              </div>
            </div>

            <!-- Stage 2: Complete your info (only when something's missing) -->
            <CommunicationMissingInfoStep
              v-else-if="stage === 'info'"
              :channel="channel"
              :can-edit-profile="canEditProfile"
              :athlete-name="athleteName"
              @continue="onInfoContinue"
              @back="stage = 'compose'"
            />

            <!-- Stage 3: Preview + send -->
            <div v-else class="space-y-5 p-6">
              <div>
                <label class="mb-2 block text-sm font-medium text-slate-700"
                  >Preview — what the coach sees</label
                >
                <div
                  class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm whitespace-pre-wrap text-slate-900"
                >
                  <template
                    v-for="(seg, i) in channel.previewSegments.value"
                    :key="i"
                    ><strong
                      v-if="seg.unresolved"
                      class="font-semibold text-amber-600"
                      >{{ seg.text }}</strong
                    ><template v-else>{{ seg.text }}</template></template
                  >
                </div>
              </div>

              <!-- Unresolved send warning -->
              <p
                v-if="channel.sendWarning.value"
                class="text-xs text-amber-700"
              >
                {{ channel.sendWarning.value }}
              </p>

              <!-- Log Interaction Checkbox -->
              <div class="flex items-center gap-2 pt-2">
                <input
                  :id="logCheckboxId"
                  v-model="logInteraction"
                  type="checkbox"
                  class="h-4 w-4 rounded-sm border-slate-300 text-blue-600"
                />
                <label :for="logCheckboxId" class="text-sm text-slate-700">
                  Log this interaction in coach history
                </label>
              </div>
            </div>

            <!-- Footer: compose stage -->
            <div
              v-if="stage === 'compose'"
              class="flex gap-3 border-t border-slate-200 p-6"
            >
              <button
                :class="[
                  'flex-1 rounded-lg bg-linear-to-r px-4 py-2 text-sm font-medium text-white transition',
                  ui.gradient,
                ]"
                @click="onComposeContinue"
              >
                Continue
              </button>
              <button
                class="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                @click="close"
              >
                Cancel
              </button>
            </div>

            <!-- Footer: preview stage (info stage supplies its own buttons) -->
            <div
              v-else-if="stage === 'preview'"
              class="flex gap-3 border-t border-slate-200 p-6"
            >
              <button
                :disabled="channel.unresolved.value.length > 0"
                :class="[
                  'flex-1 rounded-lg bg-linear-to-r px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50',
                  ui.gradient,
                ]"
                @click="onSend"
              >
                {{ ui.title }}
              </button>
              <button
                class="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                @click="
                  stage = channel.hasMissingInfo.value ? 'info' : 'compose'
                "
              >
                Back
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { useFocusTrap } from "~/composables/useFocusTrap";
import { SMS_TEXT_LIMIT } from "~/utils/phone";
import type { ChannelController } from "~/composables/useQuickCommunication";
import type { Coach } from "~/types/models";

const props = defineProps<{
  channel: ChannelController;
  coach: Coach;
  canEditProfile: boolean;
  athleteName: string;
}>();

const open = defineModel<boolean>("open", { required: true });
const logInteraction = defineModel<boolean>("logInteraction", {
  required: true,
});

// Staged flow: compose → info (skipped when nothing's missing) → preview + send.
const stage = ref<"compose" | "info" | "preview">("compose");

const isEmail = computed(() => props.channel.channel === "email");
const titleId = computed(() => `${props.channel.channel}-modal-title`);
const logCheckboxId = computed(() => `${props.channel.channel}LogInteraction`);

const ui = computed(() =>
  isEmail.value
    ? {
        title: "Send Email",
        closeLabel: "Close email composer",
        gradient:
          "from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
      }
    : {
        title: "Send Text",
        closeLabel: "Close text composer",
        gradient:
          "from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
      },
);

const dialogRef = ref<HTMLElement | null>(null);
const { activate, deactivate } = useFocusTrap(dialogRef);

const close = (): void => {
  deactivate();
  open.value = false;
  stage.value = "compose";
  props.channel.onClose();
};

const onComposeContinue = (): void => {
  stage.value = props.channel.hasMissingInfo.value ? "info" : "preview";
};

const onInfoContinue = async (): Promise<void> => {
  await props.channel.commitMissingInfo();
  stage.value = "preview";
};

const onSend = async (): Promise<void> => {
  if (await props.channel.send()) close();
};

// A fresh template restarts the flow at compose.
watch(
  () => props.channel.selectedTemplateId.value,
  () => {
    stage.value = "compose";
  },
);

watch(open, async (isOpen) => {
  if (isOpen) {
    stage.value = "compose";
    await nextTick();
    activate();
  } else {
    deactivate();
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

.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.25s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
}
</style>
