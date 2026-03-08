<template>
  <div
    class="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Page Header -->
    <div class="bg-white border-b border-slate-200">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-4">
        <NuxtLink
          to="/settings"
          class="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition mb-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <ArrowLeftIcon class="w-4 h-4" />
          Back to Settings
        </NuxtLink>
        <h1 class="text-2xl font-semibold text-slate-900">
          Dashboard Customization
        </h1>
        <p class="text-slate-600">
          Drag widgets to reorder. Click the eye to show or hide.
        </p>
      </div>
    </div>

    <main class="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <!-- Stats Bar toggles -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <h2
          class="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4"
        >
          Summary Statistics
        </h2>
        <div class="flex flex-wrap gap-3">
          <label
            v-for="card in STAT_CARDS"
            :key="card.key"
            class="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition select-none"
            :class="
              layout.statsCards[card.key] ? 'bg-white' : 'bg-slate-50 opacity-60'
            "
          >
            <input
              v-model="layout.statsCards[card.key]"
              type="checkbox"
              class="w-4 h-4 text-blue-600 rounded-sm"
              @change="scheduleSave"
            />
            <span class="text-sm font-medium text-slate-800">{{
              card.label
            }}</span>
          </label>
        </div>
      </div>

      <!-- Column editor -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left column (4/6 wide on dashboard) -->
        <div
          class="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-6"
        >
          <h2
            class="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1"
          >
            Main Column
          </h2>
          <p class="text-xs text-slate-400 mb-4">
            Accepts wide (4/6) and narrow (2/6) widgets. Narrow widgets pair
            side-by-side.
          </p>

          <VueDraggable
            v-model="layout.leftColumn"
            :group="leftGroup"
            handle=".drag-handle"
            class="min-h-24 space-y-2"
            ghost-class="opacity-40"
            @end="scheduleSave"
          >
            <DashboardWidgetCard
              v-for="element in layout.leftColumn"
              :key="element.id"
              :id="element.id"
              :visible="element.visible"
              :data-size="widgetSize(element.id)"
              @toggle="toggleWidget(layout.leftColumn, element.id)"
            />
          </VueDraggable>

          <p
            v-if="layout.leftColumn.length === 0"
            class="text-sm text-slate-400 text-center py-6"
          >
            Drag widgets here
          </p>
        </div>

        <!-- Right column (2/6 wide on dashboard — sidebar) -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
          <h2
            class="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1"
          >
            Sidebar
          </h2>
          <p class="text-xs text-slate-400 mb-4">Narrow (2/6) widgets only.</p>

          <VueDraggable
            v-model="layout.rightColumn"
            :group="rightGroup"
            handle=".drag-handle"
            class="min-h-24 space-y-2"
            ghost-class="opacity-40"
            @end="scheduleSave"
          >
            <DashboardWidgetCard
              v-for="element in layout.rightColumn"
              :key="element.id"
              :id="element.id"
              :visible="element.visible"
              :data-size="widgetSize(element.id)"
              @toggle="toggleWidget(layout.rightColumn, element.id)"
            />
          </VueDraggable>

          <p
            v-if="layout.rightColumn.length === 0"
            class="text-sm text-slate-400 text-center py-6"
          >
            Drag widgets here
          </p>
        </div>
      </div>

      <!-- Coming Soon section -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <h2
          class="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4"
        >
          Coming Soon
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div
            v-for="(label, id) in COMING_SOON_LABELS"
            :key="id"
            class="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
          >
            <div class="w-4 h-4 shrink-0" />
            <span class="flex-1 text-sm font-medium text-slate-800 truncate">{{
              label
            }}</span>
            <span
              class="text-xs font-medium bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full shrink-0"
            >
              Coming soon
            </span>
          </div>
        </div>
      </div>

      <!-- Reset + save status -->
      <div class="flex justify-between items-center">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
          @click="resetToDefaults"
        >
          Reset to Defaults
        </button>
        <p
          v-if="saveStatus === 'saved'"
          class="text-sm text-green-600 font-medium"
        >
          ✓ Saved
        </p>
        <p
          v-if="saveStatus === 'error'"
          class="text-sm text-red-600 font-medium"
        >
          Failed to save
        </p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ArrowLeftIcon } from "@heroicons/vue/24/outline";
import { VueDraggable } from "vue-draggable-plus";
import { usePreferenceManager } from "~/composables/usePreferenceManager";
import { getDefaultDashboardLayout } from "~/utils/preferenceValidation";
import { WIDGET_SIZES } from "~/types/models";
import type { WidgetEntry, DashboardLayout } from "~/types/models";
import DashboardWidgetCard from "~/components/Settings/DashboardWidgetCard.vue";

definePageMeta({ middleware: "auth" });

const COMING_SOON_LABELS: Record<string, string> = {
  offerStatusOverview: "Offer Status Overview",
  recentDocuments: "Recent Documents",
  interactionStats: "Interaction Statistics",
  coachResponsiveness: "Coach Responsiveness",
  upcomingDeadlines: "Upcoming Deadlines",
  recruitingCalendar: "Recruiting Calendar",
};

const STAT_CARDS = [
  { key: "coaches" as const, label: "👥 Coaches" },
  { key: "schools" as const, label: "🏫 Schools" },
  { key: "interactions" as const, label: "💬 Interactions" },
  { key: "offers" as const, label: "📝 Offers" },
  { key: "events" as const, label: "📅 Events" },
];

// SortableJS group config — right column rejects 4/6 widgets
const leftGroup = { name: "dashboard", pull: true, put: true };
const rightGroup = {
  name: "dashboard",
  pull: true,
  put: (_to: unknown, _from: unknown, dragEl: HTMLElement) =>
    dragEl.dataset.size === "2/6",
};

const { getDashboardLayout, setDashboardLayout, dashboardPrefs } =
  usePreferenceManager();

const widgetSize = (id: string): string =>
  WIDGET_SIZES[id as keyof typeof WIDGET_SIZES] ?? "2/6";

const layout = reactive<DashboardLayout>(getDefaultDashboardLayout());
const saveStatus = ref<"idle" | "saved" | "error">("idle");
let saveTimer: ReturnType<typeof setTimeout> | null = null;

onMounted(async () => {
  await dashboardPrefs.loadPreferences();
  const saved = getDashboardLayout();
  layout.statsCards = saved.statsCards;
  layout.leftColumn = saved.leftColumn;
  layout.rightColumn = saved.rightColumn;
});

const toggleWidget = (column: WidgetEntry[], id: string) => {
  const entry = column.find((w) => w.id === id);
  if (entry) entry.visible = !entry.visible;
  scheduleSave();
};

const scheduleSave = () => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await setDashboardLayout({ ...layout });
      saveStatus.value = "saved";
      setTimeout(() => (saveStatus.value = "idle"), 2000);
    } catch {
      saveStatus.value = "error";
    }
  }, 800);
};

const resetToDefaults = () => {
  const defaults = getDefaultDashboardLayout();
  layout.statsCards = defaults.statsCards;
  layout.leftColumn = defaults.leftColumn;
  layout.rightColumn = defaults.rightColumn;
  scheduleSave();
};
</script>
