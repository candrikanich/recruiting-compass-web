<template>
  <div class="space-y-6">
    <StatsTiles :stats="inboxStats" aria-label="Inbound Leads Statistics" />

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
        v-for="lead in leads"
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
          </div>
          <span class="shrink-0 text-xs whitespace-nowrap text-slate-400">
            {{ formatLeadDate(lead.created_at) }}
          </span>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import StatsTiles from "~/components/shared/StatsTiles.vue";
import { useProfileContacts } from "~/composables/useProfileContacts";

const { leads, counts, loading, error, fetchContacts } = useProfileContacts();

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
