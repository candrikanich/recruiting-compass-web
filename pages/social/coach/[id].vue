<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Back Link -->
      <div class="mb-6">
        <NuxtLink
          to="/social"
          class="text-blue-600 hover:text-blue-700 font-semibold"
        >
          ← Back to Social Feed
        </NuxtLink>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-600">Loading coach profile and posts...</p>
      </div>

      <!-- Error State -->
      <div
        v-if="error"
        class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"
      >
        <p class="text-red-700">{{ error }}</p>
      </div>

      <!-- Coach Not Found -->
      <div
        v-if="!loading && !coach"
        class="bg-white rounded-lg shadow p-8 text-center"
      >
        <p class="text-gray-600">Coach not found</p>
      </div>

      <!-- Coach Header & Content -->
      <div v-if="!loading && coach" class="space-y-6">
        <!-- Coach Header Card -->
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h1 class="text-4xl font-bold text-gray-900">
                {{ coach.first_name }} {{ coach.last_name }}
              </h1>
              <p class="text-lg text-gray-600 mt-1">
                {{ roleLabel(coach.role) }}
              </p>
              <p class="text-sm text-gray-500 mt-1" v-if="schoolName">
                {{ schoolName }}
              </p>
            </div>
          </div>

          <!-- Contact Information -->
          <div
            class="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-t border-gray-200"
          >
            <div v-if="coach.twitter_handle" class="flex items-center">
              <ShareIcon class="w-5 h-5 text-blue-400 mr-3" />
              <div>
                <p class="text-xs text-gray-500">Twitter/X</p>
                <a
                  :href="`https://twitter.com/${coach.twitter_handle.replace('@', '')}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue-600 hover:underline"
                >
                  {{ coach.twitter_handle }}
                </a>
              </div>
            </div>

            <div v-if="coach.instagram_handle" class="flex items-center">
              <PhotoIcon class="w-5 h-5 text-pink-600 mr-3" />
              <div>
                <p class="text-xs text-gray-500">Instagram</p>
                <a
                  :href="`https://instagram.com/${coach.instagram_handle.replace('@', '')}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue-600 hover:underline"
                >
                  {{ coach.instagram_handle }}
                </a>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
            <NuxtLink
              :to="`/coaches/${coach.id}`"
              class="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"
            >
              👤 View Coach Profile
            </NuxtLink>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-white rounded-lg shadow p-6">
            <p class="text-sm font-medium text-gray-600">Total Posts</p>
            <p class="text-3xl font-bold text-gray-900 mt-2">
              {{ coachPosts.length }}
            </p>
          </div>
          <div class="bg-white rounded-lg shadow p-6">
            <p class="text-sm font-medium text-gray-600">Twitter/X Posts</p>
            <p class="text-3xl font-bold text-blue-600 mt-2">
              {{ coachTwitterCount }}
            </p>
          </div>
          <div class="bg-white rounded-lg shadow p-6">
            <p class="text-sm font-medium text-gray-600">Instagram Posts</p>
            <p class="text-3xl font-bold text-pink-600 mt-2">
              {{ coachInstagramCount }}
            </p>
          </div>
          <div class="bg-white rounded-lg shadow p-6">
            <p class="text-sm font-medium text-gray-600">Flagged for Review</p>
            <p class="text-3xl font-bold text-amber-600 mt-2">
              {{ coachFlaggedCount }}
            </p>
          </div>
        </div>

        <!-- Posts List -->
        <div
          v-if="coachPosts.length === 0"
          class="bg-white rounded-lg shadow p-12 text-center"
        >
          <p class="text-gray-600 mb-2">No posts from this coach</p>
          <p class="text-sm text-gray-500">
            Social posts will appear here once {{ coach.first_name }} posts on
            tracked accounts
          </p>
        </div>

        <div v-else class="space-y-4">
          <SocialPostCard
            v-for="post in coachPosts"
            :key="post.id"
            :post="post"
            :school-name="schoolName"
            :coach-name="`${coach.first_name} ${coach.last_name}`"
            @flag-toggle="togglePostFlag(post.id, $event)"
            @delete="deletePost(post.id)"
            @notes-save="savePostNotes(post.id, $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { ShareIcon, PhotoIcon } from "@heroicons/vue/24/outline";
import { useCoaches } from "~/composables/useCoaches";
import { useSchools } from "~/composables/useSchools";
import { useSocialMedia } from "~/composables/useSocialMedia";
import type { Coach } from "~/types/models";

definePageMeta({
  middleware: "auth",
});

const route = useRoute();
const coachId = route.params.id as string;

const { getCoach } = useCoaches();
const { getSchool } = useSchools();
const {
  posts: allPosts,
  loading,
  error,
  fetchPosts,
  toggleFlagged,
  deletePost: deleteSocialPost,
  updatePost,
} = useSocialMedia();

const coach = ref<Coach | null>(null);
const schoolName = ref("");

const coachPosts = computed(() => {
  return allPosts.value.filter((p) => p.coach_id === coachId);
});

const coachTwitterCount = computed(
  () => coachPosts.value.filter((p) => p.platform === "twitter").length,
);
const coachInstagramCount = computed(
  () => coachPosts.value.filter((p) => p.platform === "instagram").length,
);
const coachFlaggedCount = computed(
  () => coachPosts.value.filter((p) => p.flagged_for_review).length,
);

const roleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    head: "Head Coach",
    assistant: "Assistant Coach",
    recruiting: "Recruiting Coordinator",
  };
  return labels[role] || role;
};

const togglePostFlag = async (postId: string, flagged: boolean) => {
  try {
    await toggleFlagged(postId, flagged);
  } catch (err) {
    console.error("Failed to toggle post flag:", err);
  }
};

const deletePost = async (postId: string) => {
  try {
    await deleteSocialPost(postId);
  } catch (err) {
    console.error("Failed to delete post:", err);
  }
};

const savePostNotes = async (postId: string, notes: string) => {
  try {
    await updatePost(postId, { notes });
  } catch (err) {
    console.error("Failed to save notes:", err);
  }
};

onMounted(async () => {
  try {
    // Fetch coach details
    const coachData = await getCoach(coachId);
    if (coachData) {
      coach.value = coachData;

      // Fetch school name
      if (coachData.school_id) {
        const schoolData = await getSchool(coachData.school_id);
        if (schoolData) {
          schoolName.value = schoolData.name;
        }
      }

      // Fetch posts for this coach
      await fetchPosts({ coachId });
    }
  } catch (err) {
    console.error("Error loading data:", err);
  }
});
</script>
