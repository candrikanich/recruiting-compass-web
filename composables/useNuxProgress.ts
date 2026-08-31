import { computed } from "vue";
import { useUserStore } from "~/stores/user";
import { useAuthFetch } from "~/composables/useAuthFetch";
import {
  type NuxProgress,
  type NuxChecklistKey,
  NUX_CHECKLIST_KEYS,
  parseNuxProgress,
} from "~/types/nux";

export function useNuxProgress() {
  const userStore = useUserStore();
  const { $fetchAuth } = useAuthFetch();

  const progress = computed<NuxProgress>(() =>
    parseNuxProgress(userStore.user?.nux_progress),
  );

  const checklistPercentage = computed(() => {
    const items = progress.value.checklist.items;
    const completed = NUX_CHECKLIST_KEYS.filter((k) => items[k]?.completed).length;
    return Math.round((completed / NUX_CHECKLIST_KEYS.length) * 100);
  });

  const isChecklistComplete = computed(() => checklistPercentage.value === 100);

  async function persistProgress(updated: NuxProgress) {
    if (userStore.user) {
      userStore.user = { ...userStore.user, nux_progress: updated };
    }
    await $fetchAuth("/api/user/nux-progress", {
      method: "PATCH",
      body: { nux_progress: updated },
    });
  }

  async function completeItem(key: NuxChecklistKey) {
    const current = parseNuxProgress(userStore.user?.nux_progress);
    if (current.checklist.items[key]?.completed) return;
    current.checklist.items[key] = {
      completed: true,
      completedAt: new Date().toISOString(),
    };
    await persistProgress(current);
  }

  async function dismissChecklist() {
    const current = parseNuxProgress(userStore.user?.nux_progress);
    current.checklist.dismissedAt = new Date().toISOString();
    await persistProgress(current);
  }

  async function recordFirstVisit(pageKey: string) {
    const current = parseNuxProgress(userStore.user?.nux_progress);
    if (current.firstVisits[pageKey]) return;
    current.firstVisits[pageKey] = new Date().toISOString();
    await persistProgress(current);
  }

  async function dismissPrompt(promptKey: string) {
    const current = parseNuxProgress(userStore.user?.nux_progress);
    current.dismissals[promptKey] = new Date().toISOString();
    await persistProgress(current);
  }

  function isPromptDismissed(promptKey: string, cooldownDays: number): boolean {
    const dismissedAt = progress.value.dismissals[promptKey];
    if (!dismissedAt) return false;
    const elapsed = Date.now() - new Date(dismissedAt).getTime();
    return elapsed < cooldownDays * 86_400_000;
  }

  return {
    progress,
    checklistPercentage,
    isChecklistComplete,
    completeItem,
    dismissChecklist,
    recordFirstVisit,
    dismissPrompt,
    isPromptDismissed,
  };
}
