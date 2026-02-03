import { ref, computed, type ComputedRef, type Ref } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import type { CommunicationTemplate } from "~/types/models";
import type { Database } from "~/types/database";

// Type aliases for Supabase casting
type CommunicationTemplateInsert =
  Database["public"]["Tables"]["communication_templates"]["Insert"];
type _CommunicationTemplateUpdate =
  Database["public"]["Tables"]["communication_templates"]["Update"];

// Unlock condition types (migrated from useTemplateUnlock)
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

// Re-export CommunicationTemplate for convenience
export type { CommunicationTemplate };

/**
 * useCommunicationTemplates composable
 * Manages email, message, and phone script templates with variable substitution
 * and unlock conditions for template availability
 */
export const useCommunicationTemplates = (): {
  templates: Ref<CommunicationTemplate[]>;
  isLoading: Ref<boolean>;
  error: Ref<string | null>;
  emailTemplates: ComputedRef<CommunicationTemplate[]>;
  messageTemplates: ComputedRef<CommunicationTemplate[]>;
  phoneScriptTemplates: ComputedRef<CommunicationTemplate[]>;
  favoriteTemplates: ComputedRef<CommunicationTemplate[]>;
  allTemplates: ComputedRef<CommunicationTemplate[]>;
  loadTemplates: () => Promise<void>;
  loadUserTemplates: () => Promise<void>;
  createTemplate: (
    name: string,
    type: CommunicationTemplate["type"],
    body: string,
    subject?: string,
    description?: string,
    tags?: string[],
  ) => Promise<CommunicationTemplate | null>;
  updateTemplate: (
    id: string,
    updates: Partial<CommunicationTemplate>,
  ) => Promise<boolean>;
  deleteTemplate: (id: string) => Promise<boolean>;
  toggleFavorite: (id: string) => Promise<boolean>;
  incrementUseCount: (id: string) => Promise<void>;
  renderTemplate: (
    template: CommunicationTemplate,
    variables: Record<string, string>,
  ) => string;
  interpolateTemplate: (
    template: CommunicationTemplate,
    variables: Record<string, string>,
  ) => string;
  getTemplate: (id: string) => CommunicationTemplate | undefined;
  getTemplatesByType: (
    type: CommunicationTemplate["type"],
  ) => CommunicationTemplate[];
  searchTemplates: (
    query: string,
    type?: CommunicationTemplate["type"],
  ) => CommunicationTemplate[];
  checkUnlockCondition: (condition: UnlockCondition) => Promise<boolean>;
  checkTemplateUnlocked: (template: CommunicationTemplate) => Promise<{
    unlocked: boolean;
    missingConditions: UnlockCondition[];
    progressPercent: number;
  }>;
  getTemplatesWithUnlockStatus: (
    templates: CommunicationTemplate[],
  ) => Promise<TemplateWithUnlockStatus[]>;
  filterPredefined: (
    templates: CommunicationTemplate[],
  ) => CommunicationTemplate[];
} => {
  const supabase = useSupabase();
  const userStore = useUserStore();

  // State
  const templates = ref<CommunicationTemplate[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Computed
  const emailTemplates = computed(() => {
    return templates.value.filter((t) => t.type === "email");
  });

  const messageTemplates = computed(() => {
    return templates.value.filter((t) => t.type === "message");
  });

  const phoneScriptTemplates = computed(() => {
    return templates.value.filter((t) => t.type === "phone_script");
  });

  const favoriteTemplates = computed(() => {
    return templates.value
      .filter((t) => t.is_favorite)
      .sort((a, b) => b.use_count - a.use_count);
  });

  // Load templates (both user templates and predefined templates)
  const loadTemplates = async () => {
    if (!userStore.user) return;

    isLoading.value = true;
    error.value = null;

    try {
      // Fetch user templates AND predefined templates
      const response = await supabase
        .from("communication_templates")
        .select("*")
        .or(`user_id.eq.${userStore.user.id},is_predefined.eq.true`)
        .order("updated_at", { ascending: false });
      const { data, error: err } = response as {
        data: CommunicationTemplate[] | null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: any;
      };

      if (err) {
        // Handle table not found gracefully (feature not yet implemented)
        if (
          err?.code === "PGRST205" ||
          err?.message?.includes("communication_templates")
        ) {
          templates.value = [];
          return;
        }
        throw err;
      }
      templates.value = data || [];
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to load templates";
      console.error("Load templates error:", err);
    } finally {
      isLoading.value = false;
    }
  };

  // Create template
  const createTemplate = async (
    name: string,
    type: CommunicationTemplate["type"],
    body: string,
    subject?: string,
    _description?: string,
    _tags?: string[],
  ): Promise<CommunicationTemplate | null> => {
    if (!userStore.user) return null;

    error.value = null;

    try {
      // Extract variables from body
      const variablePattern = /\{\{(\w+)\}\}/g;
      const variables = Array.from(body.matchAll(variablePattern), (m) => m[1]);
      const uniqueVariables = [...new Set(variables)];

      const newTemplate: CommunicationTemplateInsert = {
        user_id: userStore.user.id,
        name,
        type,
        subject: type === "email" ? subject : undefined,
        body,
      };

      const insertResponse =
        (await // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from("communication_templates") as any)

          .insert([newTemplate])
          .select()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .single()) as { data: CommunicationTemplate; error: any };
      const { data, error: err } = insertResponse;

      if (err) throw err;

      // Add computed variables to the returned template
      const templateWithVariables: CommunicationTemplate = {
        ...data,
        variables: uniqueVariables,
      };

      templates.value = [templateWithVariables, ...templates.value];
      return templateWithVariables;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to create template";
      console.error("Create template error:", err);
      return null;
    }
  };

  // Update template
  const updateTemplate = async (
    id: string,
    updates: Partial<CommunicationTemplate>,
  ): Promise<boolean> => {
    if (!userStore.user) return false;

    error.value = null;

    try {
      const updateResponse =
        (await // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from("communication_templates") as any)
          .update(updates)
          .eq("id", id)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .eq("user_id", userStore.user.id)) as { error: any };
      const { error: err } = updateResponse;

      if (err) throw err;

      const index = templates.value.findIndex((t) => t.id === id);
      if (index !== -1) {
        templates.value[index] = { ...templates.value[index], ...updates };
      }

      return true;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to update template";
      console.error("Update template error:", err);
      return false;
    }
  };

  // Delete template
  const deleteTemplate = async (id: string): Promise<boolean> => {
    if (!userStore.user) return false;

    error.value = null;

    try {
      const { error: err } = await supabase
        .from("communication_templates")
        .delete()
        .eq("id", id)
        .eq("user_id", userStore.user.id);

      if (err) throw err;

      templates.value = templates.value.filter((t) => t.id !== id);
      return true;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to delete template";
      console.error("Delete template error:", err);
      return false;
    }
  };

  // Toggle favorite
  const toggleFavorite = async (id: string): Promise<boolean> => {
    const template = templates.value.find((t) => t.id === id);
    if (!template) return false;

    return updateTemplate(id, { is_favorite: !template.is_favorite });
  };

  // Increment use count
  const incrementUseCount = async (id: string): Promise<void> => {
    const template = templates.value.find((t) => t.id === id);
    if (!template) return;

    await updateTemplate(id, { use_count: template.use_count + 1 });
  };

  // Render template with variables
  const renderTemplate = (
    template: CommunicationTemplate,
    variables: Record<string, string>,
  ): string => {
    let rendered = template.body;

    // Replace variables with provided values
    Object.entries(variables).forEach(([key, value]) => {
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      rendered = rendered.replace(pattern, value);
    });

    return rendered;
  };

  // Get template by ID
  const getTemplate = (id: string): CommunicationTemplate | undefined => {
    return templates.value.find((t) => t.id === id);
  };

  // Search templates
  const searchTemplates = (
    query: string,
    type?: CommunicationTemplate["type"],
  ): CommunicationTemplate[] => {
    return templates.value.filter((t) => {
      const matchesType = !type || t.type === type;
      const matchesQuery = query
        ? t.name.toLowerCase().includes(query.toLowerCase()) ||
          t.body.toLowerCase().includes(query.toLowerCase()) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))
        : true;

      return matchesType && matchesQuery;
    });
  };

  // Get templates by type
  const getTemplatesByType = (
    type: CommunicationTemplate["type"],
  ): CommunicationTemplate[] => {
    return templates.value.filter((t) => t.type === type);
  };

  // Interpolate template (alias for renderTemplate for backward compatibility)
  const interpolateTemplate = (
    template: CommunicationTemplate,
    variables: Record<string, string>,
  ): string => {
    return renderTemplate(template, variables);
  };

  // All templates computed (alias for templates)
  const allTemplates = computed(() => templates.value);

  // Load user templates (alias for loadTemplates)
  const loadUserTemplates = loadTemplates;

  // Unlock condition checking (migrated from useTemplateUnlock)
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

          const prefsResponse = await supabase
            .from("user_preferences")

            .select("player_details")
            .eq("user_id", userStore.user.id)
            .single();
          const { data: prefs } = prefsResponse as {
            data: { player_details: Record<string, unknown> } | null;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            error: any;
          };

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

          const docsResponse = await supabase
            .from("documents")
            .select("id")

            .eq("user_id", userStore.user.id)
            .eq("type", condition.documentType)
            .eq("is_current", true)
            .limit(1);
          const { data } = docsResponse as {
            data: { id: string }[] | null;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            error: any;
          };

          return (data?.length || 0) > 0;
        }

        case "task_completed": {
          if (!condition.taskId) return false;

          const { data } = (await supabase
            .from("athlete_task")
            .select("status")
            .eq("athlete_id", userStore.user.id)
            .eq("task_id", condition.taskId)
            .single()) as { data: { status: string } | null };

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
      const conditionGroup = template.unlock_conditions as unknown as
        | UnlockConditionGroup
        | undefined;
      const conditions = conditionGroup?.conditions || [];

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
        conditionGroup?.type === "AND"
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
    templatesInput: CommunicationTemplate[],
  ): Promise<TemplateWithUnlockStatus[]> => {
    isLoading.value = true;
    error.value = null;

    try {
      const results = await Promise.all(
        templatesInput.map(async (template) => {
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
      return templatesInput.map((t) => ({
        template: t,
        unlocked: true,
        missingConditions: [],
        progressPercent: 100,
      }));
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Filter templates that are predefined
   */
  const filterPredefined = (
    templatesInput: CommunicationTemplate[],
  ): CommunicationTemplate[] => {
    return templatesInput.filter((t) => {
      return "is_predefined" in t && t.is_predefined === true;
    });
  };

  return {
    // State
    templates,
    isLoading,
    error,

    // Computed
    emailTemplates,
    messageTemplates,
    phoneScriptTemplates,
    favoriteTemplates,
    allTemplates,

    // Methods - CRUD
    loadTemplates,
    loadUserTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleFavorite,
    incrementUseCount,

    // Methods - Rendering
    renderTemplate,
    interpolateTemplate,

    // Methods - Queries
    getTemplate,
    getTemplatesByType,
    searchTemplates,

    // Methods - Unlock conditions (migrated from useTemplateUnlock)
    checkUnlockCondition,
    checkTemplateUnlocked,
    getTemplatesWithUnlockStatus,
    filterPredefined,
  };
};
