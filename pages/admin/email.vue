<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: ["auth", "admin"] });

const { rows, total, loading, error, fetchEmailEvents } = useAdminEmailEvents();

// AdminDataTable expects a generic row shape; AdminEmailEventRow rows are
// rendered via typed cell slots, so widen for the prop binding only.
const tableRows = computed(
  () => rows.value as unknown as Record<string, unknown>[],
);

const columns = [
  { key: "occurred_at", label: "When" },
  { key: "event_type", label: "Event" },
  { key: "recipient_email", label: "Recipient" },
  { key: "subject", label: "Subject" },
  { key: "message_id", label: "Message ID" },
];

onMounted(() => fetchEmailEvents({ limit: 100 }));
</script>

<template>
  <section>
    <h1 class="mb-4 text-xl font-semibold text-brand-slate-900">
      Email Delivery Log ({{ total }})
    </h1>
    <AdminDataTable
      :columns="columns"
      :rows="tableRows"
      :loading="loading"
      :error="error"
    >
      <template #cell-occurred_at="{ value }">{{
        new Date(String(value)).toLocaleString()
      }}</template>
    </AdminDataTable>
  </section>
</template>
