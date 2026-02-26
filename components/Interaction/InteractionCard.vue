<script setup lang="ts">
import { CalendarIcon, PaperClipIcon } from "@heroicons/vue/24/outline";
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
}

interface Emits {
  (event: "view", interaction: Interaction): void;
}

const props = withDefaults(defineProps<Props>(), {
  schoolName: "",
  coachName: undefined,
  currentUserId: "",
  isParent: false,
});

const emit = defineEmits<Emits>();

const handleView = () => {
  emit("view", props.interaction);
};
</script>

<template>
  <div
    class="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden"
  >
    <div class="p-5">
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-start gap-4 flex-1 min-w-0">
          <!-- Type Icon -->
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            :class="getTypeIconBg(interaction.type)"
          >
            <component
              :is="getTypeIcon(interaction.type)"
              class="w-5 h-5"
              :class="getTypeIconColor(interaction.type)"
              aria-hidden="true"
            />
          </div>

          <div class="flex-1 min-w-0">
            <!-- Header -->
            <div class="mb-1">
              <span class="font-semibold text-slate-900">{{
                formatType(interaction.type)
              }}</span>
            </div>

            <!-- Subject -->
            <p
              v-if="interaction.subject"
              class="text-slate-900 font-medium truncate"
            >
              {{ interaction.subject }}
            </p>

            <!-- School & Coach -->
            <p v-if="schoolName" class="text-sm text-slate-500 mt-1">
              {{ schoolName }}
              <span v-if="coachName" class="text-slate-400">
                &bull; {{ coachName }}
              </span>
            </p>

            <!-- Content Preview -->
            <p
              v-if="interaction.content"
              class="text-sm text-slate-600 mt-2 line-clamp-2"
            >
              {{ interaction.content }}
            </p>

            <!-- Meta -->
            <div class="flex items-center gap-4 mt-3 text-xs text-slate-400">
              <span class="flex items-center gap-1">
                <CalendarIcon class="w-3.5 h-3.5" aria-hidden="true" />
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
                <PaperClipIcon class="w-3.5 h-3.5" aria-hidden="true" />
                {{ interaction.attachments.length }} file(s)
              </span>
            </div>

            <!-- Badges -->
            <div class="flex items-center gap-1.5 mt-2">
              <span
                class="px-2 py-0.5 text-xs font-medium rounded-full"
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
                class="px-2 py-0.5 text-xs font-medium rounded-full"
                :class="getSentimentBadgeClass(interaction.sentiment)"
              >
                {{ formatSentiment(interaction.sentiment) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Action -->
        <button
          @click="handleView"
          :aria-label="
            interaction.subject
              ? 'View details for ' + interaction.subject
              : 'View interaction details'
          "
          class="px-4 py-2.5 min-h-[44px] text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition flex-shrink-0 focus:outline-2 focus:outline-blue-600 focus:outline-offset-1"
        >
          View
        </button>
      </div>
    </div>
  </div>
</template>
