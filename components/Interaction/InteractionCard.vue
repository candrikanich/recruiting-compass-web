<script setup lang="ts">
import type { Interaction } from "~/types/models";
import {
  getTypeIcon,
  getTypeIconBg,
  getTypeIconColor,
  formatType,
  formatDirection,
  formatSentiment,
  getSentimentBadgeClass,
  formatInteractionDateTime,
} from "~/utils/interactionFormatters";
import LoggedByBadge from "~/components/Interaction/LoggedByBadge.vue";

interface Props {
  interaction: Interaction;
  schoolName?: string;
  coachName?: string;
  currentUserId?: string;
  isParent?: boolean;
  clickable?: boolean;
}

interface Emits {
  (event: "view", interaction: Interaction): void;
  (event: "click", interaction: Interaction): void;
}

const props = withDefaults(defineProps<Props>(), {
  schoolName: "",
  coachName: undefined,
  currentUserId: "",
  isParent: false,
  clickable: false,
});

const emit = defineEmits<Emits>();

const handleView = () => {
  emit("view", props.interaction);
};

const handleActivate = () => {
  if (!props.clickable) return;
  emit("click", props.interaction);
};
</script>

<template>
  <div
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    :aria-label="
      clickable
        ? `Open details for ${
            interaction.subject || formatType(interaction.type) + ' interaction'
          }`
        : undefined
    "
    :class="[
      'overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs transition hover:shadow-md',
      clickable
        ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'
        : '',
    ]"
    @click="handleActivate"
    @keydown.enter="handleActivate"
    @keydown.space.prevent="handleActivate"
  >
    <div class="p-5">
      <div class="flex items-start justify-between gap-4">
        <div class="flex min-w-0 flex-1 items-start gap-4">
          <!-- Type Icon -->
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            :class="getTypeIconBg(interaction.type)"
          >
            <component
              :is="getTypeIcon(interaction.type)"
              class="h-5 w-5"
              :class="getTypeIconColor(interaction.type)"
              aria-hidden="true"
            />
          </div>

          <div class="min-w-0 flex-1">
            <!-- Header -->
            <div class="mb-1">
              <span class="font-semibold text-slate-900">{{
                formatType(interaction.type)
              }}</span>
            </div>

            <!-- Subject -->
            <p
              v-if="interaction.subject"
              class="truncate font-medium text-slate-900"
            >
              {{ interaction.subject }}
            </p>

            <!-- School & Coach -->
            <p v-if="schoolName" class="mt-1 text-sm text-slate-500">
              {{ schoolName }}
              <span v-if="coachName" class="text-slate-400">
                &bull; {{ coachName }}
              </span>
            </p>

            <!-- Content Preview -->
            <p
              v-if="interaction.content"
              class="mt-2 line-clamp-2 text-sm text-slate-600"
            >
              {{ interaction.content }}
            </p>

            <!-- Meta -->
            <div class="mt-3 flex items-center gap-4 text-xs text-slate-400">
              <span class="flex items-center gap-1">
                <UIcon
                  name="i-heroicons-calendar"
                  class="h-3.5 w-3.5"
                  aria-hidden="true"
                />
                {{
                  formatInteractionDateTime(
                    interaction.occurred_at || interaction.created_at,
                  )
                }}
              </span>
              <span
                v-if="
                  interaction.attachments && interaction.attachments.length > 0
                "
                class="flex items-center gap-1"
              >
                <UIcon
                  name="i-heroicons-paper-clip"
                  class="h-3.5 w-3.5"
                  aria-hidden="true"
                />
                {{ interaction.attachments.length }} file(s)
              </span>
            </div>

            <!-- Badges -->
            <div class="mt-2 flex items-center gap-1.5">
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="
                  interaction.direction === 'outbound'
                    ? 'bg-blue-100 text-blue-900'
                    : 'bg-emerald-100 text-emerald-900'
                "
              >
                {{ formatDirection(interaction.direction) }}
              </span>
              <LoggedByBadge
                v-if="interaction.logged_by"
                :loggedByUserId="interaction.logged_by"
                :currentUserId="currentUserId"
              />
              <span
                v-if="interaction.sentiment"
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="getSentimentBadgeClass(interaction.sentiment)"
              >
                {{ formatSentiment(interaction.sentiment) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Action -->
        <button
          @click.stop="handleView"
          @keydown.enter.stop
          @keydown.space.stop
          :aria-label="
            interaction.subject
              ? 'View details for ' + interaction.subject
              : 'View interaction details'
          "
          class="min-h-[44px] shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50 focus:outline-2 focus:outline-offset-1 focus:outline-blue-600"
        >
          View
        </button>
      </div>
    </div>
  </div>
</template>
