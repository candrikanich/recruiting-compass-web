import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useNuxProgress } from "~/composables/useNuxProgress";
import { useUserStore } from "~/stores/user";
import { EMPTY_NUX_PROGRESS } from "~/types/nux";

const mockFetchFn = vi.fn().mockResolvedValue({});

vi.mock("~/composables/useAuthFetch", () => ({
  useAuthFetch: () => ({ $fetchAuth: mockFetchFn }),
}));

describe("useNuxProgress", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockFetchFn.mockClear();
    const userStore = useUserStore();
    userStore.user = { id: "user-1" } as any;
  });

  it("returns empty progress when user has no nux_progress", () => {
    const { progress, checklistPercentage } = useNuxProgress();
    expect(progress.value).toEqual(EMPTY_NUX_PROGRESS);
    expect(checklistPercentage.value).toBe(0);
  });

  it("completeItem marks item done and PATCHes server", async () => {
    const { completeItem, progress } = useNuxProgress();
    await completeItem("first_school");
    expect(progress.value.checklist.items.first_school?.completed).toBe(true);
    expect(progress.value.checklist.items.first_school?.completedAt).toBeTruthy();
    expect(mockFetchFn).toHaveBeenCalledWith(
      "/api/user/nux-progress",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("calculates checklist percentage correctly", () => {
    const userStore = useUserStore();
    userStore.user = {
      id: "user-1",
      nux_progress: {
        ...EMPTY_NUX_PROGRESS,
        checklist: {
          items: {
            sport: { completed: true, completedAt: "2026-01-01T00:00:00Z" },
            first_school: { completed: true, completedAt: "2026-01-01T00:00:00Z" },
          },
          dismissedAt: null,
        },
      },
    } as any;

    const { checklistPercentage } = useNuxProgress();
    expect(checklistPercentage.value).toBe(25); // 2 of 8
  });

  it("dismissChecklist sets dismissedAt", async () => {
    const { dismissChecklist, progress } = useNuxProgress();
    await dismissChecklist();
    expect(progress.value.checklist.dismissedAt).toBeTruthy();
    expect(mockFetchFn).toHaveBeenCalled();
  });

  it("recordFirstVisit stores timestamp only on first call per key", async () => {
    const { recordFirstVisit, progress } = useNuxProgress();
    await recordFirstVisit("templates");
    expect(progress.value.firstVisits.templates).toBeTruthy();
    const firstTimestamp = progress.value.firstVisits.templates;
    await recordFirstVisit("templates");
    expect(progress.value.firstVisits.templates).toBe(firstTimestamp);
    expect(mockFetchFn).toHaveBeenCalledTimes(1);
  });

  it("isPromptDismissed returns true within cooldown window", () => {
    const userStore = useUserStore();
    const now = new Date().toISOString();
    userStore.user = {
      id: "user-1",
      nux_progress: {
        ...EMPTY_NUX_PROGRESS,
        dismissals: { gpa_prompt: now },
      },
    } as any;

    const { isPromptDismissed } = useNuxProgress();
    expect(isPromptDismissed("gpa_prompt", 7)).toBe(true);
  });

  it("isPromptDismissed returns false outside cooldown window", () => {
    const userStore = useUserStore();
    const eightDaysAgo = new Date(Date.now() - 8 * 86_400_000).toISOString();
    userStore.user = {
      id: "user-1",
      nux_progress: {
        ...EMPTY_NUX_PROGRESS,
        dismissals: { gpa_prompt: eightDaysAgo },
      },
    } as any;

    const { isPromptDismissed } = useNuxProgress();
    expect(isPromptDismissed("gpa_prompt", 7)).toBe(false);
  });
});
