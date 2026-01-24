<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-gray-900">Social Analytics</h1>
        <p class="text-gray-600 mt-2">
          Trends and insights from coach and program social media
        </p>
      </div>

      <!-- Time Range Selector -->
      <div class="bg-white rounded-lg shadow p-4 mb-8">
        <div class="flex gap-2">
          <button
            v-for="range in timeRanges"
            :key="range.value"
            @click="selectedRange = range.value"
            :class="[
              'px-4 py-2 rounded-lg font-medium transition',
              selectedRange === range.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
            ]"
          >
            {{ range.label }}
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-600">Loading analytics...</p>
      </div>

      <template v-else>
        <!-- Summary Stats -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div class="bg-white rounded-lg shadow p-6">
            <p class="text-sm font-medium text-gray-600">Total Posts</p>
            <p class="text-3xl font-bold text-gray-900 mt-2">
              {{ totalPosts }}
            </p>
            <p class="text-xs text-gray-500 mt-1">in selected period</p>
          </div>
          <div class="bg-white rounded-lg shadow p-6">
            <p class="text-sm font-medium text-gray-600">Recruiting Posts</p>
            <p class="text-3xl font-bold text-green-600 mt-2">
              {{ recruitingPosts }}
            </p>
            <p class="text-xs text-gray-500 mt-1">
              {{ recruitingPercentage }}% of total
            </p>
          </div>
          <div class="bg-white rounded-lg shadow p-6">
            <p class="text-sm font-medium text-gray-600">Positive Sentiment</p>
            <p class="text-3xl font-bold text-blue-600 mt-2">
              {{ positivePosts }}
            </p>
            <p class="text-xs text-gray-500 mt-1">
              {{ positivePercentage }}% of analyzed
            </p>
          </div>
          <div class="bg-white rounded-lg shadow p-6">
            <p class="text-sm font-medium text-gray-600">Active Schools</p>
            <p class="text-3xl font-bold text-purple-600 mt-2">
              {{ activeSchools }}
            </p>
            <p class="text-xs text-gray-500 mt-1">with recent posts</p>
          </div>
        </div>

        <!-- Charts Row -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <!-- Sentiment Distribution -->
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">
              Sentiment Distribution
            </h3>
            <div class="space-y-3">
              <div
                v-for="sentiment in sentimentStats"
                :key="sentiment.type"
                class="flex items-center"
              >
                <span class="w-24 text-sm text-gray-600">{{
                  sentiment.label
                }}</span>
                <div
                  class="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden mx-3"
                >
                  <div
                    :class="['h-full rounded-full', sentiment.colorClass]"
                    :style="{ width: sentiment.percentage + '%' }"
                  />
                </div>
                <span
                  class="w-12 text-sm font-medium text-gray-900 text-right"
                  >{{ sentiment.count }}</span
                >
              </div>
            </div>
          </div>

          <!-- Platform Distribution -->
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">
              Platform Distribution
            </h3>
            <div class="flex items-center justify-center gap-8">
              <div class="text-center">
                <ShareIcon class="w-12 h-12 mx-auto mb-2 text-blue-600" />
                <p class="text-2xl font-bold text-blue-600">
                  {{ twitterCount }}
                </p>
                <p class="text-sm text-gray-600">Twitter/X</p>
              </div>
              <div class="text-center">
                <PhotoIcon class="w-12 h-12 mx-auto mb-2 text-pink-600" />
                <p class="text-2xl font-bold text-pink-600">
                  {{ instagramCount }}
                </p>
                <p class="text-sm text-gray-600">Instagram</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Activity by Day -->
        <div class="bg-white rounded-lg shadow p-6 mb-8">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">
            Activity by Day
          </h3>
          <div class="flex items-end gap-1 h-40">
            <div
              v-for="day in activityByDay"
              :key="day.date"
              class="flex-1 group relative"
            >
              <div
                class="bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                :style="{
                  height: day.height + '%',
                  minHeight: day.count > 0 ? '4px' : '0',
                }"
              />
              <div
                class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none"
              >
                {{ day.label }}: {{ day.count }} posts
              </div>
            </div>
          </div>
          <div class="flex justify-between mt-2 text-xs text-gray-500">
            <span>{{ activityByDay[0]?.label || "" }}</span>
            <span>{{
              activityByDay[activityByDay.length - 1]?.label || ""
            }}</span>
          </div>
        </div>

        <!-- Top Schools by Posts -->
        <div class="bg-white rounded-lg shadow p-6 mb-8">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">
            Most Active Schools
          </h3>
          <div
            v-if="topSchools.length === 0"
            class="text-gray-500 text-center py-4"
          >
            No school activity in selected period
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="(school, index) in topSchools"
              :key="school.id"
              class="flex items-center gap-4"
            >
              <span class="w-6 text-sm font-bold text-gray-400">{{
                index + 1
              }}</span>
              <NuxtLink
                :to="`/schools/${school.id}`"
                class="flex-1 font-medium text-gray-900 hover:text-blue-600"
              >
                {{ school.name }}
              </NuxtLink>
              <span class="text-sm font-semibold text-blue-600"
                >{{ school.postCount }} posts</span
              >
            </div>
          </div>
        </div>

        <!-- Recent Recruiting Posts -->
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-900">
              Recent Recruiting Posts
            </h3>
            <NuxtLink
              to="/social"
              class="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All →
            </NuxtLink>
          </div>
          <div
            v-if="recentRecruitingPosts.length === 0"
            class="text-gray-500 text-center py-4"
          >
            No recruiting posts in selected period
          </div>
          <div v-else class="space-y-4">
            <div
              v-for="post in recentRecruitingPosts"
              :key="post.id"
              class="border-l-4 border-green-400 pl-4 py-2"
            >
              <div class="flex items-center gap-2 mb-1">
                <ShareIcon
                  v-if="post.platform === 'twitter'"
                  class="w-4 h-4 text-blue-600"
                />
                <PhotoIcon v-else class="w-4 h-4 text-pink-600" />
                <span class="font-medium text-gray-900"
                  >@{{ post.author_handle }}</span
                >
                <span class="text-xs text-gray-500">{{
                  formatDate(post.post_date)
                }}</span>
              </div>
              <p class="text-sm text-gray-700 line-clamp-2">
                {{ post.post_content }}
              </p>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { ShareIcon, PhotoIcon } from "@heroicons/vue/24/outline";
import { useSocialMedia } from "~/composables/useSocialMedia";
import { useSchools } from "~/composables/useSchools";

definePageMeta({
  middleware: "auth",
});

const { posts, loading, fetchPosts } = useSocialMedia();
const { schools, fetchSchools } = useSchools();

const timeRanges = [
  { label: "7 Days", value: 7 },
  { label: "30 Days", value: 30 },
  { label: "90 Days", value: 90 },
  { label: "All Time", value: 0 },
];

const selectedRange = ref(30);

const schoolMap = ref<Record<string, string>>({});

// Filter posts by time range
const filteredPosts = computed(() => {
  if (selectedRange.value === 0) return posts.value;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - selectedRange.value);
  return posts.value.filter((p) => new Date(p.post_date) >= cutoff);
});

// Summary stats
const totalPosts = computed(() => filteredPosts.value.length);
const recruitingPosts = computed(
  () => filteredPosts.value.filter((p) => p.is_recruiting_related).length,
);
const recruitingPercentage = computed(() =>
  totalPosts.value > 0
    ? Math.round((recruitingPosts.value / totalPosts.value) * 100)
    : 0,
);
const positivePosts = computed(
  () =>
    filteredPosts.value.filter(
      (p) => p.sentiment === "positive" || p.sentiment === "very_positive",
    ).length,
);
const positivePercentage = computed(() => {
  const analyzed = filteredPosts.value.filter((p) => p.sentiment).length;
  return analyzed > 0 ? Math.round((positivePosts.value / analyzed) * 100) : 0;
});
const activeSchools = computed(() => {
  const schoolIds = new Set(
    filteredPosts.value.map((p) => p.school_id).filter(Boolean),
  );
  return schoolIds.size;
});

// Platform counts
const twitterCount = computed(
  () => filteredPosts.value.filter((p) => p.platform === "twitter").length,
);
const instagramCount = computed(
  () => filteredPosts.value.filter((p) => p.platform === "instagram").length,
);

// Sentiment stats
const sentimentStats = computed(() => {
  const counts = {
    very_positive: 0,
    positive: 0,
    neutral: 0,
    negative: 0,
  };

  filteredPosts.value.forEach((p) => {
    if (p.sentiment && counts[p.sentiment] !== undefined) {
      counts[p.sentiment]++;
    }
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return [
    {
      type: "very_positive",
      label: "🔥 Very Positive",
      count: counts.very_positive,
      percentage: total > 0 ? (counts.very_positive / total) * 100 : 0,
      colorClass: "bg-green-500",
    },
    {
      type: "positive",
      label: "👍 Positive",
      count: counts.positive,
      percentage: total > 0 ? (counts.positive / total) * 100 : 0,
      colorClass: "bg-blue-500",
    },
    {
      type: "neutral",
      label: "😐 Neutral",
      count: counts.neutral,
      percentage: total > 0 ? (counts.neutral / total) * 100 : 0,
      colorClass: "bg-gray-400",
    },
    {
      type: "negative",
      label: "👎 Negative",
      count: counts.negative,
      percentage: total > 0 ? (counts.negative / total) * 100 : 0,
      colorClass: "bg-red-500",
    },
  ];
});

// Activity by day
const activityByDay = computed(() => {
  const days = selectedRange.value || 30;
  const result: {
    date: string;
    label: string;
    count: number;
    height: number;
  }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const count = filteredPosts.value.filter((p) =>
      p.post_date.startsWith(dateStr),
    ).length;
    result.push({
      date: dateStr,
      label: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      count,
      height: 0,
    });
  }

  const maxCount = Math.max(...result.map((d) => d.count), 1);
  result.forEach((d) => {
    d.height = (d.count / maxCount) * 100;
  });

  return result;
});

// Top schools
const topSchools = computed(() => {
  const schoolCounts: Record<string, number> = {};
  filteredPosts.value.forEach((p) => {
    if (p.school_id) {
      schoolCounts[p.school_id] = (schoolCounts[p.school_id] || 0) + 1;
    }
  });

  return Object.entries(schoolCounts)
    .map(([id, count]) => ({
      id,
      name: schoolMap.value[id] || "Unknown School",
      postCount: count,
    }))
    .sort((a, b) => b.postCount - a.postCount)
    .slice(0, 5);
});

// Recent recruiting posts
const recentRecruitingPosts = computed(() =>
  filteredPosts.value.filter((p) => p.is_recruiting_related).slice(0, 5),
);

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

onMounted(async () => {
  await fetchSchools();
  schools.value.forEach((school) => {
    schoolMap.value[school.id] = school.name;
  });
  await fetchPosts();
});
</script>
