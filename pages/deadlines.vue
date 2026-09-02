<template>
  <DesignSystemPageState
    :loading="loading"
    :error="error"
    loading-message="Loading deadlines..."
    @retry="fetchDeadlines"
  >
    <div class="mx-auto max-w-4xl px-4 py-8">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-brand-slate-900">Deadlines</h1>
          <p class="mt-1 text-sm text-brand-slate-500">
            Key dates for your sport, division, and graduation year — plus
            your own deadlines
          </p>
        </div>
        <DesignSystemButton color="blue" variant="solid" @click="showAdd = true">
          + Add Deadline
        </DesignSystemButton>
      </div>

      <DesignSystemAlert
        v-if="isStale"
        variant="warning"
        title="Recruiting calendar may be out of date"
        compact
        class="mb-6"
      >
        The current NCAA recruiting season has ended. Dates shown may need an
        update for the upcoming season.
      </DesignSystemAlert>

      <DesignSystemEmptyState
        v-if="unifiedDeadlines.length === 0"
        title="No deadlines yet"
        description="Key dates for your sport, division, and graduation year"
      >
        <template #icon>
          <UIcon name="i-heroicons-calendar-days" class="h-8 w-8 text-brand-slate-400" />
        </template>
        <template #action>
          <DesignSystemButton color="blue" variant="solid" @click="showAdd = true">
            Add Deadline
          </DesignSystemButton>
        </template>
      </DesignSystemEmptyState>

      <template v-else>
        <section v-for="[monthKey, items] in upcomingByMonth" :key="monthKey" class="mb-6">
          <h2
            class="sticky top-0 z-10 bg-white py-2 text-xs font-semibold uppercase tracking-wide text-brand-slate-500"
          >
            {{ formatMonthHeader(monthKey) }}
          </h2>
          <ul class="space-y-3">
            <li
              v-for="d in items"
              :key="d.id"
              class="flex items-center justify-between rounded-lg border border-brand-slate-200 bg-white p-4"
            >
              <div>
                <p class="font-medium text-brand-slate-900">{{ d.label }}</p>
                <div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-brand-slate-500">
                  <span>{{ formatDate(d.date, d.endDate) }}</span>
                  <DesignSystemBadge :color="categoryColor(d.category)" size="sm">
                    {{ categoryLabel(d.category) }}
                  </DesignSystemBadge>
                  <DesignSystemBadge v-if="d.source === 'system'" color="slate" size="sm">
                    NCAA Calendar
                  </DesignSystemBadge>
                </div>
              </div>
              <button
                v-if="d.source === 'user'"
                type="button"
                class="text-sm font-medium text-brand-red-600 hover:text-brand-red-700"
                :aria-label="`Remove ${d.label}`"
                @click="removeDeadline(d.id)"
              >
                Remove
              </button>
            </li>
          </ul>
        </section>

        <section v-if="pastDeadlines.length > 0" class="mt-8">
          <DesignSystemButton
            variant="ghost"
            color="slate"
            size="sm"
            @click="showPast = !showPast"
          >
            {{ showPast ? "Hide" : "Show" }} {{ pastDeadlines.length }} past deadline{{
              pastDeadlines.length === 1 ? "" : "s"
            }}
          </DesignSystemButton>

          <div v-if="showPast" class="mt-4 opacity-50">
            <section v-for="[monthKey, items] in pastByMonth" :key="monthKey" class="mb-6">
              <h2
                class="py-2 text-xs font-semibold uppercase tracking-wide text-brand-slate-500"
              >
                {{ formatMonthHeader(monthKey) }}
              </h2>
              <ul class="space-y-3">
                <li
                  v-for="d in items"
                  :key="d.id"
                  class="flex items-center justify-between rounded-lg border border-brand-slate-200 bg-white p-4"
                >
                  <div>
                    <p class="font-medium text-brand-slate-900">{{ d.label }}</p>
                    <div
                      class="mt-1 flex flex-wrap items-center gap-2 text-sm text-brand-slate-500"
                    >
                      <span>{{ formatDate(d.date, d.endDate) }}</span>
                      <DesignSystemBadge :color="categoryColor(d.category)" size="sm">
                        {{ categoryLabel(d.category) }}
                      </DesignSystemBadge>
                      <DesignSystemBadge v-if="d.source === 'system'" color="slate" size="sm">
                        NCAA Calendar
                      </DesignSystemBadge>
                    </div>
                  </div>
                  <button
                    v-if="d.source === 'user'"
                    type="button"
                    class="text-sm font-medium text-brand-red-600 hover:text-brand-red-700"
                    :aria-label="`Remove ${d.label}`"
                    @click="removeDeadline(d.id)"
                  >
                    Remove
                  </button>
                </li>
              </ul>
            </section>
          </div>
        </section>
      </template>
    </div>

    <DesignSystemModal :open="showAdd" title="Add Deadline" size="md" @close="showAdd = false">
      <form id="add-deadline-form" class="space-y-4" @submit.prevent="submitAdd">
        <div>
          <label class="mb-1 block text-sm font-medium text-brand-slate-700">Label</label>
          <input
            v-model="newDeadline.label"
            type="text"
            required
            maxlength="200"
            placeholder="e.g. Application Deadline — Stanford"
            class="input-field"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-brand-slate-700">Date</label>
          <input v-model="newDeadline.deadline_date" type="date" required class="input-field" />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-brand-slate-700">Category</label>
          <select v-model="newDeadline.category" class="input-field">
            <option value="application">Application</option>
            <option value="decision">Decision</option>
            <option value="financial_aid">Financial Aid</option>
            <option value="visit">Visit</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-brand-slate-700">
            School (optional)
          </label>
          <select v-model="newDeadline.school_id" class="input-field">
            <option value="">No school</option>
            <option v-for="school in schools" :key="school.id" :value="school.id">
              {{ school.name }}
            </option>
          </select>
        </div>
      </form>

      <template #footer>
        <DesignSystemButton variant="outline" color="slate" @click="showAdd = false">
          Cancel
        </DesignSystemButton>
        <DesignSystemButton type="submit" form="add-deadline-form" :loading="addingDeadline">
          {{ addingDeadline ? "Adding…" : "Add Deadline" }}
        </DesignSystemButton>
      </template>
    </DesignSystemModal>
  </DesignSystemPageState>
</template>

<script setup lang="ts">
import { groupByMonth } from "~/utils/deadlines";
import type {
  SystemDeadlineCategory,
  UserDeadlineCategory,
} from "~/types/deadline";
import type { BadgeColor } from "~/components/DesignSystem/Badge.vue";

const {
  unifiedDeadlines,
  upcomingDeadlines,
  pastDeadlines,
  isStale,
  loading,
  error,
  fetchDeadlines,
  createDeadline,
  removeDeadline,
} = useDeadlines();
const { schools, fetchSchools } = useSchools();

const showAdd = ref(false);
const showPast = ref(false);
const addingDeadline = ref(false);
const newDeadline = reactive({
  label: "",
  deadline_date: "",
  category: "application",
  school_id: "",
});

onMounted(() => {
  fetchDeadlines();
  fetchSchools();
});

const upcomingByMonth = computed(() => groupByMonth(upcomingDeadlines.value));
const pastByMonth = computed(() => groupByMonth(pastDeadlines.value));

const CATEGORY_COLORS: Record<UserDeadlineCategory | SystemDeadlineCategory, BadgeColor> = {
  test: "purple",
  signing: "emerald",
  "ncaa-period": "blue",
  deadline: "orange",
  application: "blue",
  decision: "emerald",
  financial_aid: "orange",
  visit: "purple",
  custom: "slate",
};

function categoryColor(category: UserDeadlineCategory | SystemDeadlineCategory): BadgeColor {
  return CATEGORY_COLORS[category] ?? "slate";
}

function categoryLabel(category: UserDeadlineCategory | SystemDeadlineCategory): string {
  return category.replaceAll("_", " ").replaceAll("-", " ");
}

function formatDate(date: string, endDate?: string): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const start = fmt.format(new Date(date + "T00:00:00"));
  if (!endDate) return start;
  const end = fmt.format(new Date(endDate + "T00:00:00"));
  return `${start} – ${end}`;
}

function formatMonthHeader(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(+year, +month - 1),
  );
}

async function submitAdd() {
  if (!newDeadline.label || !newDeadline.deadline_date) return;
  addingDeadline.value = true;
  try {
    await createDeadline({
      label: newDeadline.label,
      deadline_date: newDeadline.deadline_date,
      category: newDeadline.category,
      school_id: newDeadline.school_id || undefined,
    });
    showAdd.value = false;
    Object.assign(newDeadline, {
      label: "",
      deadline_date: "",
      category: "application",
      school_id: "",
    });
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to create deadline";
  } finally {
    addingDeadline.value = false;
  }
}
</script>
