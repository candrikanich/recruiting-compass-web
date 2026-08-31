import { ref } from "vue";
import { useNuxProgress } from "~/composables/useNuxProgress";

export interface NuxPrompt {
  id: string;
  field: string;
  message: string;
  link: string;
}

export interface PromptContext {
  context: "dashboard" | "fit-score" | "template" | "schools" | "public-profile";
  userGpa?: number | null;
  userSat?: number | null;
  userAct?: number | null;
  userPosition?: string | null;
  schoolName?: string | null;
  profileCompleteness?: number;
  schoolCount?: number;
}

const COOLDOWN_DAYS = 7;

/**
 * Surfaces at most one contextual "complete your profile" nudge at a time,
 * deduped for the session and cooled down 7 days via nux_progress dismissals.
 */
export function useNuxPrompts() {
  const { isPromptDismissed, dismissPrompt } = useNuxProgress();
  const activePrompt = ref<NuxPrompt | null>(null);
  const sessionDismissed = new Set<string>();

  function evaluatePrompts(ctx: PromptContext) {
    activePrompt.value = null;

    const candidates: NuxPrompt[] = [];

    if (!ctx.userGpa && (ctx.context === "fit-score" || ctx.context === "schools")) {
      candidates.push({
        id: "gpa_fit_score",
        field: "gpa",
        message: ctx.schoolName
          ? `Add your GPA to see academic fit at ${ctx.schoolName}`
          : "Add your GPA to see academic fit at each school",
        link: "/settings/player-details?tab=academics",
      });
    }

    if (!ctx.userPosition && ctx.context === "template") {
      candidates.push({
        id: "position_template",
        field: "position",
        message: "Complete your position to personalize this email",
        link: "/settings/player-details?tab=athletics",
      });
    }

    if (
      !ctx.userSat &&
      !ctx.userAct &&
      ctx.context === "schools" &&
      (ctx.schoolCount ?? 0) >= 3
    ) {
      candidates.push({
        id: "test_scores_schools",
        field: "test_scores",
        message:
          "Add your test scores — we'll show how you compare at all your schools",
        link: "/settings/player-details?tab=academics",
      });
    }

    if ((ctx.profileCompleteness ?? 100) < 60 && ctx.context === "dashboard") {
      candidates.push({
        id: "profile_low_dashboard",
        field: "profile",
        message: `Your profile is ${ctx.profileCompleteness}% complete — coaches see this too`,
        link: "/settings/player-details",
      });
    }

    for (const candidate of candidates) {
      if (sessionDismissed.has(candidate.field)) continue;
      if (isPromptDismissed(candidate.id, COOLDOWN_DAYS)) continue;
      activePrompt.value = candidate;
      useNuxtApp().$posthog?.capture("nux_prompt_shown", {
        promptId: candidate.id,
      });
      return;
    }
  }

  async function dismissActivePrompt() {
    if (!activePrompt.value) return;
    const promptId = activePrompt.value.id;
    sessionDismissed.add(activePrompt.value.field);
    await dismissPrompt(promptId);
    activePrompt.value = null;
    useNuxtApp().$posthog?.capture("nux_prompt_dismissed", { promptId });
  }

  return { activePrompt, evaluatePrompts, dismissActivePrompt };
}
