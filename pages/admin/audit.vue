<!-- pages/admin/audit.vue -->
<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: ["auth", "admin"] });

const { rows, total, loading, error, fetchAuditLog } = useAdminAuditLog();

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
    <h1 class="mb-4 text-xl font-semibold text-brand-slate-900">Admin Audit Log ({{ total }})</h1>
    <AdminDataTable :columns="columns" :rows="rows" :loading="loading" :error="error">
      <template #cell-created_at="{ value }">{{ new Date(String(value)).toLocaleString() }}</template>
    </AdminDataTable>
  </section>
</template>
