<template>
  <div
    v-if="!isDismissed"
    class="rounded-lg border border-brand-slate-200 bg-white p-4 dark:border-brand-slate-700 dark:bg-brand-slate-800"
  >
    <div data-testid="checklist-progress" class="mb-3">
      <div class="mb-1 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-brand-slate-900 dark:text-brand-slate-100">
          Getting started
        </h3>
        <button
          type="button"
          data-testid="checklist-dismiss"
          class="text-xs font-medium text-brand-slate-400 hover:text-brand-slate-600"
          @click="handleDismiss"
        >
          Dismiss
        </button>
      </div>
      <p class="mb-2 text-xs text-brand-slate-500">
        {{ completedCount }} of {{ items.length }} complete — {{ checklistPercentage }}%
      </p>
      <div class="h-1.5 w-full overflow-hidden rounded-full bg-brand-slate-100 dark:bg-brand-slate-700">
        <div
          class="h-full rounded-full bg-brand-blue-600 transition-all"
          :style="{ width: `${checklistPercentage}%` }"
        />
      </div>
    </div>

    <ul class="space-y-1">
      <li
        v-for="item in items"
        :key="item.def.key"
        :data-testid="`checklist-item-${item.def.key}`"
        class="flex items-start gap-2 py-1"
        :class="{ 'line-through opacity-60': item.completed }"
      >
        <span class="mt-0.5 shrink-0" aria-hidden="true">{{ item.completed ? "✅" : "○" }}</span>
        <div class="min-w-0">
          <NuxtLink
            v-if="!item.completed"
            :to="item.def.link"
            class="text-sm font-medium text-brand-blue-600 hover:text-brand-blue-700"
          >
            {{ item.label }}
          </NuxtLink>
          <span v-else class="text-sm font-medium text-brand-slate-900 dark:text-brand-slate-100">
            {{ item.label }}
          </span>
          <p class="text-xs text-brand-slate-500">{{ item.def.why }}</p>
        </div>
      </li>
    </ul>
  </div>

  <NuxtLink
    v-else
    to="/dashboard"
    data-testid="checklist-resume"
    class="mb-2 inline-block text-xs font-medium text-brand-blue-600 hover:text-brand-blue-700"
    @click="isDismissed = false"
  >
    Resume getting started
  </NuxtLink>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useNuxProgress } from "~/composables/useNuxProgress";
import { useUserStore } from "~/stores/user";
import { useSchools } from "~/composables/useSchools";
import { useCoaches } from "~/composables/useCoaches";
import { useProfileCompleteness } from "~/composables/useProfileCompleteness";
import type { NuxChecklistKey } from "~/types/nux";

interface ChecklistItemDef {
  key: NuxChecklistKey;
  playerLabel: string;
  parentLabel: (name: string) => string;
  why: string;
  link: string;
}

const CHECKLIST_ITEMS: ChecklistItemDef[] = [
  {
    key: "sport",
    playerLabel: "Choose your sport",
    parentLabel: (n) => `Set ${n}'s sport`,
    why: "Unlocks recommendations, timeline, and recruiting calendar",
    link: "/settings/player-details",
  },
  {
    key: "first_school",
    playerLabel: "Explore recommended schools",
    parentLabel: (n) => `Explore schools for ${n}`,
    why: "See how you match with real programs",
    link: "/schools",
  },
  {
    key: "academics",
    playerLabel: "Complete your academics",
    parentLabel: (n) => `Add ${n}'s academics`,
    why: "GPA and test scores power academic fit matching",
    link: "/settings/player-details?tab=academics",
  },
  {
    key: "first_coach",
    playerLabel: "Add your first coach",
    parentLabel: (n) => `Help ${n} track a coach`,
    why: "Start building relationships with college coaches",
    link: "/coaches",
  },
  {
    key: "invite_family",
    playerLabel: "Invite your family",
    parentLabel: (n) => `Invite ${n} to take over`,
    why: "Work together on the recruiting journey",
    link: "/settings/family-management",
  },
  {
    key: "profile_80",
    playerLabel: "Complete your profile (80%+)",
    parentLabel: (n) => `Complete ${n}'s profile (80%+)`,
    why: "Full profiles get better recommendations and templates",
    link: "/settings/player-details",
  },
  {
    key: "preview_template",
    playerLabel: "Preview a coach outreach email",
    parentLabel: () => "Preview a coach email",
    why: "See how your data auto-fills real outreach templates",
    link: "/settings/communication-templates",
  },
  {
    key: "check_timeline",
    playerLabel: "Check your recruiting timeline",
    parentLabel: () => "Review recruiting timeline",
    why: "Know what to do and when for your sport and grade",
    link: "/timeline",
  },
];

const { progress, checklistPercentage, completeItem, dismissChecklist } =
  useNuxProgress();
const userStore = useUserStore();
const { schools } = useSchools();
const { coaches } = useCoaches();
const { completeness, updateCompleteness } = useProfileCompleteness();

const isDismissed = ref(false);

const items = computed(() => {
  const isParent = userStore.user?.role === "parent";
  const name = userStore.user?.full_name?.split(" ")[0] ?? "your athlete";
  return CHECKLIST_ITEMS.map((def) => ({
    def,
    label: isParent ? def.parentLabel(name) : def.playerLabel,
    completed: progress.value.checklist.items[def.key]?.completed ?? false,
  }));
});

const completedCount = computed(
  () => items.value.filter((item) => item.completed).length,
);

function handleDismiss() {
  isDismissed.value = true;
  void dismissChecklist();
}

onMounted(async () => {
  isDismissed.value = !!progress.value.checklist.dismissedAt;

  await updateCompleteness();

  if (schools.value.length > 0) {
    await completeItem("first_school");
  }
  if (coaches.value.length > 0) {
    await completeItem("first_coach");
  }
  if (completeness.value >= 80) {
    await completeItem("profile_80");
  }
});
</script>
