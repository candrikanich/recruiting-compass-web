<template>
  <div
    class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-shadow hover:shadow-md"
  >
    <div class="mb-6 flex items-center justify-between">
      <h2 class="text-xl font-bold text-slate-900">📄 Recent Documents</h2>
      <NuxtLink
        to="/documents"
        class="text-sm font-semibold text-blue-600 hover:text-blue-700"
      >
        View all →
      </NuxtLink>
    </div>

    <div
      v-if="recentDocuments.length === 0"
      class="py-8 text-center text-slate-600"
    >
      <p>No documents uploaded yet</p>
      <NuxtLink
        to="/documents"
        class="mt-2 inline-block text-sm font-semibold text-blue-600 hover:text-blue-700"
      >
        Upload a document
      </NuxtLink>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="doc in recentDocuments"
        :key="doc.id"
        class="rounded-lg border border-slate-200 p-4 transition hover:shadow-md"
      >
        <div class="mb-2 flex items-start justify-between">
          <div class="flex-1">
            <p class="truncate font-semibold text-slate-900">{{ doc.title }}</p>
            <p class="text-xs text-slate-600 capitalize">{{ doc.type }}</p>
          </div>
        </div>
        <div class="flex items-center justify-between">
          <p class="text-xs text-slate-600">
            {{ formatDate(doc.created_at || "") }}
          </p>
          <div class="flex gap-2">
            <span
              v-if="(doc.shared_with_schools || []).length > 0"
              class="rounded-sm bg-emerald-100 px-2 py-1 text-xs text-emerald-700"
            >
              Shared: {{ (doc.shared_with_schools || []).length }}
            </span>
            <NuxtLink
              :to="`/documents/${doc.id}`"
              class="rounded-sm bg-blue-100 px-3 py-1 text-xs text-blue-700 transition hover:bg-blue-200"
            >
              View
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useDocumentsConsolidated } from "~/composables/useDocumentsConsolidated";
import type { Document } from "~/types/models";

// Defer composable initialization to onMounted
let documentsComposable:
  ReturnType<typeof useDocumentsConsolidated> | undefined;

const recentDocuments = computed(() => {
  return (documentsComposable?.documents.value || [])
    .filter((doc: Document) => doc.is_current)
    .sort((a: Document, b: Document) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, 5);
});

onMounted(() => {
  documentsComposable = useDocumentsConsolidated();
});

const formatDate = (dateString: string): string => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return `Today at ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
};
</script>
