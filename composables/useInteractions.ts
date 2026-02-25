import { ref, computed, shallowRef, inject, watch, type ComputedRef } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import { useActiveFamily } from "./useActiveFamily";
import { useFamilyContext } from "./useFamilyContext";
import type { Interaction } from "~/types/models";
import type { Database } from "~/types/database";
import { interactionSchema } from "~/utils/validation/schemas";
import { sanitizeHtml } from "~/utils/validation/sanitize";
import { createClientLogger } from "~/utils/logger";
import { useAuthFetch } from "~/composables/useAuthFetch";

const logger = createClientLogger("useInteractions");

// Get Table types from Database
type InteractionsTable = Database["public"]["Tables"]["interactions"];
import {
  exportInteractionsToCSV,
  downloadInteractionsCSV,
} from "~/utils/interactions/exportCSV";
import {
  validateAttachmentFile,
  uploadInteractionAttachments,
} from "~/utils/interactions/attachments";
import { createInboundInteractionAlert } from "~/utils/interactions/inboundAlerts";

// Type aliases for Supabase casting
type _InteractionInsert = InteractionsTable["Insert"];
type _InteractionUpdate = InteractionsTable["Update"];

/**
 * useInteractions composable
 * Manages interaction (communication) CRUD and filters for the recruiting tracker.
 *
 * FAMILY-BASED ACCESS CONTROL (v2.0):
 * - Interactions are owned by family units, not individual users
 * - Students see their own interactions (their family)
 * - Parents see all interactions in accessible families
 * - Queries filter by family_unit_id instead of user_id
 * - ONLY STUDENTS can create interactions (enforced at DB level)
 *
 * Related composables:
 * - useInteractionReminders  – follow-up reminder CRUD + computed filters
 * - useInteractionNotes      – note history from audit logs
 */
type InteractionFilters = {
  schoolId?: string;
  coachId?: string;
  type?: string;
  direction?: string;
  sentiment?: string;
  startDate?: string;
  endDate?: string;
  loggedBy?: string;
};

export const useInteractions = () => {
  return useInteractionsInternal();
};

const useInteractionsInternal = (): {
  interactions: ComputedRef<Interaction[]>;
  loading: ComputedRef<boolean>;
  error: ComputedRef<string | null>;
  fetchInteractions: (filters?: InteractionFilters) => Promise<void>;
  getInteraction: (id: string) => Promise<Interaction | null>;
  createInteraction: (
    interactionData: Omit<Interaction, "id" | "created_at">,
    files?: File[],
  ) => Promise<Interaction>;
  updateInteraction: (
    id: string,
    updates: Partial<Interaction>,
  ) => Promise<Interaction>;
  deleteInteraction: (id: string) => Promise<void>;
  uploadAttachments: (
    files: File[],
    interactionId: string,
  ) => Promise<string[]>;
  exportToCSV: () => string;
  downloadCSV: () => void;
  fetchMyInteractions: (
    filters?: Omit<InteractionFilters, "loggedBy">,
  ) => Promise<void>;
  fetchAthleteInteractions: (
    athleteUserId: string,
    filters?: Omit<InteractionFilters, "loggedBy">,
  ) => Promise<void>;
  smartDelete: (id: string) => Promise<{ cascadeUsed: boolean }>;
} => {
  const supabase = useSupabase();
  const userStore = useUserStore();
  const { $fetchAuth } = useAuthFetch();
  const injectedFamily =
    inject<ReturnType<typeof useActiveFamily>>("activeFamily");

  if (!injectedFamily) {
    logger.warn(
      "[useInteractions] activeFamily injection failed, using singleton fallback. " +
        "This may cause data sync issues when parent switches athletes.",
    );
  }

  const activeFamily = injectedFamily ?? useFamilyContext();

  const interactions = shallowRef<Interaction[]>([]);
  const loadingRef = ref(false);
  const errorRef = ref<string | null>(null);

  // Computed proxies for return type compatibility
  const loading = computed(() => loadingRef.value);
  const error = computed(() => errorRef.value);

  // Auto-invalidate cache when parent switches athlete
  watch(
    () => activeFamily.activeAthleteId?.value,
    async (newId, oldId) => {
      if (newId && newId !== oldId) {
        interactions.value = [];
        await fetchInteractions();
      }
    },
  );

  const fetchInteractions = async (filters?: {
    schoolId?: string;
    coachId?: string;
    type?: string;
    direction?: string;
    sentiment?: string;
    startDate?: string;
    endDate?: string;
    loggedBy?: string;
  }) => {
    if (!activeFamily.activeFamilyId.value) {
      errorRef.value = "No family context";
      return;
    }

    loadingRef.value = true;
    errorRef.value = null;

    try {
      let query = supabase
        .from("interactions")
        .select(
          `
          id,
          school_id,
          coach_id,
          event_id,
          type,
          direction,
          subject,
          content,
          sentiment,
          occurred_at,
          logged_by,
          attachments,
          family_unit_id,
          created_at,
          updated_at
        `,
        )
        .eq("family_unit_id", activeFamily.activeFamilyId.value)
        .order("occurred_at", { ascending: false });

      if (filters?.schoolId) {
        query = query.eq("school_id", filters.schoolId);
      }

      if (filters?.coachId) {
        query = query.eq("coach_id", filters.coachId);
      }

      if (filters?.type) {
        query = query.eq("type", filters.type);
      }

      if (filters?.direction) {
        query = query.eq("direction", filters.direction);
      }

      if (filters?.sentiment) {
        query = query.eq("sentiment", filters.sentiment);
      }

      if (filters?.loggedBy) {
        query = query.eq("logged_by", filters.loggedBy);
      }

      if (filters?.startDate) {
        query = query.gte(
          "occurred_at",
          new Date(filters.startDate).toISOString(),
        );
      }

      if (filters?.endDate) {
        query = query.lte(
          "occurred_at",
          new Date(filters.endDate).toISOString(),
        );
      }

      const response = await query;
      const { data, error: fetchError } = response as {
        data: Interaction[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: any;
      };

      if (fetchError) throw fetchError;

      interactions.value = data || [];
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch interactions";
      logger.error("[useInteractions] fetchInteractions error:", err);
      errorRef.value = message;
    } finally {
      loadingRef.value = false;
    }
  };

  const exportToCSV = (): string => {
    return exportInteractionsToCSV(interactions.value);
  };

  const downloadCSV = () => {
    downloadInteractionsCSV(interactions.value);
  };

  const getInteraction = async (id: string): Promise<Interaction | null> => {
    loadingRef.value = true;
    errorRef.value = null;

    try {
      const response = await supabase
        .from("interactions")
        .select("*")
        .eq("id", id)
        .single();

      const { data, error: fetchError } = response as {
        data: Interaction;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: any;
      };

      if (fetchError) throw fetchError;
      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch interaction";
      errorRef.value = message;
      return null;
    } finally {
      loadingRef.value = false;
    }
  };

  const uploadAttachments = async (
    files: File[],
    interactionId: string,
  ): Promise<string[]> => {
    for (const file of files) {
      validateAttachmentFile(file);
    }
    return uploadInteractionAttachments(supabase, files, interactionId);
  };

  const createInteraction = async (
    interactionData: Omit<Interaction, "id" | "created_at">,
    files?: File[],
  ) => {
    if (!userStore.user) throw new Error("User not authenticated");
    if (userStore.user.role !== "player") {
      throw new Error("Only players can create interactions");
    }
    if (!activeFamily.activeFamilyId.value) {
      throw new Error("No family context available");
    }

    loadingRef.value = true;
    errorRef.value = null;

    try {
      const validated = await interactionSchema.parseAsync(interactionData);

      if (validated.subject) {
        validated.subject = sanitizeHtml(validated.subject);
      }
      if (validated.content) {
        validated.content = sanitizeHtml(validated.content);
      }

      if (files && files.length > 0) {
        for (const file of files) {
          validateAttachmentFile(file);
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insertResponse = await (supabase.from("interactions") as any)
        .insert([
          {
            ...validated,
            logged_by: userStore.user.id,
            family_unit_id: activeFamily.activeFamilyId.value,
          },
        ])
        .select()
        .single();

      const { data, error: insertError } = insertResponse as {
        data: Interaction;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: any;
      };

      if (insertError) throw insertError;

      let updatedData = data;

      if (files && files.length > 0) {
        const uploadedPaths = await uploadAttachments(files, data.id);
        if (uploadedPaths.length > 0) {
          const { error: updateError } =
            await // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase.from("interactions") as any)
              .update({ attachments: uploadedPaths })
              .eq("id", data.id);
          if (updateError) {
            logger.error("Failed to update attachment paths:", updateError);
            throw new Error("Failed to save attachments. Interaction created but files were not linked.");
          }
          updatedData = { ...data, attachments: uploadedPaths };
        }
      }

      if (updatedData.direction === "inbound" && userStore.user) {
        await createInboundInteractionAlert({
          interaction: updatedData,
          userId: userStore.user.id,
          supabase,
        });
      }

      interactions.value = [updatedData, ...interactions.value];
      return updatedData;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create interaction";
      errorRef.value = message;
      throw err;
    } finally {
      loadingRef.value = false;
    }
  };

  const updateInteraction = async (
    id: string,
    updates: Partial<Interaction>,
  ) => {
    if (!userStore.user) throw new Error("User not authenticated");

    loadingRef.value = true;
    errorRef.value = null;

    try {
      const sanitizedUpdates = { ...updates };

      if (sanitizedUpdates.subject) {
        sanitizedUpdates.subject = sanitizeHtml(sanitizedUpdates.subject);
      }
      if (sanitizedUpdates.content) {
        sanitizedUpdates.content = sanitizeHtml(sanitizedUpdates.content);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateResponse = await (supabase.from("interactions") as any)
        .update(sanitizedUpdates)
        .eq("id", id)
        .eq("logged_by", userStore.user.id)
        .select()
        .single();

      const { data, error: updateError } = updateResponse as {
        data: Interaction;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: any;
      };

      if (updateError) throw updateError;

      const index = interactions.value.findIndex((i) => i.id === id);
      if (index !== -1) {
        interactions.value = interactions.value.map((item, i) => (i === index ? data : item));
      }

      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update interaction";
      errorRef.value = message;
      throw err;
    } finally {
      loadingRef.value = false;
    }
  };

  const deleteInteraction = async (id: string) => {
    if (!userStore.user) throw new Error("User not authenticated");
    if (!activeFamily.activeFamilyId.value)
      throw new Error("Family context not loaded");

    loadingRef.value = true;
    errorRef.value = null;

    try {
      const { error: deleteError } = await supabase
        .from("interactions")
        .delete()
        .eq("id", id)
        .eq("family_unit_id", activeFamily.activeFamilyId.value)
        .eq("logged_by", userStore.user.id);

      if (deleteError) throw deleteError;

      interactions.value = interactions.value.filter((i) => i.id !== id);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete interaction";
      errorRef.value = message;
      throw err;
    } finally {
      loadingRef.value = false;
    }
  };

  const fetchMyInteractions = async (filters?: {
    schoolId?: string;
    coachId?: string;
    type?: string;
    direction?: string;
    sentiment?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    if (!userStore.user) throw new Error("User not authenticated");

    await fetchInteractions({
      ...filters,
      loggedBy: userStore.user.id,
    });
  };

  const fetchAthleteInteractions = async (
    athleteUserId: string,
    filters?: {
      schoolId?: string;
      coachId?: string;
      type?: string;
      direction?: string;
      sentiment?: string;
      startDate?: string;
      endDate?: string;
    },
  ) => {
    await fetchInteractions({
      ...filters,
      loggedBy: athleteUserId,
    });
  };

  const smartDelete = async (id: string): Promise<{ cascadeUsed: boolean }> => {
    try {
      await deleteInteraction(id);
      return { cascadeUsed: false };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete interaction";

      if (
        message.includes("Cannot delete") ||
        message.includes("violates foreign key constraint") ||
        message.includes("still referenced")
      ) {
        const cascadeResponse = await $fetchAuth<Record<string, unknown>>(
          `/api/interactions/${id}/cascade-delete`,
          { method: "POST", body: { confirmDelete: true } },
        );
        if (cascadeResponse.success) {
          interactions.value = interactions.value.filter((i) => i.id !== id);
          return { cascadeUsed: true };
        }
        throw new Error(
          (cascadeResponse.message as string | undefined) ||
            "Cascade delete failed",
        );
      }
      throw err;
    }
  };

  return {
    interactions: computed(() => interactions.value),
    loading,
    error,
    fetchInteractions,
    getInteraction,
    createInteraction,
    updateInteraction,
    deleteInteraction,
    smartDelete,
    uploadAttachments,
    exportToCSV,
    downloadCSV,
    fetchMyInteractions,
    fetchAthleteInteractions,
  };
};
