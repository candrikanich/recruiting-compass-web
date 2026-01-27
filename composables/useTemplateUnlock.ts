/**
 * @deprecated Use `useCommunicationTemplates()` instead. All unlock and template
 * functionality has been consolidated into the useCommunicationTemplates composable.
 * This composable will be removed in a future version.
 *
 * Migration: Replace `useTemplateUnlock()` with `useCommunicationTemplates()` and access
 * the unlock methods from the same composable.
 *
 * Before:
 *   const { getTemplatesWithUnlockStatus } = useTemplateUnlock();
 *
 * After:
 *   const { getTemplatesWithUnlockStatus } = useCommunicationTemplates();
 */

/**
 * useTemplateUnlock composable
 * Manages checking unlock conditions for email templates and rendering with variable substitution
 */

import { ref, type Ref } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import type { CommunicationTemplate } from "~/types/models";

export interface UnlockCondition {
  type: "profile_field" | "document_exists" | "task_completed" | "school_count";
  field?: string;
  documentType?: string;
  taskId?: string;
  minCount?: number;
  description: string;
}

export interface UnlockConditionGroup {
  type: "AND" | "OR";
  conditions: UnlockCondition[];
}

export interface TemplateWithUnlockStatus {
  template: CommunicationTemplate;
  unlocked: boolean;
  missingConditions: UnlockCondition[];
  progressPercent: number;
}

export const useTemplateUnlock = (): {
  loading: Ref<boolean>;
  error: Ref<string | null>;
  checkUnlockCondition: (condition: UnlockCondition) => Promise<boolean>;
  checkTemplateUnlocked: (
    template: CommunicationTemplate,
  ) => Promise<{
    unlocked: boolean;
    missingConditions: UnlockCondition[];
    progressPercent: number;
  }>;
  getTemplatesWithUnlockStatus: (
    templates: CommunicationTemplate[],
  ) => Promise<TemplateWithUnlockStatus[]>;
  renderTemplate: (
    template: CommunicationTemplate,
    additionalVariables?: Record<string, string>,
  ) => Promise<{ subject: string; body: string }>;
  filterPredefined: (
    templates: CommunicationTemplate[],
  ) => CommunicationTemplate[];
} => {
  const supabase = useSupabase();
  const userStore = useUserStore();

  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Check if a single unlock condition is met
   */
  const checkUnlockCondition = async (
    condition: UnlockCondition,
  ): Promise<boolean> => {
    if (!userStore.user) return false;

    try {
      switch (condition.type) {
        case "profile_field": {
          if (!condition.field) return false;

          const { data: prefs } = await supabase
            .from("user_preferences")
            .select("player_details")
            .eq("user_id", userStore.user.id)
            .single();

          if (!prefs?.player_details) return false;

          // Navigate nested field path (e.g., "player_details.graduation_year")
          const fieldPath = condition.field.split(".");
          let value: unknown = prefs;
          for (const key of fieldPath) {
            if (typeof value === "object" && value !== null && key in value) {
              value = (value as Record<string, unknown>)[key];
            } else {
              value = undefined;
              break;
            }
          }

          return value !== null && value !== undefined && value !== "";
        }

        case "document_exists": {
          if (!condition.documentType) return false;

          const { data } = await supabase
            .from("documents")
            .select("id")
            .eq("user_id", userStore.user.id)
            .eq("type", condition.documentType)
            .eq("is_current", true)
            .limit(1);

          return (data?.length || 0) > 0;
        }

        case "task_completed": {
          if (!condition.taskId) return false;

          const { data } = await supabase
            .from("athlete_task")
            .select("status")
            .eq("athlete_id", userStore.user.id)
            .eq("task_id", condition.taskId)
            .single();

          return data?.status === "completed";
        }

        case "school_count": {
          const minCount = condition.minCount || 0;
          const { count } = await supabase
            .from("schools")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userStore.user.id);

          return (count || 0) >= minCount;
        }

        default:
          return false;
      }
    } catch (err) {
      console.error("Error checking unlock condition:", err);
      return false;
    }
  };

  /**
   * Check if all unlock conditions for a template are met
   */
  const checkTemplateUnlocked = async (
    template: CommunicationTemplate,
  ): Promise<{
    unlocked: boolean;
    missingConditions: UnlockCondition[];
    progressPercent: number;
  }> => {
    // If no unlock conditions defined, template is unlocked
    if (!template.unlock_conditions) {
      return {
        unlocked: true,
        missingConditions: [],
        progressPercent: 100,
      };
    }

    try {
      const conditionGroup = template.unlock_conditions as UnlockConditionGroup;
      const conditions = conditionGroup.conditions || [];

      if (conditions.length === 0) {
        return {
          unlocked: true,
          missingConditions: [],
          progressPercent: 100,
        };
      }

      const results = await Promise.all(
        conditions.map(async (condition) => ({
          condition,
          met: await checkUnlockCondition(condition),
        })),
      );

      const missingConditions = results
        .filter((r) => !r.met)
        .map((r) => r.condition);

      const progressPercent = Math.round(
        ((results.length - missingConditions.length) / results.length) * 100,
      );

      // For AND conditions, all must be met. For OR, any one must be met
      const unlocked =
        conditionGroup.type === "AND"
          ? missingConditions.length === 0
          : results.some((r) => r.met);

      return {
        unlocked,
        missingConditions: unlocked ? [] : missingConditions,
        progressPercent,
      };
    } catch (err) {
      console.error("Error checking template unlock:", err);
      return {
        unlocked: false,
        missingConditions: [],
        progressPercent: 0,
      };
    }
  };

  /**
   * Get all templates with unlock status
   */
  const getTemplatesWithUnlockStatus = async (
    templates: CommunicationTemplate[],
  ): Promise<TemplateWithUnlockStatus[]> => {
    loading.value = true;
    error.value = null;

    try {
      const results = await Promise.all(
        templates.map(async (template) => {
          const unlockStatus = await checkTemplateUnlocked(template);
          return {
            template,
            ...unlockStatus,
          };
        }),
      );

      return results;
    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : "Failed to check template unlock status";
      return templates.map((t) => ({
        template: t,
        unlocked: true,
        missingConditions: [],
        progressPercent: 100,
      }));
    } finally {
      loading.value = false;
    }
  };

  /**
   * Render template with variable substitution
   */
  const renderTemplate = async (
    template: CommunicationTemplate,
    additionalVariables?: Record<string, string>,
  ): Promise<{ subject: string; body: string }> => {
    if (!userStore.user) throw new Error("User not authenticated");

    try {
      // Fetch user data for variable substitution
      const [{ data: prefs }, { data: user }] = await Promise.all([
        supabase
          .from("user_preferences")
          .select("player_details")
          .eq("user_id", userStore.user.id)
          .single(),
        supabase
          .from("users")
          .select("full_name, email")
          .eq("id", userStore.user.id)
          .single(),
      ]);

      const playerDetails = prefs?.player_details || {};

      // Build variable map
      const variables: Record<string, string> = {
        playerName: user?.full_name || "",
        gradYear: playerDetails.graduation_year?.toString() || "",
        position: Array.isArray(playerDetails.positions)
          ? playerDetails.positions[0] || ""
          : "",
        highSchool: playerDetails.high_school || "",
        gpa: playerDetails.gpa?.toString() || "",
        todayDate: new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
        ...additionalVariables,
      };

      // Replace variables in subject and body
      let subject = template.subject || "";
      let body = template.body || "";

      Object.entries(variables).forEach(([key, value]) => {
        const pattern = new RegExp(`\\{\\{${key}\\}\\}`, "g");
        subject = subject.replace(pattern, value || `[${key}]`);
        body = body.replace(pattern, value || `[${key}]`);
      });

      return { subject, body };
    } catch (err) {
      console.error("Error rendering template:", err);
      throw err;
    }
  };

  /**
   * Filter templates that are predefined
   */
  const filterPredefined = (
    templates: CommunicationTemplate[],
  ): CommunicationTemplate[] => {
    return templates.filter((t) => {
      const template = t as unknown as Record<string, unknown>;
      return template.is_predefined === true;
    });
  };

  return {
    loading,
    error,
    checkUnlockCondition,
    checkTemplateUnlocked,
    getTemplatesWithUnlockStatus,
    renderTemplate,
    filterPredefined,
  };
};
