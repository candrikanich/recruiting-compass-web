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

    <!-- Questionnaire completion prompt: this template mentions completing the
         school's recruiting questionnaire. Confirm before it goes to the coach. -->
    <div
      v-if="showQuestionnairePrompt"
      class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4"
    >
      <p class="text-sm font-medium text-amber-900">
        Did you complete a recruiting questionnaire for
        {{ schoolName || "this school" }}?
      </p>
      <p class="mt-1 text-sm text-amber-800">
        This template says you did. We'll only include that line if you confirm.
      </p>
      <div class="mt-3 flex gap-2">
        <button
          type="button"
          class="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-amber-700"
          @click="answerQuestionnaire(true)"
        >
          Yes, I completed it
        </button>
        <button
          type="button"
          class="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-amber-900 ring-1 ring-amber-300 transition hover:bg-amber-100"
          @click="answerQuestionnaire(false)"
        >
          Skip
        </button>
      </div>
    </div>

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
              <p class="text-sm text-slate-500">
                @{{ coach.instagram_handle }}
              </p>
            </div>
          </div>
          <span class="text-slate-400">→</span>
        </button>
      </div>
    </div>

    <!-- Email Composer Drawer (right-anchored: keeps coach/school context visible) -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showEmailComposer"
          class="fixed inset-0 z-50 bg-black/40"
          @click.self="handleCloseEmail"
          @keydown.escape="handleCloseEmail"
        >
          <Transition name="drawer">
            <div
              v-if="showEmailComposer"
              ref="emailDialogRef"
              role="dialog"
              aria-modal="true"
              aria-labelledby="email-modal-title"
              class="absolute top-0 right-0 h-full w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white shadow-2xl"
            >
              <div
                class="flex items-center justify-between border-b border-slate-200 p-6"
              >
                <h3
                  id="email-modal-title"
                  class="text-lg font-semibold text-slate-900"
                >
                  Send Email to {{ coach.first_name }}
                </h3>
                <button
                  @click="handleCloseEmail"
                  aria-label="Close email composer"
                  class="text-2xl text-slate-500 transition hover:text-slate-900"
                >
                  ×
                </button>
              </div>

              <div class="space-y-5 p-6">
                <!-- Template Selection -->
                <div>
                  <label class="mb-2 block text-sm font-medium text-slate-700"
                    >Template</label
                  >
                  <select
                    v-model="selectedEmailTemplate"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Custom message</option>
                    <option
                      v-for="t in emailTemplates"
                      :key="t.id"
                      :value="t.id"
                    >
                      {{ t.name }}
                    </option>
                  </select>
                </div>

                <!-- Subject -->
                <div>
                  <label class="mb-2 block text-sm font-medium text-slate-700"
                    >Subject</label
                  >
                  <input
                    v-model="emailComposer.subject"
                    type="text"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    placeholder="Email subject..."
                  />
                </div>

                <!-- Body -->
                <div>
                  <label class="mb-2 block text-sm font-medium text-slate-700"
                    >Message</label
                  >
                  <textarea
                    v-model="emailComposer.body"
                    rows="6"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    placeholder="Your message..."
                  />
                </div>

                <!-- Live Preview -->
                <div>
                  <label class="mb-2 block text-sm font-medium text-slate-700"
                    >Preview — what the coach sees</label
                  >
                  <div
                    class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm whitespace-pre-wrap text-slate-900"
                  >
                    <template v-for="(seg, i) in emailPreviewSegments" :key="i"
                      ><strong
                        v-if="seg.unresolved"
                        class="font-semibold text-amber-600"
                        >{{ seg.text }}</strong
                      ><template v-else>{{ seg.text }}</template></template
                    >
                  </div>
                </div>

                <!-- Variables in this template -->
                <div
                  v-if="selectedEmailTemplateObj"
                  class="rounded-lg border border-blue-200 bg-blue-50 p-3"
                >
                  <p class="mb-2 text-xs font-semibold text-blue-900">
                    Variables in this template
                  </p>
                  <div class="space-y-1">
                    <div
                      v-for="row in emailVariableRows"
                      :key="row.key"
                      class="grid grid-cols-2 items-center gap-2 text-xs"
                    >
                      <span class="font-mono text-blue-800">{{
                        tokenOf(row.key)
                      }}</span>
                      <div v-if="row.editable" class="flex flex-col gap-0.5">
                        <div class="flex items-center gap-1">
                          <input
                            v-model="emailInputs[row.key]"
                            type="text"
                            :placeholder="row.value ? '' : 'add…'"
                            :disabled="savingKey === `email:${row.key}`"
                            class="min-w-0 flex-1 rounded border border-slate-300 px-1.5 py-0.5 text-xs text-slate-900"
                            @keydown.enter.prevent="saveField(row, 'email')"
                          />
                          <button
                            type="button"
                            :disabled="savingKey === `email:${row.key}`"
                            class="rounded bg-blue-600 px-1.5 py-0.5 text-xs text-white disabled:opacity-50"
                            @click="saveField(row, 'email')"
                          >
                            Save
                          </button>
                        </div>
                        <span
                          v-if="saveErrors[`email:${row.key}`]"
                          class="text-[10px] text-red-600"
                          >{{ saveErrors[`email:${row.key}`] }}</span
                        >
                      </div>
                      <div
                        v-else-if="row.authored"
                        class="flex flex-col gap-0.5"
                      >
                        <input
                          v-model="emailAuthored[row.key]"
                          type="text"
                          placeholder="write for this message…"
                          class="w-full min-w-0 rounded border border-slate-300 px-1.5 py-0.5 text-xs text-slate-900"
                          @blur="reresolveSelected"
                        />
                        <span class="text-[10px] text-slate-400"
                          >for this message only</span
                        >
                      </div>
                      <div v-else class="flex min-w-0 items-center gap-2">
                        <span
                          v-if="row.value"
                          class="truncate text-slate-700"
                          >{{ row.value }}</span
                        >
                        <span v-else class="font-medium text-amber-600"
                          >needs input</span
                        >
                        <NuxtLink
                          v-if="row.linkToProfile"
                          :to="PROFILE_EDIT_ROUTE"
                          class="shrink-0 text-blue-600 hover:underline"
                          >Edit in profile →</NuxtLink
                        >
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Nudge to add a stat when the athlete has none -->
                <NuxtLink
                  v-if="showAddMetricCta"
                  to="/performance"
                  class="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700 transition hover:bg-blue-100"
                >
                  <UIcon
                    name="i-heroicons-chart-bar"
                    class="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span
                    >Add a metric to strengthen this email — coaches look for
                    numbers.</span
                  >
                </NuxtLink>

                <!-- Unresolved send warning -->
                <p v-if="emailSendWarning" class="text-xs text-amber-700">
                  {{ emailSendWarning }}
                </p>

                <!-- Log Interaction Checkbox -->
                <div class="flex items-center gap-2 pt-2">
                  <input
                    id="emailLogInteraction"
                    v-model="shouldLogInteraction"
                    type="checkbox"
                    class="h-4 w-4 rounded-sm border-slate-300 text-blue-600"
                  />
                  <label
                    for="emailLogInteraction"
                    class="text-sm text-slate-700"
                  >
                    Log this interaction in coach history
                  </label>
                </div>
              </div>

              <div class="flex gap-3 border-t border-slate-200 p-6">
                <button
                  @click="sendEmail"
                  :disabled="emailUnresolved.length > 0"
                  class="flex-1 rounded-lg bg-linear-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:from-blue-600 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Send Email
                </button>
                <button
                  @click="handleCloseEmail"
                  class="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- Text Composer Drawer (right-anchored: matches the email composer) -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showTextComposer"
          class="fixed inset-0 z-50 bg-black/40"
          @click.self="handleCloseText"
          @keydown.escape="handleCloseText"
        >
          <Transition name="drawer">
            <div
              v-if="showTextComposer"
              ref="textDialogRef"
              role="dialog"
              aria-modal="true"
              aria-labelledby="text-modal-title"
              class="absolute top-0 right-0 h-full w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white shadow-2xl"
            >
              <div
                class="flex items-center justify-between border-b border-slate-200 p-6"
              >
                <h3
                  id="text-modal-title"
                  class="text-lg font-semibold text-slate-900"
                >
                  Send Text to {{ coach.first_name }}
                </h3>
                <button
                  @click="handleCloseText"
                  aria-label="Close text composer"
                  class="text-2xl text-slate-500 transition hover:text-slate-900"
                >
                  ×
                </button>
              </div>

              <div class="space-y-5 p-6">
                <!-- Template Selection -->
                <div>
                  <label class="mb-2 block text-sm font-medium text-slate-700"
                    >Template</label
                  >
                  <select
                    v-model="selectedTextTemplate"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Custom message</option>
                    <option
                      v-for="t in messageTemplates"
                      :key="t.id"
                      :value="t.id"
                    >
                      {{ t.name }}
                    </option>
                  </select>
                </div>

                <!-- Body -->
                <div>
                  <div class="mb-2 flex items-center justify-between">
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
                    class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    placeholder="Your message..."
                  />
                  <p class="mt-2 text-xs text-slate-500">
                    SMS limited to 160 characters
                  </p>
                </div>

                <!-- Live Preview -->
                <div>
                  <label class="mb-2 block text-sm font-medium text-slate-700"
                    >Preview — what the coach sees</label
                  >
                  <div
                    class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm whitespace-pre-wrap text-slate-900"
                  >
                    <template v-for="(seg, i) in textPreviewSegments" :key="i"
                      ><strong
                        v-if="seg.unresolved"
                        class="font-semibold text-amber-600"
                        >{{ seg.text }}</strong
                      ><template v-else>{{ seg.text }}</template></template
                    >
                  </div>
                </div>

                <!-- Variables in this template -->
                <div
                  v-if="selectedTextTemplateObj"
                  class="rounded-lg border border-blue-200 bg-blue-50 p-3"
                >
                  <p class="mb-2 text-xs font-semibold text-blue-900">
                    Variables in this template
                  </p>
                  <div class="space-y-1">
                    <div
                      v-for="row in textVariableRows"
                      :key="row.key"
                      class="grid grid-cols-2 items-center gap-2 text-xs"
                    >
                      <span class="font-mono text-blue-800">{{
                        tokenOf(row.key)
                      }}</span>
                      <div v-if="row.editable" class="flex flex-col gap-0.5">
                        <div class="flex items-center gap-1">
                          <input
                            v-model="textInputs[row.key]"
                            type="text"
                            :placeholder="row.value ? '' : 'add…'"
                            :disabled="savingKey === `text:${row.key}`"
                            class="min-w-0 flex-1 rounded border border-slate-300 px-1.5 py-0.5 text-xs text-slate-900"
                            @keydown.enter.prevent="saveField(row, 'text')"
                          />
                          <button
                            type="button"
                            :disabled="savingKey === `text:${row.key}`"
                            class="rounded bg-blue-600 px-1.5 py-0.5 text-xs text-white disabled:opacity-50"
                            @click="saveField(row, 'text')"
                          >
                            Save
                          </button>
                        </div>
                        <span
                          v-if="saveErrors[`text:${row.key}`]"
                          class="text-[10px] text-red-600"
                          >{{ saveErrors[`text:${row.key}`] }}</span
                        >
                      </div>
                      <div
                        v-else-if="row.authored"
                        class="flex flex-col gap-0.5"
                      >
                        <input
                          v-model="textAuthored[row.key]"
                          type="text"
                          placeholder="write for this message…"
                          class="w-full min-w-0 rounded border border-slate-300 px-1.5 py-0.5 text-xs text-slate-900"
                          @blur="reresolveSelected"
                        />
                        <span class="text-[10px] text-slate-400"
                          >for this message only</span
                        >
                      </div>
                      <div v-else class="flex min-w-0 items-center gap-2">
                        <span
                          v-if="row.value"
                          class="truncate text-slate-700"
                          >{{ row.value }}</span
                        >
                        <span v-else class="font-medium text-amber-600"
                          >needs input</span
                        >
                        <NuxtLink
                          v-if="row.linkToProfile"
                          :to="PROFILE_EDIT_ROUTE"
                          class="shrink-0 text-blue-600 hover:underline"
                          >Edit in profile →</NuxtLink
                        >
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Nudge to add a stat when the athlete has none -->
                <NuxtLink
                  v-if="showAddMetricCta"
                  to="/performance"
                  class="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700 transition hover:bg-blue-100"
                >
                  <UIcon
                    name="i-heroicons-chart-bar"
                    class="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>Add a metric to strengthen this message.</span>
                </NuxtLink>

                <!-- Unresolved send warning -->
                <p v-if="textSendWarning" class="text-xs text-amber-700">
                  {{ textSendWarning }}
                </p>

                <!-- Log Interaction Checkbox -->
                <div class="flex items-center gap-2 pt-2">
                  <input
                    id="textLogInteraction"
                    v-model="shouldLogInteraction"
                    type="checkbox"
                    class="h-4 w-4 rounded-sm border-slate-300 text-blue-600"
                  />
                  <label
                    for="textLogInteraction"
                    class="text-sm text-slate-700"
                  >
                    Log this interaction in coach history
                  </label>
                </div>
              </div>

              <div class="flex gap-3 border-t border-slate-200 p-6">
                <button
                  @click="sendText"
                  :disabled="textUnresolved.length > 0"
                  class="flex-1 rounded-lg bg-linear-to-r from-green-500 to-green-600 px-4 py-2 text-sm font-medium text-white transition hover:from-green-600 hover:to-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Send Text
                </button>
                <button
                  @click="handleCloseText"
                  class="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

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
              <!-- Template list would go here in full implementation -->
              <p class="py-8 text-center text-sm text-slate-500">
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
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { useCommunicationTemplates } from "~/composables/useCommunicationTemplates";
import { useFocusTrap } from "~/composables/useFocusTrap";
import { useFamilyCtx } from "~/composables/useFamilyCtx";
import { useTemplateResolver } from "~/composables/useTemplateResolver";
import { useProfileFieldWrite } from "~/composables/useProfileFieldWrite";
import { useAthleteMessages } from "~/composables/useAthleteMessages";
import { useSchools } from "~/composables/useSchools";
import { useUserStore } from "~/stores/user";
import { formatPhoneDisplay, toSmsHref } from "~/utils/phone";
import { getRoleLabel } from "~/utils/coachLabels";
import { findUnresolved, renderClean } from "~/utils/templateResolver";
import { editableColumnFor } from "~/utils/editableProfileFields";
import type { ResolverContext, Row } from "~/utils/templateResolver";
import type { Coach, School, CommunicationTemplate } from "~/types/models";

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

const { getTemplatesByType, loadTemplates } = useCommunicationTemplates();
const { activeAthleteId } = useFamilyCtx();
const { buildAthleteContext, resolveTemplate, loadRegistry } =
  useTemplateResolver();
const { updateSchool } = useSchools();
const { writeField } = useProfileFieldWrite();
const { checkSend, logSend } = useAthleteMessages();
const { evaluate: evaluateContactWindow, filterTemplatesByWindow } =
  useContactWindow();
// Two-step confirm: a timing warning arms this; the next send click proceeds.
const emailSendConfirmed = ref(false);
const textSendConfirmed = ref(false);
const userStore = useUserStore();

// Questionnaire completion, per school. Templates carry a {{questionnaireNote}}
// that only renders "I've completed your recruiting questionnaire" when the
// school flag is true. If a chosen template needs it and the flag is still
// unset, we ask once at compose time — but the athlete may skip, in which case
// we treat it as not-completed and the line is omitted. Override reflects the
// answer immediately without waiting for the parent to refetch the school.
const questionnaireOverride = ref<boolean | null>(null);
const questionnairePromptSkipped = ref(false);

// key -> source_path / category, from the DB registry. source_path drives
// inline-edit eligibility; category drives the "Edit in profile" link fallback.
const varSourcePaths = ref<Map<string, string>>(new Map());
const varCategories = ref<Map<string, string>>(new Map());
// key -> source_type; authored vars get a message-only input (filled per send).
const varSourceTypes = ref<Map<string, string>>(new Map());
// Keys marked required — the ONLY ones that block send when unresolved. Optional
// unresolved tokens are stripped by renderClean (empty lines dropped).
const varRequired = ref<Set<string>>(new Set());

// Athlete-owned categories whose non-inline-editable vars link to the profile
// editor. program/event/system/authored come from elsewhere (no profile link).
const PROFILE_CATEGORIES = new Set([
  "player",
  "academics",
  "metrics",
  "contacts",
]);
const PROFILE_EDIT_ROUTE = "/settings/player-details";

// Only the athlete editing their OWN profile can write inline (parents are
// read-only per product policy). activeAthleteId is role-aware.
const canEditProfile = computed(
  () =>
    userStore.isAthlete &&
    !!activeAthleteId.value &&
    activeAthleteId.value === userStore.user?.id,
);

// Load predefined + user templates + the variable registry into this per-mount
// composable instance (without loadTemplates the dropdown only shows "Custom").
onMounted(async () => {
  loadTemplates();
  const registry = await loadRegistry();
  varSourcePaths.value = new Map(
    registry.map((v) => [v.key, v.source_path ?? ""]),
  );
  varCategories.value = new Map(registry.map((v) => [v.key, v.category ?? ""]));
  varSourceTypes.value = new Map(registry.map((v) => [v.key, v.source_type]));
  varRequired.value = new Set(
    registry.filter((v) => v.is_required_default).map((v) => v.key),
  );
  await refreshContactWindow();
  seedOutreachAuthored();
});

// Seed the outreach answers once the school prop resolves (it can load after mount).
watch(() => props.school?.id, seedOutreachAuthored);

// Re-evaluate the window if the target school (division) or the active athlete
// changes — either can flip pre <-> open.
watch(
  () => [props.school?.division, activeAthleteId.value],
  () => {
    refreshContactWindow();
  },
);

// Lazy-loaded, cached per athlete id. activeAthleteId is role-aware:
// athlete-role -> own users.id; parent-role -> the selected child's users.id.
const athleteCtx = ref<ResolverContext | null>(null);
const athleteCtxId = ref<string | null>(null);

const ensureAthleteContext = async (): Promise<ResolverContext> => {
  const id = activeAthleteId.value;
  if (!id) return {};
  if (athleteCtx.value && athleteCtxId.value === id) return athleteCtx.value;
  athleteCtx.value = await buildAthleteContext(id);
  athleteCtxId.value = id;
  return athleteCtx.value;
};

// Per-sport/division NCAA contact window. Defaults to "open" (show the standard
// intro) and only flips to "pre" once we've confirmed the athlete is ahead of
// the date their coaches may reply — the swap is silent to the athlete.
const contactWindowState = ref<"pre" | "open">("open");

const refreshContactWindow = async (): Promise<void> => {
  const ctx = await ensureAthleteContext();
  const gradYear = ctx.tables?.users?.graduation_year as
    number | null | undefined;
  const { state } = await evaluateContactWindow({
    sport: ctx.derived?.sport ?? null,
    division: props.school?.division ?? null,
    gradYear: gradYear ?? null,
  });
  contactWindowState.value = state;
};

const composeFromTemplate = async (
  template: CommunicationTemplate,
  authored: Record<string, string> = {},
): Promise<{
  subject: string;
  body: string;
  values: Record<string, string>;
}> => {
  const ctx = await ensureAthleteContext();
  const baseSchool =
    props.school ?? (props.schoolName ? { name: props.schoolName } : undefined);
  // Reflect an in-session questionnaire answer immediately (before the parent
  // refetches the school row) so the preview updates on Yes/Skip.
  const school =
    baseSchool && questionnaireOverride.value !== null
      ? { ...baseSchool, questionnaire_completed: questionnaireOverride.value }
      : baseSchool;
  const { subject, body, values } = await resolveTemplate(
    template,
    { coach: props.coach as unknown as Row, school: school as Row | undefined },
    ctx,
    authored,
  );
  return { subject, body, values };
};

// --- variables panel + live preview state (Slice 5a/5b) ---------------------
interface PreviewSegment {
  text: string;
  unresolved: boolean;
}
interface VariableRow {
  key: string;
  value: string | null;
  editable: boolean;
  sourcePath: string | null;
  /** Athlete writes this per message (source_type=authored) — message-only input. */
  authored: boolean;
  /** Show an "Edit in profile" link (athlete-owned data that isn't inline-editable). */
  linkToProfile: boolean;
}

// Per-row inline PROFILE-edit state (keyed by variable key, per channel).
const emailInputs = ref<Record<string, string>>({});
const textInputs = ref<Record<string, string>>({});
// Authored per-MESSAGE values (programNote, updateHook, ...). Not persisted —
// they fill the template for this send only. Separate from profile inputs.
const emailAuthored = ref<Record<string, string>>({});
const textAuthored = ref<Record<string, string>>({});

// Nudge to add a stat when the athlete has logged none.
const showAddMetricCta = computed(
  () => (athleteCtx.value?.metrics?.length ?? 0) === 0,
);

// Seed programNote / fitReason from the school's saved answers (they persist per-school
// on send), without clobbering anything the athlete already typed this session.
// Function declaration (hoisted) so onMounted/watch above can reference it.
function seedOutreachAuthored() {
  const s = props.school;
  if (!s) return;
  for (const store of [emailAuthored, textAuthored]) {
    if (!store.value.programNote && s.why_program)
      store.value.programNote = s.why_program;
    if (!store.value.fitReason && s.fit_reason)
      store.value.fitReason = s.fit_reason;
  }
}
// Save error + in-flight row, keyed "<channel>:<key>".
const saveErrors = ref<Record<string, string>>({});
const savingKey = ref<string | null>(null);

const seedInputs = (
  tpl: CommunicationTemplate | null,
  values: Record<string, string>,
): Record<string, string> =>
  Object.fromEntries(templateVarKeys(tpl).map((k) => [k, values[k] ?? ""]));

const emailResolvedValues = ref<Record<string, string>>({});
const textResolvedValues = ref<Record<string, string>>({});
const selectedEmailTemplateObj = ref<CommunicationTemplate | null>(null);
const selectedTextTemplateObj = ref<CommunicationTemplate | null>(null);
const emailSendWarning = ref("");
const textSendWarning = ref("");

/** Render a bare key as its literal {{key}} token (avoids brace nesting in markup). */
const tokenOf = (key: string): string => `{{${key}}}`;

/** Variables that appear in a template's raw subject+body, first-seen order. */
const templateVarKeys = (tpl: CommunicationTemplate | null): string[] =>
  tpl
    ? [...new Set(findUnresolved(`${tpl.subject ?? ""}\n${tpl.body ?? ""}`))]
    : [];

const toRows = (
  tpl: CommunicationTemplate | null,
  values: Record<string, string>,
): VariableRow[] =>
  templateVarKeys(tpl).map((key) => {
    const sourcePath = varSourcePaths.value.get(key) ?? null;
    const editable = canEditProfile.value && !!editableColumnFor(sourcePath);
    const authored = !editable && varSourceTypes.value.get(key) === "authored";
    const linkToProfile =
      !editable &&
      !authored &&
      PROFILE_CATEGORIES.has(varCategories.value.get(key) ?? "");
    return {
      key,
      value: values[key] ?? null,
      editable,
      sourcePath,
      authored,
      linkToProfile,
    };
  });

/** Split rendered body into ordered text/{{unresolved}} segments (no v-html). */
const toSegments = (body: string): PreviewSegment[] => {
  const segments: PreviewSegment[] = [];
  const re = /\{\{\w+\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    if (m.index > last)
      segments.push({ text: body.slice(last, m.index), unresolved: false });
    segments.push({ text: m[0], unresolved: true });
    last = m.index + m[0].length;
  }
  if (last < body.length)
    segments.push({ text: body.slice(last), unresolved: false });
  return segments;
};

const emailVariableRows = computed(() =>
  toRows(selectedEmailTemplateObj.value, emailResolvedValues.value),
);
const textVariableRows = computed(() =>
  toRows(selectedTextTemplateObj.value, textResolvedValues.value),
);
// Cleaned bodies drive preview, the send gate, and the sent/logged message:
// optional-empty tokens/lines are removed; required unresolved tokens remain.
const emailCleanBody = computed(() =>
  renderClean(emailComposer.value.body, {}, varRequired.value),
);
const textCleanBody = computed(() =>
  renderClean(textComposer.value.body, {}, varRequired.value),
);
const emailPreviewSegments = computed(() => toSegments(emailCleanBody.value));
const textPreviewSegments = computed(() => toSegments(textCleanBody.value));
const emailUnresolved = computed(() => [
  ...new Set(findUnresolved(emailCleanBody.value)),
]);
const textUnresolved = computed(() => [
  ...new Set(findUnresolved(textCleanBody.value)),
]);

const showEmailComposer = ref(false);
const showTextComposer = ref(false);

// Focus trap setup for all three modals
const emailDialogRef = ref<HTMLElement | null>(null);
const textDialogRef = ref<HTMLElement | null>(null);
const templateDialogRef = ref<HTMLElement | null>(null);

const { activate: activateEmail, deactivate: deactivateEmail } =
  useFocusTrap(emailDialogRef);
const { activate: activateText, deactivate: deactivateText } =
  useFocusTrap(textDialogRef);
const { activate: activateTemplate, deactivate: deactivateTemplate } =
  useFocusTrap(templateDialogRef);

const handleCloseEmail = () => {
  deactivateEmail();
  showEmailComposer.value = false;
  emailAuthored.value = {};
};

const handleCloseText = () => {
  deactivateText();
  showTextComposer.value = false;
  textAuthored.value = {};
};

const handleCloseTemplate = () => {
  deactivateTemplate();
  showTemplateManager.value = false;
};

const showTemplateManager = ref(false);
const shouldLogInteraction = ref(true);

const selectedEmailTemplate = ref("");
const selectedTextTemplate = ref("");

const emailComposer = ref({ subject: "", body: "" });
const textComposer = ref({ body: "" });

const emailTemplates = computed(() =>
  filterTemplatesByWindow(
    getTemplatesByType("email"),
    contactWindowState.value,
  ),
);
const messageTemplates = computed(() =>
  filterTemplatesByWindow(
    getTemplatesByType("message"),
    contactWindowState.value,
  ),
);

// Watch for template selection — resolve from live athlete/coach/school data.
// Authored variables (programNote, updateHook, ...) stay as {{key}} placeholders
// in the editable body for the athlete to fill at compose time.
watch(selectedEmailTemplate, async (templateId) => {
  if (!templateId) {
    selectedEmailTemplateObj.value = null;
    emailResolvedValues.value = {};
    return;
  }
  const template = emailTemplates.value.find((t) => t.id === templateId);
  if (!template) return;
  const { subject, body, values } = await composeFromTemplate(template);
  emailComposer.value = { subject, body };
  emailResolvedValues.value = values;
  selectedEmailTemplateObj.value = template;
  emailInputs.value = seedInputs(template, values);
  emailAuthored.value = {};
  emailSendWarning.value = "";
  emailSendConfirmed.value = false;
});

watch(selectedTextTemplate, async (templateId) => {
  if (!templateId) {
    selectedTextTemplateObj.value = null;
    textResolvedValues.value = {};
    return;
  }
  const template = messageTemplates.value.find((t) => t.id === templateId);
  if (!template) return;
  const { body, values } = await composeFromTemplate(template);
  textComposer.value = { body };
  textResolvedValues.value = values;
  selectedTextTemplateObj.value = template;
  textInputs.value = seedInputs(template, values);
  textAuthored.value = {};
  textSendWarning.value = "";
  textSendConfirmed.value = false;
});

// Re-run compose for whichever templates are open (after an inline profile save).
const reresolveSelected = async () => {
  if (selectedEmailTemplateObj.value) {
    const r = await composeFromTemplate(
      selectedEmailTemplateObj.value,
      emailAuthored.value,
    );
    emailComposer.value = { subject: r.subject, body: r.body };
    emailResolvedValues.value = r.values;
  }
  if (selectedTextTemplateObj.value) {
    const r = await composeFromTemplate(
      selectedTextTemplateObj.value,
      textAuthored.value,
    );
    textComposer.value = { body: r.body };
    textResolvedValues.value = r.values;
  }
};

// --- questionnaire completion prompt (ask once, skippable) ------------------
const questionnaireCompleted = computed(() =>
  questionnaireOverride.value !== null
    ? questionnaireOverride.value
    : props.school?.questionnaire_completed === true,
);

const activeTemplateUsesQuestionnaire = computed(() =>
  [selectedEmailTemplateObj.value, selectedTextTemplateObj.value].some((t) =>
    (t?.body ?? "").includes("{{questionnaireNote}}"),
  ),
);

// Ask only when a selected template needs the note, the flag is not already
// true, and the athlete hasn't skipped the prompt this session.
const showQuestionnairePrompt = computed(
  () =>
    activeTemplateUsesQuestionnaire.value &&
    !questionnaireCompleted.value &&
    !questionnairePromptSkipped.value,
);

// Yes -> persist to the school (best-effort) and re-render with the line.
// Skip/No -> leave it not-completed; the line stays omitted.
const answerQuestionnaire = async (completed: boolean) => {
  questionnaireOverride.value = completed;
  questionnairePromptSkipped.value = true;
  if (completed && props.school?.id) {
    try {
      await updateSchool(props.school.id, {
        questionnaire_completed: true,
        questionnaire_completed_at: new Date().toISOString(),
      });
    } catch {
      // Non-fatal: the override still renders the line for this session.
    }
  }
  await reresolveSelected();
};

// Persist an inline profile-field edit, then invalidate the cached athlete
// context and re-resolve so the preview + values reflect the new data.
const saveField = async (
  row: VariableRow,
  channel: "email" | "text",
): Promise<void> => {
  if (!row.editable || !row.sourcePath || !activeAthleteId.value) return;
  const inputs = channel === "email" ? emailInputs : textInputs;
  const raw = (inputs.value[row.key] ?? "").trim();
  const errKey = `${channel}:${row.key}`;
  savingKey.value = errKey;
  saveErrors.value = { ...saveErrors.value, [errKey]: "" };
  try {
    await writeField(
      activeAthleteId.value,
      row.sourcePath,
      raw === "" ? null : raw,
    );
    athleteCtxId.value = null; // invalidate cache so ensureAthleteContext refetches
    await reresolveSelected();
  } catch {
    saveErrors.value = {
      ...saveErrors.value,
      [errKey]: "Couldn't save — try again",
    };
  } finally {
    savingKey.value = null;
  }
};

const sendEmail = async () => {
  if (emailUnresolved.value.length > 0) {
    emailSendWarning.value = `Fill these variables before sending: ${emailUnresolved.value.join(", ")}`;
    return;
  }
  emailSendWarning.value = "";

  if (!(await passesSendGuardrails("email"))) return;

  await logSentMessage("email");
  window.location.href = `mailto:${props.coach.email}?subject=${encodeURIComponent(emailComposer.value.subject)}&body=${encodeURIComponent(emailCleanBody.value)}`;

  if (shouldLogInteraction.value) {
    emit("interaction-logged", {
      type: "email",
      direction: "outbound",
      content: emailCleanBody.value,
    });
  }

  emailSendConfirmed.value = false;
  handleCloseEmail();
};

const sendText = async () => {
  if (textUnresolved.value.length > 0) {
    textSendWarning.value = `Fill these variables before sending: ${textUnresolved.value.join(", ")}`;
    return;
  }
  textSendWarning.value = "";

  if (!(await passesSendGuardrails("text"))) return;

  await logSentMessage("text");
  window.location.href = toSmsHref(
    props.coach.phone ?? "",
    textCleanBody.value,
  );

  if (shouldLogInteraction.value) {
    emit("interaction-logged", {
      type: "text",
      direction: "outbound",
      content: textCleanBody.value,
    });
  }

  textSendConfirmed.value = false;
  handleCloseText();
};

// --- Phase 4 send guardrails: dedupe (block) + timing (confirm) + logging -----

/** Returns false when the send should stop (blocked, or awaiting confirm). */
const passesSendGuardrails = async (
  channel: "email" | "text",
): Promise<boolean> => {
  const athleteUserId = activeAthleteId.value;
  if (!athleteUserId) return true; // can't check without an athlete; don't block
  const warnRef = channel === "email" ? emailSendWarning : textSendWarning;
  const confirmedRef =
    channel === "email" ? emailSendConfirmed : textSendConfirmed;
  const authored = channel === "email" ? emailAuthored : textAuthored;
  try {
    const check = await checkSend({
      athleteUserId,
      schoolId: props.school?.id ?? null,
      programNote: authored.value["programNote"] ?? null,
    });
    if (check.programNoteReused) {
      warnRef.value =
        "Your reason for reaching out was already sent to another program. Coaches notice reused messages — make it specific to this program before sending.";
      return false; // hard block
    }
    if (
      !confirmedRef.value &&
      (check.recentContact || check.messageCountToSchool >= 2)
    ) {
      warnRef.value = check.recentContact
        ? `You last messaged this program ${check.daysSinceLastContact ?? "a few"} day(s) ago. Click Send again to send anyway.`
        : `You've already sent ${check.messageCountToSchool} messages here — consider adding more programs. Click Send again to send anyway.`;
      confirmedRef.value = true; // arm; next click proceeds
      return false;
    }
  } catch {
    // A guardrail lookup failure must never block a legitimate send.
  }
  warnRef.value = "";
  return true;
};

const logSentMessage = async (channel: "email" | "text"): Promise<void> => {
  const athleteUserId = activeAthleteId.value;
  if (!athleteUserId) return;
  const tpl =
    channel === "email"
      ? selectedEmailTemplateObj.value
      : selectedTextTemplateObj.value;
  const authored =
    channel === "email" ? emailAuthored.value : textAuthored.value;
  try {
    await logSend({
      athleteUserId,
      schoolId: props.school?.id ?? null,
      coachId: props.coach.id ?? null,
      templateSlug: tpl?.slug ?? null,
      channel,
      programNote: authored["programNote"] ?? null,
      updateHook: authored["updateHook"] ?? null,
      subject: channel === "email" ? emailComposer.value.subject : null,
      body: channel === "email" ? emailCleanBody.value : textCleanBody.value,
    });
  } catch {
    // Logging failure must not block the send.
  }
  await persistOutreachAnswers(authored);
};

// Persist the athlete's why-program / why-fit answers back to the school so they
// prefill next time and show on school detail. Only writes non-empty changes; never
// blocks the send.
const persistOutreachAnswers = async (
  authored: Record<string, string>,
): Promise<void> => {
  const schoolId = props.school?.id;
  if (!schoolId) return;
  const patch: Partial<School> = {};
  const wp = authored["programNote"]?.trim();
  const fr = authored["fitReason"]?.trim();
  if (wp && wp !== (props.school?.why_program ?? "")) patch.why_program = wp;
  if (fr && fr !== (props.school?.fit_reason ?? "")) patch.fit_reason = fr;
  if (Object.keys(patch).length === 0) return;
  try {
    await updateSchool(schoolId, patch);
  } catch {
    // Best-effort — a save failure must not affect the sent message.
  }
};

const openInstagram = () => {
  window.open(
    `https://instagram.com/${props.coach.instagram_handle}`,
    "_blank",
  );
};

// Focus trap activation watchers
watch(showEmailComposer, async (isOpen) => {
  if (isOpen) {
    await nextTick();
    activateEmail();
  } else {
    deactivateEmail();
  }
});

watch(showTextComposer, async (isOpen) => {
  if (isOpen) {
    await nextTick();
    activateText();
  } else {
    deactivateText();
  }
});

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

.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.25s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
}
</style>
