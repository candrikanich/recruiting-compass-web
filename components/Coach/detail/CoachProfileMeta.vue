<script setup lang="ts">
import { formatDate } from "~/utils/dateFormatters";
import type { Coach } from "~/types/models";

defineProps<{ coach: Coach }>();
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-5">
    <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Profile</h3>
    <dl class="space-y-2 text-sm">
      <div class="flex items-center justify-between">
        <dt class="text-slate-500">Coach Since</dt>
        <dd class="font-medium text-slate-900">
          {{ coach.created_at ? formatDate(coach.created_at) : "—" }}
        </dd>
      </div>
      <div class="flex items-center justify-between">
        <dt class="text-slate-500">Source</dt>
        <dd class="font-medium text-slate-900">{{ coach.source ?? "—" }}</dd>
      </div>
      <div class="flex items-center justify-between">
        <dt class="text-slate-500">Last Updated</dt>
        <dd class="font-medium text-slate-900">
          {{ coach.updated_at ? formatDate(coach.updated_at) : "—" }}
        </dd>
      </div>
    </dl>
  </section>
</template>
