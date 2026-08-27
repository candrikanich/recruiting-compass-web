<!-- pages/admin/audit.vue -->
<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: ["auth", "admin"] });

const { rows, total, loading, error, fetchAuditLog } = useAdminAuditLog();

// AdminDataTable expects a generic row shape; AdminAuditRow rows are rendered
// via typed cell slots, so widen for the prop binding only.
const tableRows = computed(
  () => rows.value as unknown as Record<string, unknown>[],
);

const columns = [
  { key: "created_at", label: "When" },
  { key: "actor_admin_id", label: "Admin" },
  { key: "action", label: "Action" },
  { key: "target_user_id", label: "Target" },
];

onMounted(() => fetchAuditLog({ limit: 100 }));
</script>

<template>
  <section>
    <h1 class="mb-4 text-xl font-semibold text-brand-slate-900">
      Admin Audit Log ({{ total }})
    </h1>
    <AdminDataTable
      :columns="columns"
      :rows="tableRows"
      :loading="loading"
      :error="error"
    >
      <template #cell-created_at="{ value }">{{
        new Date(String(value)).toLocaleString()
      }}</template>
    </AdminDataTable>
  </section>
</template>
