<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useInboundDrafts } from "~/composables/useInboundDrafts";
import { useAppToast } from "~/composables/useAppToast";

definePageMeta({ middleware: "auth" });

const { drafts, loading, error, fetchDrafts, confirmDraft, discardDraft } =
  useInboundDrafts();
const schoolIdByDraft = ref<Record<string, string>>({});
const { showToast } = useAppToast();

onMounted(fetchDrafts);

async function onConfirm(draftId: string, matchedSchoolId: string | null) {
  try {
    await confirmDraft(
      draftId,
      matchedSchoolId ? undefined : schoolIdByDraft.value[draftId],
    );
  } catch {
    showToast("Failed to confirm this draft. Please try again.", "error");
  }
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
    <h1 class="text-xl font-semibold text-brand-slate-900">
      Coach Emails to Review
    </h1>

    <DesignSystemLoadingState v-if="loading" />
    <DesignSystemErrorState
      v-else-if="error"
      :error="error"
      @retry="fetchDrafts"
    />
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
          <p class="mt-2 text-sm whitespace-pre-line text-brand-slate-700">
            {{ draft.body_text }}
          </p>

          <div v-if="!draft.matched_school_id" class="mt-3">
            <SchoolSelect
              v-model="schoolIdByDraft[draft.id]"
              :required="false"
              label="Which school is this from?"
            />
          </div>

          <div class="mt-4 flex gap-2">
            <DesignSystemButton
              :disabled="!draft.matched_school_id && !schoolIdByDraft[draft.id]"
              @click="onConfirm(draft.id, draft.matched_school_id)"
            >
              Confirm
            </DesignSystemButton>
            <DesignSystemButton
              variant="outline"
              color="slate"
              @click="onDiscard(draft.id)"
            >
              Discard
            </DesignSystemButton>
          </div>
        </DesignSystemCard>
      </li>
    </ul>
  </div>
</template>
