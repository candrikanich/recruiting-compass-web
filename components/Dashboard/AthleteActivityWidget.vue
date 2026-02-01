<template>
  <div
    v-if="linkedAthletes.length > 0"
    class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
  >
    <!-- Header -->
    <div class="px-6 py-4 border-b border-slate-200 bg-slate-50">
      <h2 class="text-lg font-semibold text-slate-900">Athlete Activity</h2>
      <p class="text-sm text-slate-600 mt-1">
        Recent interactions logged by your linked athlete{{
          linkedAthletes.length > 1 ? "s" : ""
        }}
      </p>
    </div>

    <!-- Content -->
    <div v-if="loading" class="p-6 text-center">
      <div
        class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"
      ></div>
      <p class="text-slate-600 mt-2 text-sm">Loading activity...</p>
    </div>

    <div v-else-if="recentInteractions.length === 0" class="p-6 text-center">
      <ChatBubbleLeftRightIcon class="w-8 h-8 text-slate-300 mx-auto mb-2" />
      <p class="text-slate-600 text-sm">
        No interactions logged yet by your athlete
      </p>
    </div>

    <div v-else class="divide-y divide-slate-200">
      <!-- Interaction Items -->
      <div
        v-for="interaction in recentInteractions"
        :key="interaction.id"
        class="px-6 py-4 hover:bg-slate-50 transition cursor-pointer"
        @click="navigateToInteraction(interaction.id)"
      >
        <div class="flex items-start gap-3">
          <!-- Type Icon -->
          <div
            class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            :class="getTypeIconBg(interaction.type)"
          >
            <component
              :is="getTypeIcon(interaction.type)"
              class="w-4 h-4"
              :class="getTypeIconColor(interaction.type)"
            />
          </div>

          <div class="flex-1 min-w-0">
            <!-- Title and Metadata -->
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <span class="font-medium text-slate-900">
                {{ formatType(interaction.type) }}
              </span>
              <span
                class="px-2 py-0.5 text-xs font-medium rounded-full"
                :class="
                  interaction.direction === 'outbound'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-emerald-100 text-emerald-700'
                "
              >
                {{ formatDirection(interaction.direction) }}
              </span>
            </div>

            <!-- Subject/Preview -->
            <p
              v-if="interaction.subject"
              class="text-sm text-slate-700 font-medium truncate"
            >
              {{ interaction.subject }}
            </p>

            <!-- School and Coach -->
            <p class="text-xs text-slate-500 mt-1">
              {{ getSchoolName(interaction.school_id) }}
              <span v-if="interaction.coach_id" class="text-slate-400">
                • {{ getCoachName(interaction.coach_id) }}
              </span>
            </p>

            <!-- Date -->
            <p class="text-xs text-slate-400 mt-1">
              {{
                formatDate(interaction.occurred_at || interaction.created_at)
              }}
            </p>
          </div>
        </div>
      </div>

      <!-- View All Link -->
      <div class="px-6 py-3 bg-slate-50 border-t border-slate-200">
        <NuxtLink
          to="/interactions"
          class="text-sm font-medium text-blue-600 hover:text-blue-700 transition"
        >
          View all athlete interactions →
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, type Component } from "vue";
import { useSupabase } from "~/composables/useSupabase";
import { useUserStore } from "~/stores/user";
import { useSchools } from "~/composables/useSchools";
import { useCoaches } from "~/composables/useCoaches";
import type { Interaction, User } from "~/types/models";
import {
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  VideoCameraIcon,
  UserGroupIcon,
} from "@heroicons/vue/24/outline";

const supabase = useSupabase();
const userStore = useUserStore();
const { schools: schoolsData } = useSchools();
const { coaches: coachesData } = useCoaches();

const linkedAthletes = ref<User[]>([]);
const recentInteractions = ref<Interaction[]>([]);
const loading = ref(true);

const schools = computed(() => schoolsData.value);
const coaches = computed(() => coachesData.value);

const getTypeIcon = (type: string): Component => {
  const icons: Record<string, Component> = {
    email: EnvelopeIcon,
    text: ChatBubbleLeftIcon,
    phone_call: PhoneIcon,
    in_person_visit: UserGroupIcon,
    virtual_meeting: VideoCameraIcon,
    camp: UserGroupIcon,
    showcase: UserGroupIcon,
    tweet: ChatBubbleLeftIcon,
    dm: ChatBubbleLeftIcon,
  };
  return icons[type] || ChatBubbleLeftIcon;
};

const getTypeIconBg = (type: string): string => {
  const bgs: Record<string, string> = {
    email: "bg-blue-100",
    text: "bg-green-100",
    phone_call: "bg-purple-100",
    in_person_visit: "bg-amber-100",
    virtual_meeting: "bg-indigo-100",
    camp: "bg-orange-100",
    showcase: "bg-pink-100",
    tweet: "bg-sky-100",
    dm: "bg-violet-100",
  };
  return bgs[type] || "bg-slate-100";
};

const getTypeIconColor = (type: string): string => {
  const colors: Record<string, string> = {
    email: "text-blue-600",
    text: "text-green-600",
    phone_call: "text-purple-600",
    in_person_visit: "text-amber-600",
    virtual_meeting: "text-indigo-600",
    camp: "text-orange-600",
    showcase: "text-pink-600",
    tweet: "text-sky-600",
    dm: "text-violet-600",
  };
  return colors[type] || "text-slate-600";
};

const formatType = (type: string): string => {
  const typeMap: Record<string, string> = {
    email: "Email",
    text: "Text",
    phone_call: "Phone Call",
    in_person_visit: "In-Person Visit",
    virtual_meeting: "Virtual Meeting",
    camp: "Camp",
    showcase: "Showcase",
    tweet: "Tweet",
    dm: "Direct Message",
  };
  return typeMap[type] || type;
};

const formatDirection = (direction: string): string => {
  return direction === "outbound" ? "Outbound" : "Inbound";
};

const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return "Unknown";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getSchoolName = (schoolId: string | undefined): string => {
  if (!schoolId) return "Unknown";
  return schools.value.find((s) => s.id === schoolId)?.name || "Unknown";
};

const getCoachName = (coachId: string | undefined): string => {
  if (!coachId) return "Unknown";
  const coach = coaches.value.find((c) => c.id === coachId);
  return coach ? `${coach.first_name} ${coach.last_name}` : "Unknown";
};

const navigateToInteraction = (interactionId: string) => {
  navigateTo(`/interactions/${interactionId}`);
};

onMounted(async () => {
  if (!userStore.isParent || !userStore.user) {
    loading.value = false;
    return;
  }

  try {
    // Fetch linked athletes
    const { data: accountLinks, error: linksError } = await supabase
      .from("account_links")
      .select("player_user_id")
      .eq("parent_user_id", userStore.user.id);

    if (linksError) {
      console.error("Failed to fetch linked accounts:", linksError);
      loading.value = false;
      return;
    }

    if (!accountLinks || accountLinks.length === 0) {
      loading.value = false;
      return;
    }

    const athleteIds = accountLinks
      .map((link) => link.player_user_id)
      .filter((id): id is string => id !== null);

    if (athleteIds.length === 0) {
      loading.value = false;
      return;
    }

    // Fetch athlete user data
    const { data: athletes, error: athletesError } = await supabase
      .from("users")
      .select("*")
      .in("id", athleteIds);

    if (athletesError) {
      console.error("Failed to fetch athletes:", athletesError);
      loading.value = false;
      return;
    }

    linkedAthletes.value = athletes || [];

    // Fetch 5 most recent interactions from linked athletes
    const { data: interactions, error: interactionsError } = await supabase
      .from("interactions")
      .select("*")
      .in("logged_by", athleteIds)
      .order("occurred_at", { ascending: false })
      .limit(5);

    if (interactionsError) {
      console.error("Failed to fetch athlete interactions:", interactionsError);
      loading.value = false;
      return;
    }

    recentInteractions.value = interactions || [];
  } catch (err) {
    console.error("Failed to load athlete activity:", err);
  } finally {
    loading.value = false;
  }
});
</script>
