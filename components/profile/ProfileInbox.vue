<template>
  <div class="space-y-6">
    <StatsTiles :stats="inboxStats" aria-label="Inbound Leads Statistics" />

    <div class="flex items-center justify-end gap-2 text-sm">
      <button
        type="button"
        data-test="filter-open"
        class="rounded-full px-3 py-1 font-medium transition"
        :class="
          filter === 'open'
            ? 'bg-brand-blue-600 text-white'
            : 'text-slate-500 hover:text-slate-900'
        "
        @click="filter = 'open'"
      >
        Open
      </button>
      <button
        type="button"
        data-test="filter-all"
        class="rounded-full px-3 py-1 font-medium transition"
        :class="
          filter === 'all'
            ? 'bg-brand-blue-600 text-white'
            : 'text-slate-500 hover:text-slate-900'
        "
        @click="filter = 'all'"
      >
        All
      </button>
    </div>

    <DesignSystemLoadingState
      v-if="loading"
      message="Loading your inbox..."
    />
    <DesignSystemErrorState
      v-else-if="error"
      :error="error"
      @retry="fetchContacts"
    />
    <DesignSystemEmptyState
      v-else-if="leads.length === 0"
      title="No leads yet"
      description="Coach interest and messages from your public profile will show up here."
    />
    <ul v-else class="space-y-3">
      <li
        v-for="lead in visibleLeads"
        :key="lead.id"
        class="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="mb-1 flex items-center gap-2">
              <DesignSystemBadge
                :color="lead.type === 'interest' ? 'purple' : 'blue'"
                variant="light"
                size="sm"
              >
                {{ lead.type === "interest" ? "Interest" : "Contact" }}
              </DesignSystemBadge>
              <DesignSystemBadge
                v-if="lead.status === 'pending'"
                color="orange"
                variant="light"
                size="sm"
              >
                Needs coach
              </DesignSystemBadge>
              <DesignSystemBadge
                v-else-if="lead.status === 'resolved'"
                color="emerald"
                variant="light"
                size="sm"
              >
                Tracked
              </DesignSystemBadge>
              <span class="truncate font-semibold text-slate-900">{{
                lead.coach_name
              }}</span>
            </div>
            <p class="text-sm text-slate-600">
              <span v-if="lead.program">{{ lead.program }}</span>
              <span v-if="lead.program && lead.school_name"> &middot; </span>
              <span v-if="lead.school_name">{{ lead.school_name }}</span>
            </p>
            <p v-if="lead.note" class="mt-2 line-clamp-2 text-sm text-slate-500">
              {{ lead.note }}
            </p>
            <div
              v-if="lead.status === 'pending'"
              class="mt-3 flex items-center gap-2"
            >
              <button
                type="button"
                :data-test="`assign-coach-${lead.id}`"
                class="rounded-lg bg-brand-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-blue-700"
                @click="activeLead = lead"
              >
                Assign coach
              </button>
              <button
                type="button"
                :data-test="`dismiss-${lead.id}`"
                class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                @click="dismissLead(lead.id)"
              >
                Dismiss
              </button>
            </div>
            <NuxtLink
              v-else-if="lead.status === 'resolved' && lead.interaction_id"
              :to="`/interactions/${lead.interaction_id}`"
              class="mt-3 inline-block text-sm font-medium text-brand-blue-600 hover:underline"
            >
              View interaction
            </NuxtLink>
          </div>
          <span class="shrink-0 text-xs whitespace-nowrap text-slate-400">
            {{ formatLeadDate(lead.created_at) }}
          </span>
        </div>
      </li>
    </ul>

    <AssignCoachModal
      v-if="activeLead"
      :lead="activeLead"
      @resolved="onResolved"
      @close="activeLead = null"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import StatsTiles from "~/components/shared/StatsTiles.vue";
import AssignCoachModal from "~/components/profile/AssignCoachModal.vue";
import {
  useProfileContacts,
  type ProfileLead,
} from "~/composables/useProfileContacts";

const { leads, counts, loading, error, fetchContacts, dismissLead } =
  useProfileContacts();

const filter = ref<"open" | "all">("open");
const activeLead = ref<ProfileLead | null>(null);

const visibleLeads = computed(() =>
  filter.value === "all"
    ? leads.value
    : leads.value.filter((lead) => lead.status !== "dismissed"),
);

function onResolved(): void {
  activeLead.value = null;
  fetchContacts();
}

const inboxStats = computed(() => [
  {
    label: "Interest this month",
    value: counts.value.interestThisMonth,
    icon: "i-heroicons-hand-raised",
    color: "purple" as const,
    testId: "stat-interest-this-month",
  },
  {
    label: "Contact this month",
    value: counts.value.contactThisMonth,
    icon: "i-heroicons-envelope",
    color: "blue" as const,
    testId: "stat-contact-this-month",
  },
]);

function formatLeadDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays < 1) return "Today";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
</script>
