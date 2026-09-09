<script setup lang="ts">
import { onMounted } from "vue";
import { useInboundDrafts } from "~/composables/useInboundDrafts";
import { useAppToast } from "~/composables/useAppToast";

definePageMeta({ middleware: "auth" });

const { drafts, loading, error, fetchDrafts, discardDraft } = useInboundDrafts();
const { showToast } = useAppToast();

onMounted(fetchDrafts);

// Confirming is no longer a blind accept-as-is — it opens the manual
// interaction form prefilled from the draft so the parsed fields can be
// reviewed and edited before anything is saved (#678).
function onConfirm(draftId: string) {
  navigateTo(`/interactions/add?draftId=${draftId}`);
}

async function onDiscard(draftId: string) {
  try {
    await discardDraft(draftId);
  } catch {
    showToast("Failed to discard this draft. Please try again.", "error");
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-8">
    <h1 class="text-xl font-semibold text-brand-slate-900">Coach Emails to Review</h1>

    <DesignSystemLoadingState v-if="loading" />
    <DesignSystemErrorState v-else-if="error" :error="error" @retry="fetchDrafts" />
    <DesignSystemEmptyState
      v-else-if="drafts.length === 0"
      title="No emails to review"
      description="Forward a coach's email to your family's inbound address and it'll show up here."
    />

    <ul v-else class="mt-6 space-y-4">
      <li v-for="draft in drafts" :key="draft.id">
        <DesignSystemCard>
          <p class="font-medium text-brand-slate-900">
            {{ draft.sender_name ?? "Unknown sender" }}
            <span v-if="draft.sender_email" class="text-brand-slate-500">
              &lt;{{ draft.sender_email }}&gt;
            </span>
          </p>
          <p class="text-sm text-brand-slate-600">{{ draft.subject }}</p>
          <p class="mt-2 whitespace-pre-line text-sm text-brand-slate-700">
            {{ draft.body_text }}
          </p>

          <div class="mt-4 flex gap-2">
            <DesignSystemButton @click="onConfirm(draft.id)"> Confirm </DesignSystemButton>
            <DesignSystemButton variant="outline" color="slate" @click="onDiscard(draft.id)">
              Discard
            </DesignSystemButton>
          </div>
        </DesignSystemCard>
      </li>
    </ul>
  </div>
</template>
