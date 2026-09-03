<template>
  <div class="mx-auto max-w-2xl px-4 py-8">
    <NuxtLink
      to="/settings"
      class="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
    >
      <UIcon name="i-heroicons-chevron-left" class="h-4 w-4" />
      Settings
    </NuxtLink>

    <h1 class="text-2xl font-bold text-slate-900">Plan</h1>
    <p class="mt-1 text-sm text-slate-500">
      Your plan covers your whole family — every parent and athlete in this
      family account.
    </p>

    <div class="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Current plan
      </p>
      <p class="mt-1 text-lg font-semibold text-slate-900">
        <span v-if="loading">Loading…</span>
        <span v-else>{{ planLabel }}</span>
      </p>
      <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
      <p
        v-else-if="subscription?.status === 'founding'"
        class="mt-2 text-sm text-slate-600"
      >
        You joined during our founding period. Your family keeps full access
        at no charge for as long as this account is active. Thank you for
        being early.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useEntitlement } from "~/composables/useEntitlement";

definePageMeta({ middleware: "auth" });

const { subscription, loading, error, planLabel, load } = useEntitlement();

onMounted(() => {
  void load();
});
</script>
