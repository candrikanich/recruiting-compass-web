import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useNuxProgress } from "~/composables/useNuxProgress";
import { useUserStore } from "~/stores/user";
import { EMPTY_NUX_PROGRESS, NUX_CHECKLIST_KEYS } from "~/types/nux";

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
    expect(
      progress.value.checklist.items.first_school?.completedAt,
    ).toBeTruthy();
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
            first_school: {
              completed: true,
              completedAt: "2026-01-01T00:00:00Z",
            },
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

  it("completeItem sets checklist.allCompleteAt when the 8th item completes", async () => {
    const userStore = useUserStore();
    const items: Record<string, unknown> = {};
    for (const key of NUX_CHECKLIST_KEYS.slice(0, 7)) {
      items[key] = { completed: true, completedAt: "2026-01-01T00:00:00Z" };
    }
    userStore.user = {
      id: "user-1",
      nux_progress: {
        ...EMPTY_NUX_PROGRESS,
        checklist: { items, dismissedAt: null, allCompleteAt: null },
      },
    } as any;

    const { completeItem, progress } = useNuxProgress();
    await completeItem(NUX_CHECKLIST_KEYS[7]);
    expect(progress.value.checklist.allCompleteAt).toBeTruthy();
  });

  it("completeItem clears checklist.allCompleteAt if regressed to incomplete", async () => {
    // completeItem only ever marks items complete, so simulate regression by
    // starting from an all-complete state minus one item, verifying the
    // (still incomplete) recompute keeps allCompleteAt null.
    const userStore = useUserStore();
    const items: Record<string, unknown> = {};
    for (const key of NUX_CHECKLIST_KEYS.slice(0, 6)) {
      items[key] = { completed: true, completedAt: "2026-01-01T00:00:00Z" };
    }
    userStore.user = {
      id: "user-1",
      nux_progress: {
        ...EMPTY_NUX_PROGRESS,
        checklist: {
          items,
          dismissedAt: null,
          allCompleteAt: "2026-01-01T00:00:00Z",
        },
      },
    } as any;

    const { completeItem, progress } = useNuxProgress();
    await completeItem(NUX_CHECKLIST_KEYS[6]);
    expect(progress.value.checklist.allCompleteAt).toBeNull();
  });

  it("updateProfileCompletion sets completedAt at 100%", async () => {
    const { updateProfileCompletion, progress } = useNuxProgress();
    await updateProfileCompletion(100);
    expect(progress.value.profileCompletion.completedAt).toBeTruthy();
    expect(mockFetchFn).toHaveBeenCalledWith(
      "/api/user/nux-progress",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("updateProfileCompletion clears completedAt below 100%", async () => {
    const userStore = useUserStore();
    userStore.user = {
      id: "user-1",
      nux_progress: {
        ...EMPTY_NUX_PROGRESS,
        profileCompletion: { completedAt: "2026-01-01T00:00:00Z" },
      },
    } as any;

    const { updateProfileCompletion, progress } = useNuxProgress();
    await updateProfileCompletion(90);
    expect(progress.value.profileCompletion.completedAt).toBeNull();
  });

  it("updateProfileCompletion no-ops when state is unchanged", async () => {
    const userStore = useUserStore();
    userStore.user = {
      id: "user-1",
      nux_progress: {
        ...EMPTY_NUX_PROGRESS,
        profileCompletion: { completedAt: "2026-01-01T00:00:00Z" },
      },
    } as any;

    const { updateProfileCompletion } = useNuxProgress();
    await updateProfileCompletion(100);
    expect(mockFetchFn).not.toHaveBeenCalled();
  });
});
