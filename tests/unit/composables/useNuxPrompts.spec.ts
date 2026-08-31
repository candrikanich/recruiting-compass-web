import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";

const mockIsPromptDismissed = vi.fn().mockReturnValue(false);
const mockDismissPrompt = vi.fn();

vi.mock("~/composables/useNuxProgress", () => ({
  useNuxProgress: () => ({
    isPromptDismissed: mockIsPromptDismissed,
    dismissPrompt: mockDismissPrompt,
    progress: ref({
      version: 1,
      checklist: { items: {}, dismissedAt: null },
      firstVisits: {},
      dismissals: {},
    }),
  }),
}));

describe("useNuxPrompts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPromptDismissed.mockReturnValue(false);
  });

  it("returns null when no prompts apply", async () => {
    const { useNuxPrompts } = await import("~/composables/useNuxPrompts");
    const { activePrompt, evaluatePrompts } = useNuxPrompts();
    evaluatePrompts({ context: "dashboard", userGpa: 3.5, userSat: 1200 });
    expect(activePrompt.value).toBeNull();
  });

  it("returns GPA prompt on fit-score page when GPA missing", async () => {
    const { useNuxPrompts } = await import("~/composables/useNuxPrompts");
    const { activePrompt, evaluatePrompts } = useNuxPrompts();
    evaluatePrompts({
      context: "fit-score",
      userGpa: null,
      schoolName: "Ohio State",
    });
    expect(activePrompt.value?.id).toBe("gpa_fit_score");
    expect(activePrompt.value?.message).toContain("Ohio State");
  });

  it("respects session dedup — same prompt not shown twice", async () => {
    const { useNuxPrompts } = await import("~/composables/useNuxPrompts");
    const { activePrompt, evaluatePrompts, dismissActivePrompt } =
      useNuxPrompts();
    evaluatePrompts({
      context: "fit-score",
      userGpa: null,
      schoolName: "Ohio State",
    });
    expect(activePrompt.value).toBeTruthy();
    await dismissActivePrompt();
    evaluatePrompts({
      context: "fit-score",
      userGpa: null,
      schoolName: "Michigan",
    });
    expect(activePrompt.value).toBeNull(); // Same field, same session
  });

  it("respects 7-day cooldown from nux_progress", async () => {
    mockIsPromptDismissed.mockReturnValue(true);
    const { useNuxPrompts } = await import("~/composables/useNuxPrompts");
    const { activePrompt, evaluatePrompts } = useNuxPrompts();
    evaluatePrompts({
      context: "fit-score",
      userGpa: null,
      schoolName: "Ohio State",
    });
    expect(activePrompt.value).toBeNull();
  });
});
