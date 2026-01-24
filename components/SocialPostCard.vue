<template>
  <div
    class="rounded-lg shadow hover:shadow-lg transition p-6 border-l-4"
    :class="[
      post.flagged_for_review
        ? 'bg-orange-50 border-l-orange-400'
        : 'bg-white border-l-slate-300',
    ]"
  >
    <!-- Header -->
    <div class="flex items-start justify-between mb-4">
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-2">
          <ShareIcon
            v-if="post.platform === 'twitter'"
            class="w-6 h-6 text-blue-600"
          />
          <PhotoIcon v-else class="w-6 h-6 text-purple-600" />
          <div>
            <p class="font-semibold text-slate-900">{{ post.author_name }}</p>
            <p class="text-sm text-slate-600">@{{ post.author_handle }}</p>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-2">
        <button
          @click="toggleFlag"
          :class="[
            'px-3 py-1 text-xs font-semibold rounded transition',
            post.flagged_for_review
              ? 'bg-orange-200 text-orange-800 hover:opacity-80'
              : 'bg-slate-50 text-slate-900 hover:opacity-80',
          ]"
          :title="post.flagged_for_review ? 'Unflag' : 'Flag for review'"
        >
          {{ post.flagged_for_review ? "📌 Flagged" : "🚩 Flag" }}
        </button>

        <a
          :href="post.post_url"
          target="_blank"
          rel="noopener noreferrer"
          class="px-3 py-1 text-xs font-semibold rounded transition bg-blue-100 text-blue-700 hover:bg-blue-200"
        >
          View
        </a>

        <button
          @click="deletePost"
          class="px-3 py-1 text-xs font-semibold rounded transition bg-red-600 text-white hover:opacity-90"
        >
          Delete
        </button>
      </div>
    </div>

    <!-- Badges -->
    <div class="flex gap-2 mb-3 flex-wrap">
      <span
        v-if="post.is_recruiting_related"
        class="inline-block px-2 py-1 text-xs font-semibold rounded bg-emerald-100 text-emerald-800"
      >
        🎯 Recruiting
      </span>
      <span
        v-if="post.sentiment"
        class="inline-block px-2 py-1 text-xs font-semibold rounded"
        :class="getSentimentClass()"
      >
        {{ sentimentEmoji }} {{ sentimentLabel }}
      </span>
    </div>

    <!-- Post Content -->
    <div class="mb-4">
      <p class="whitespace-pre-wrap text-sm line-clamp-6 text-slate-900">
        {{ post.post_content }}
      </p>
    </div>

    <!-- Metadata -->
    <div
      class="flex items-center justify-between pt-4 text-xs border-t border-slate-300 text-slate-600"
    >
      <span>{{ formatDate(post.post_date) }}</span>
      <div class="flex gap-2">
        <span v-if="schoolName" class="text-slate-900 font-medium">{{
          schoolName
        }}</span>
        <NuxtLink
          v-if="coachName && post.coach_id"
          :to="`/social/coach/${post.coach_id}`"
          class="text-blue-600 font-medium hover:underline"
        >
          {{ coachName }}
        </NuxtLink>
        <span v-else-if="coachName" class="text-blue-600 font-medium">{{
          coachName
        }}</span>
      </div>
    </div>

    <!-- Notes Section -->
    <div v-if="showNotes" class="mt-4 pt-4 border-t border-slate-300">
      <textarea
        v-model="localNotes"
        placeholder="Add notes about this post..."
        rows="3"
        class="w-full px-3 py-2 rounded-lg text-sm border border-slate-300 text-slate-900 bg-white"
      />
      <div class="flex gap-2 mt-2">
        <button
          @click="saveNotes"
          class="flex-1 px-3 py-1 text-xs font-semibold rounded transition bg-blue-600 text-white hover:bg-blue-700"
        >
          Save Notes
        </button>
        <button
          @click="showNotes = false"
          class="flex-1 px-3 py-1 text-xs font-semibold rounded transition bg-slate-50 text-slate-900 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </div>
    <button
      v-else-if="post.notes"
      @click="showNotes = true"
      class="mt-3 text-xs font-semibold text-blue-600"
    >
      📝 Edit Notes
    </button>
    <button
      v-else
      @click="showNotes = true"
      class="mt-3 text-xs font-semibold text-slate-600"
    >
      + Add Notes
    </button>

    <!-- Notes Display -->
    <div
      v-if="post.notes && !showNotes"
      class="mt-4 pt-4 border-t border-slate-300"
    >
      <p class="text-sm text-slate-900">{{ post.notes }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { ShareIcon, PhotoIcon } from "@heroicons/vue/24/outline";
import type { SocialPost } from "~/composables/useSocialMedia";
import {
  getSentimentEmoji,
  getSentimentColor,
  getSentimentLabel,
} from "~/utils/sentimentAnalysis";

interface Props {
  post: SocialPost;
  schoolName?: string;
  coachName?: string;
}

const props = withDefaults(defineProps<Props>(), {
  schoolName: "",
  coachName: "",
});

const emit = defineEmits<{
  "flag-toggle": [flagged: boolean];
  delete: [];
  "notes-save": [notes: string];
}>();

const showNotes = ref(false);
const localNotes = ref(props.post.notes || "");

const sentimentEmoji = computed(() => getSentimentEmoji(props.post.sentiment));
const sentimentColorClass = computed(() =>
  getSentimentColor(props.post.sentiment),
);
const sentimentLabel = computed(() => getSentimentLabel(props.post.sentiment));

const getSentimentClass = (): string => {
  const sentiment = props.post.sentiment;
  if (sentiment === "positive") return "bg-blue-100 text-blue-800";
  if (sentiment === "negative") return "bg-red-600 text-white opacity-90";
  if (sentiment === "neutral") return "bg-slate-100 text-slate-900";
  return "bg-slate-100 text-slate-900";
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    if (diffHours === 0) return "just now";
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const toggleFlag = () => {
  emit("flag-toggle", !props.post.flagged_for_review);
};

const deletePost = () => {
  if (confirm("Delete this post?")) {
    emit("delete");
  }
};

const saveNotes = () => {
  emit("notes-save", localNotes.value);
  showNotes.value = false;
};
</script>
