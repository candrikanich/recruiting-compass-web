<script setup lang="ts">
interface Column {
  key: string;
  label: string;
}

const props = withDefaults(
  defineProps<{
    columns: Column[];
    rows: Record<string, unknown>[];
    loading?: boolean;
    error?: string | null;
  }>(),
  { loading: false, error: null },
);
</script>

<template>
  <DesignSystemLoadingState v-if="props.loading" />
  <DesignSystemErrorState v-else-if="props.error" :error="props.error" />
  <DesignSystemEmptyState v-else-if="props.rows.length === 0" title="No data" />
  <div v-else class="overflow-x-auto">
    <table class="min-w-full text-sm">
      <thead>
        <tr
          class="border-b border-brand-slate-200 text-left text-brand-slate-500"
        >
          <th
            v-for="c in props.columns"
            :key="c.key"
            class="px-3 py-2 font-medium"
          >
            {{ c.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, i) in props.rows"
          :key="i"
          class="border-b border-brand-slate-100"
        >
          <td
            v-for="c in props.columns"
            :key="c.key"
            class="px-3 py-2 text-brand-slate-800"
          >
            <slot :name="`cell-${c.key}`" :row="row" :value="row[c.key]">{{
              row[c.key]
            }}</slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
