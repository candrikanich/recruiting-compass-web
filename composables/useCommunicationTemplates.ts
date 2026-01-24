import { ref, computed, type ComputedRef, type Ref } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import type { CommunicationTemplate } from "~/types/models";
import type { Database } from "~/types/database";

// Type aliases for Supabase casting
type CommunicationTemplateInsert =
  Database["public"]["Tables"]["communication_templates"]["Insert"];
type CommunicationTemplateUpdate =
  Database["public"]["Tables"]["communication_templates"]["Update"];

// Re-export CommunicationTemplate for convenience
export type { CommunicationTemplate };

/**
 * useCommunicationTemplates composable
 * Manages email, message, and phone script templates with variable substitution
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
      const { data, error: err } = await supabase
        .from("communication_templates")
        .select("*")
        .or(`user_id.eq.${userStore.user.id},is_predefined.eq.true`)
        .order("updated_at", { ascending: false });

      if (err) {
        // Handle table not found gracefully (feature not yet implemented)
        if (
          err.code === "PGRST205" ||
          err.message?.includes("communication_templates")
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
        template_type: type,
        subject: type === "email" ? subject : undefined,
        body,
        variables: uniqueVariables,
        is_default: false,
      };

      const { data, error: err } = await supabase
        .from("communication_templates")
        .insert([newTemplate] as CommunicationTemplateInsert[])
        .select()
        .single();

      if (err) throw err;

      templates.value = [data, ...templates.value];
      return data;
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
      const { error: err } = await supabase
        .from("communication_templates")
        .update(updates as CommunicationTemplateUpdate)
        .eq("id", id)
        .eq("user_id", userStore.user.id);

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

    // Methods
    loadTemplates,
    loadUserTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleFavorite,
    incrementUseCount,
    renderTemplate,
    interpolateTemplate,
    getTemplate,
    getTemplatesByType,
    searchTemplates,
  };
};
