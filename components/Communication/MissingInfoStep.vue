<template>
  <div class="space-y-5 p-6">
    <div>
      <h3 class="text-lg font-semibold text-slate-900">Complete your info</h3>
      <p class="mt-1 text-sm text-slate-500">
        A few things this template still needs before you send.
      </p>
    </div>

    <div class="space-y-4">
      <div
        v-for="field in channel.missingInfoFields.value"
        :key="field.id"
        class="rounded-lg border border-slate-200 p-4"
      >
        <p class="text-sm font-medium text-slate-900">{{ field.title }}</p>
        <p v-if="field.prompt" class="mt-0.5 text-xs text-slate-500">
          {{ field.prompt }}
        </p>

        <!-- Locked for a parent: the athlete must answer in their own voice. -->
        <p v-if="isLocked(field)" class="mt-2 text-xs text-amber-700 italic">
          Ask {{ athleteName }} to add this
        </p>

        <template v-else>
          <!-- Boolean (questionnaire): Yes / Skip -->
          <div v-if="field.editor.kind === 'boolean'" class="mt-3 flex gap-2">
            <button
              type="button"
              :class="[
                'rounded-lg px-3 py-1.5 text-sm font-semibold transition',
                channel.questionnaireDraft.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
              ]"
              @click="channel.questionnaireDraft.value = true"
            >
              Yes, I completed it
            </button>
            <button
              type="button"
              :class="[
                'rounded-lg px-3 py-1.5 text-sm font-medium transition',
                !channel.questionnaireDraft.value
                  ? 'bg-slate-200 text-slate-900'
                  : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50',
              ]"
              @click="channel.questionnaireDraft.value = false"
            >
              Skip
            </button>
          </div>

          <!-- Text: multiline → textarea, else input -->
          <textarea
            v-else-if="field.editor.kind === 'text' && field.editor.multiline"
            :value="textValue(field)"
            rows="3"
            class="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            :placeholder="field.prompt || 'Write for this message…'"
            @input="
              setText(field, ($event.target as HTMLTextAreaElement).value)
            "
          ></textarea>
          <input
            v-else-if="field.editor.kind === 'text'"
            :value="textValue(field)"
            type="text"
            class="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            :placeholder="field.prompt || 'Add…'"
            @input="setText(field, ($event.target as HTMLInputElement).value)"
          />

          <!-- Metric nudge: navigate to the performance page -->
          <NuxtLink
            v-else-if="field.editor.kind === 'metricLink'"
            to="/performance"
            class="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
          >
            Add a performance metric →
          </NuxtLink>

          <!-- Profile-backed var: navigate to the profile editor -->
          <NuxtLink
            v-else-if="field.editor.kind === 'profileLink'"
            to="/settings/player-details"
            class="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
          >
            Edit in profile →
          </NuxtLink>
        </template>
      </div>
    </div>

    <div class="flex gap-3 border-t border-slate-200 pt-4">
      <button
        type="button"
        class="flex-1 rounded-lg bg-linear-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:from-blue-600 hover:to-blue-700"
        @click="emit('continue')"
      >
        Continue
      </button>
      <button
        type="button"
        class="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        @click="emit('back')"
      >
        Back
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ChannelController } from "~/composables/useQuickCommunication";
import type { MissingInfoField } from "~/utils/communication/missingInfo";

const props = defineProps<{
  channel: ChannelController;
  canEditProfile: boolean;
  athleteName: string;
}>();

const emit = defineEmits<{ continue: []; back: [] }>();

/** A specificity field the parent can't edit, while a parent is composing. */
const isLocked = (field: MissingInfoField): boolean =>
  !field.editableByParent && !props.canEditProfile;

/** intendedMajor reads/writes its own draft; every other (authored) text row
 *  reads/writes the per-message authored map. */
const textValue = (field: MissingInfoField): string =>
  field.id === "intendedMajor"
    ? props.channel.intendedMajorDraft.value
    : (props.channel.authored.value[field.id] ?? "");

const setText = (field: MissingInfoField, value: string): void => {
  if (field.id === "intendedMajor") {
    props.channel.intendedMajorDraft.value = value;
  } else {
    props.channel.authored.value[field.id] = value;
  }
};
</script>
