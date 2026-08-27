<template>
  <div
    class="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-slate-100"
  >
    <!-- Page Header -->
    <div class="border-b border-slate-200 bg-white">
      <div class="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        <NuxtLink
          to="/settings"
          class="mb-3 inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 hover:text-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <UIcon name="i-heroicons-arrow-left" class="h-4 w-4" />
          Back to Settings
        </NuxtLink>
        <h1 class="text-2xl font-semibold text-slate-900">
          Dashboard Customization
        </h1>
        <p class="text-slate-600">
          Drag widgets to reorder, or use the arrow buttons. Click the eye to
          show or hide.
        </p>
      </div>
    </div>

    <main class="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <!-- Stats Bar toggles -->
      <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2
          class="mb-4 text-sm font-semibold tracking-wide text-slate-500 uppercase"
        >
          Summary Statistics
        </h2>
        <div class="flex flex-wrap gap-3">
          <label
            v-for="card in STAT_CARDS"
            :key="card.key"
            class="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 transition select-none hover:bg-slate-50"
            :class="
              layout.statsCards[card.key]
                ? 'bg-white'
                : 'bg-slate-50 opacity-60'
            "
          >
            <input
              v-model="layout.statsCards[card.key]"
              type="checkbox"
              class="h-4 w-4 rounded-sm text-blue-600"
              @change="scheduleSave"
            />
            <span class="text-sm font-medium text-slate-800">{{
              card.label
            }}</span>
          </label>
        </div>
      </div>

      <!-- Column editor -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- Left column (4/6 wide on dashboard) -->
        <div
          class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-2"
        >
          <h2
            class="mb-1 text-sm font-semibold tracking-wide text-slate-500 uppercase"
          >
            Main Column
          </h2>
          <p class="mb-4 text-xs text-slate-400">
            Accepts wide (4/6) and narrow (2/6) widgets. Narrow widgets pair
            side-by-side.
          </p>

          <div ref="leftColumnEl" class="min-h-24 space-y-2">
            <DashboardWidgetCard
              v-for="element in layout.leftColumn"
              :key="element.id"
              :id="element.id"
              :visible="element.visible"
              :data-size="widgetSize(element.id)"
              @toggle="toggleWidget(layout.leftColumn, element.id)"
              @move-up="moveWidget(layout.leftColumn, element.id, 'up')"
              @move-down="moveWidget(layout.leftColumn, element.id, 'down')"
            />
          </div>

          <p
            v-if="layout.leftColumn.length === 0"
            class="py-6 text-center text-sm text-slate-400"
          >
            Drag widgets here
          </p>
        </div>

        <!-- Right column (2/6 wide on dashboard — sidebar) -->
        <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2
            class="mb-1 text-sm font-semibold tracking-wide text-slate-500 uppercase"
          >
            Sidebar
          </h2>
          <p class="mb-4 text-xs text-slate-400">Narrow (2/6) widgets only.</p>

          <div ref="rightColumnEl" class="min-h-24 space-y-2">
            <DashboardWidgetCard
              v-for="element in layout.rightColumn"
              :key="element.id"
              :id="element.id"
              :visible="element.visible"
              :data-size="widgetSize(element.id)"
              @toggle="toggleWidget(layout.rightColumn, element.id)"
              @move-up="moveWidget(layout.rightColumn, element.id, 'up')"
              @move-down="moveWidget(layout.rightColumn, element.id, 'down')"
            />
          </div>

          <p
            v-if="layout.rightColumn.length === 0"
            class="py-6 text-center text-sm text-slate-400"
          >
            Drag widgets here
          </p>
        </div>
      </div>

      <!-- Coming Soon section -->
      <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2
          class="mb-4 text-sm font-semibold tracking-wide text-slate-500 uppercase"
        >
          Coming Soon
        </h2>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          <div
            v-for="(label, id) in COMING_SOON_LABELS"
            :key="id"
            class="flex cursor-not-allowed items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 opacity-60"
          >
            <div class="h-4 w-4 shrink-0" />
            <span class="flex-1 truncate text-sm font-medium text-slate-800">{{
              label
            }}</span>
            <span
              class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-600"
            >
              Coming soon
            </span>
          </div>
        </div>
      </div>

      <!-- Reset + save status -->
      <div class="flex items-center justify-between">
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          @click="resetToDefaults"
        >
          Reset to Defaults
        </button>
        <p
          v-if="saveStatus === 'saved'"
          class="text-sm font-medium text-green-600"
        >
          ✓ Saved
        </p>
        <p
          v-if="saveStatus === 'error'"
          class="text-sm font-medium text-red-600"
        >
          Failed to save
        </p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useSortable } from "@vueuse/integrations/useSortable";
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

const { getDashboardLayout, setDashboardLayout, dashboardPrefs } =
  usePreferenceManager();

const widgetSize = (id: string): string =>
  WIDGET_SIZES[id as keyof typeof WIDGET_SIZES] ?? "2/6";

const layout = reactive<DashboardLayout>(getDefaultDashboardLayout());
const saveStatus = ref<"idle" | "saved" | "error">("idle");
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const leftColumnEl = ref<HTMLElement | null>(null);
const rightColumnEl = ref<HTMLElement | null>(null);

// SortableJS group config — right column rejects 4/6 widgets
useSortable(leftColumnEl, layout.leftColumn, {
  group: { name: "dashboard", pull: true, put: true },
  handle: ".drag-handle",
  ghostClass: "opacity-40",
  onEnd: () => scheduleSave(),
});

useSortable(rightColumnEl, layout.rightColumn, {
  group: {
    name: "dashboard",
    pull: true,
    put: (_to, _from, dragEl) => (dragEl as HTMLElement).dataset.size === "2/6",
  },
  handle: ".drag-handle",
  ghostClass: "opacity-40",
  onEnd: () => scheduleSave(),
});

onMounted(async () => {
  await dashboardPrefs.loadPreferences();
  const saved = getDashboardLayout();
  layout.statsCards = saved.statsCards;
  // Mutate arrays in place — useSortable binds to the original reference.
  layout.leftColumn.splice(0, layout.leftColumn.length, ...saved.leftColumn);
  layout.rightColumn.splice(0, layout.rightColumn.length, ...saved.rightColumn);
});

const moveWidget = (
  column: WidgetEntry[],
  id: string,
  direction: "up" | "down",
) => {
  const index = column.findIndex((w) => w.id === id);
  if (index === -1) return;
  const newIndex = direction === "up" ? index - 1 : index + 1;
  if (newIndex < 0 || newIndex >= column.length) return;
  const copy = [...column];
  [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];
  column.splice(0, column.length, ...copy);
  scheduleSave();
};

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
  layout.leftColumn.splice(0, layout.leftColumn.length, ...defaults.leftColumn);
  layout.rightColumn.splice(
    0,
    layout.rightColumn.length,
    ...defaults.rightColumn,
  );
  scheduleSave();
};
</script>
