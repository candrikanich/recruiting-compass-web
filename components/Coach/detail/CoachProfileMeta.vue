<script setup lang="ts">
import { formatDate } from "~/utils/dateFormatters";
import type { Coach } from "~/types/models";

defineProps<{ coach: Coach }>();
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-4">
    <h3 class="mb-3 text-xs font-bold tracking-wide text-slate-400 uppercase">
      Profile Meta
    </h3>
    <dl class="space-y-2">
      <div class="flex items-center justify-between text-[13px]">
        <dt class="font-normal text-slate-400">Coach Since</dt>
        <dd class="font-semibold text-slate-900">
          {{ coach.created_at ? formatDate(coach.created_at) : "—" }}
        </dd>
      </div>
      <div class="flex items-center justify-between text-[13px]">
        <dt class="font-normal text-slate-400">Source</dt>
        <dd class="font-semibold text-slate-900">{{ coach.source ?? "—" }}</dd>
      </div>
      <div class="flex items-center justify-between text-[13px]">
        <dt class="font-normal text-slate-400">Last Updated</dt>
        <dd class="font-semibold text-slate-900">
          {{ coach.updated_at ? formatDate(coach.updated_at) : "—" }}
        </dd>
      </div>
    </dl>
  </section>
</template>
