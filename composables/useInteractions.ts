import { ref, computed, type ComputedRef } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import type { Interaction } from "~/types/models";
import type { Database } from "~/types/database";
import { interactionSchema } from "~/utils/validation/schemas";
import { sanitizeHtml } from "~/utils/validation/sanitize";

// Type aliases for Supabase casting
type InteractionInsert = Database["public"]["Tables"]["interactions"]["Insert"];
type InteractionUpdate = Database["public"]["Tables"]["interactions"]["Update"];
type NotificationInsert =
  Database["public"]["Tables"]["notifications"]["Insert"];

/**
 * useInteractions composable
 * Manages all interaction (communication) data for the recruiting tracker
 *
 * Key features:
 * - Fetch interactions with optional filters (school, coach, type, direction, sentiment)
 * - Client-side date range filtering for precise control
 * - CSV export functionality for reporting
 * - CRUD operations (add, update, delete interactions)
 * - Error handling and loading states
 */
export const useInteractions = (): {
  interactions: ComputedRef<Interaction[]>;
  loading: ComputedRef<boolean>;
  error: ComputedRef<string | null>;
  fetchInteractions: (filters?: {
    schoolId?: string;
    coachId?: string;
    type?: string;
    direction?: string;
    sentiment?: string;
    startDate?: string;
    endDate?: string;
  }) => Promise<void>;
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
} => {
  const supabase = useSupabase();
  const userStore = useUserStore();

  const interactions = ref<Interaction[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchInteractions = async (filters?: {
    schoolId?: string;
    coachId?: string;
    type?: string;
    direction?: string;
    sentiment?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    loading.value = true;
    error.value = null;

    // DEBUG: Log filters in dev/test
    if (process.env.NODE_ENV !== "production") {
      console.log("fetchInteractions called with filters:", filters);
      console.log("filters?.schoolId:", filters?.schoolId);
    }

    try {
      let query = supabase
        .from("interactions")
        .select("*")
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

      // Move date filtering to SQL (10x less data transferred, faster)
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

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      interactions.value = data || [];
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch interactions";
      error.value = message;
    } finally {
      loading.value = false;
    }
  };

  // Export interactions to CSV
  const exportToCSV = (): string => {
    if (interactions.value.length === 0) return "";

    // Headers
    const headers = [
      "Date",
      "Type",
      "Direction",
      "School",
      "Coach",
      "Subject",
      "Content",
      "Sentiment",
    ];
    const rows = interactions.value.map((i) => [
      i.occurred_at ? new Date(i.occurred_at).toLocaleDateString() : "",
      i.type,
      i.direction,
      i.school_id || "",
      i.coach_id || "",
      i.subject || "",
      (i.content || "").replace(/"/g, '""'), // Escape quotes
      i.sentiment || "",
    ]);

    // Build CSV
    const csvContent = [
      headers.map((h) => `"${h}"`).join(","),
      ...rows.map((r) => r.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    return csvContent;
  };

  // Download CSV file
  const downloadCSV = () => {
    const csv = exportToCSV();
    if (!csv) return;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `interactions-${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getInteraction = async (id: string): Promise<Interaction | null> => {
    loading.value = true;
    error.value = null;

    try {
      const { data, error: fetchError } = await supabase
        .from("interactions")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;
      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch interaction";
      error.value = message;
      return null;
    } finally {
      loading.value = false;
    }
  };

  // Validate file before upload
  const validateAttachmentFile = (file: File): void => {
    const ALLOWED_TYPES = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
    ];

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(
        `File type ${file.type} not allowed. Accepted: PDF, images, Word docs, Excel, text files`,
      );
    }

    if (file.size > MAX_SIZE) {
      throw new Error(
        `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum: 10MB`,
      );
    }
  };

  const uploadAttachments = async (
    files: File[],
    interactionId: string,
  ): Promise<string[]> => {
    const uploadedPaths: string[] = [];

    for (const file of files) {
      try {
        const timestamp = Date.now();
        const filename = `${timestamp}-${file.name}`;
        const filepath = `interactions/${interactionId}/${filename}`;

        const { data, error: uploadError } = await supabase.storage
          .from("interaction-attachments")
          .upload(filepath, file);

        if (uploadError) throw uploadError;
        if (data) {
          uploadedPaths.push(data.path);
        }
      } catch (err) {
        console.error(`Failed to upload file ${file.name}:`, err);
      }
    }

    return uploadedPaths;
  };

  const createInteraction = async (
    interactionData: Omit<Interaction, "id" | "created_at">,
    files?: File[],
  ) => {
    if (!userStore.user) throw new Error("User not authenticated");

    loading.value = true;
    error.value = null;

    try {
      // Validate interaction data with Zod schema
      const validated = await interactionSchema.parseAsync(interactionData);

      // Additional XSS protection: sanitize HTML content
      if (validated.subject) {
        validated.subject = sanitizeHtml(validated.subject);
      }
      if (validated.content) {
        validated.content = sanitizeHtml(validated.content);
      }

      // Validate file attachments if provided
      if (files && files.length > 0) {
        for (const file of files) {
          validateAttachmentFile(file);
        }
      }

      const { data, error: insertError } = await supabase
        .from("interactions")
        .insert([
          {
            ...validated,
            logged_by: userStore.user.id,
          },
        ] as InteractionInsert[])
        .select()
        .single();

      if (insertError) throw insertError;

      // Upload attachments if provided
      if (files && files.length > 0) {
        const uploadedPaths = await uploadAttachments(files, data.id);
        if (uploadedPaths.length > 0) {
          const { error: updateError } = await supabase
            .from("interactions")
            .update({ attachments: uploadedPaths } as InteractionUpdate)
            .eq("id", data.id);
          if (updateError)
            console.error("Failed to update attachment paths:", updateError);
        }
      }

      // Create inbound interaction alert if enabled
      if (data.direction === "inbound" && userStore.user) {
        try {
          // Parallelize preference and coach queries
          const [prefsRes, coachRes] = await Promise.all([
            supabase
              .from("user_preferences")
              .select("notification_settings")
              .eq("user_id", userStore.user.id)
              .single(),
            data.coach_id
              ? supabase
                  .from("coaches")
                  .select("first_name, last_name")
                  .eq("id", data.coach_id)
                  .single()
              : Promise.resolve({ data: null }),
          ]);

          const prefs = prefsRes.data;
          const coach = coachRes.data;

          if (prefs?.notification_settings?.enableInboundInteractionAlerts) {
            // Get coach name for notification
            let coachName = "A coach";
            if (coach) {
              coachName = `${coach.first_name} ${coach.last_name}`.trim();
            }

            // Create notification
            await supabase.from("notifications").insert([
              {
                user_id: userStore.user.id,
                type: "inbound_interaction",
                title: `New Contact from ${coachName}`,
                message: `${coachName} reached out via ${data.type}. View the interaction to see details.`,
                related_entity_type: "interaction",
                related_entity_id: data.id,
                scheduled_for: new Date().toISOString(),
              },
            ] as NotificationInsert[]);
          }
        } catch (err) {
          console.error("Failed to create inbound interaction alert:", err);
          // Don't throw - this shouldn't block interaction creation
        }
      }

      interactions.value.unshift(data);
      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create interaction";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateInteraction = async (
    id: string,
    updates: Partial<Interaction>,
  ) => {
    if (!userStore.user) throw new Error("User not authenticated");

    loading.value = true;
    error.value = null;

    try {
      // Sanitize content fields to prevent XSS
      const sanitizedUpdates = { ...updates };

      if (sanitizedUpdates.subject) {
        sanitizedUpdates.subject = sanitizeHtml(sanitizedUpdates.subject);
      }
      if (sanitizedUpdates.content) {
        sanitizedUpdates.content = sanitizeHtml(sanitizedUpdates.content);
      }

      const { data, error: updateError } = await supabase
        .from("interactions")
        .update(sanitizedUpdates as InteractionUpdate)
        .eq("id", id)
        .eq("logged_by", userStore.user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update local state
      const index = interactions.value.findIndex((i) => i.id === id);
      if (index !== -1) {
        interactions.value[index] = data;
      }

      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update interaction";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteInteraction = async (id: string) => {
    if (!userStore.user) throw new Error("User not authenticated");

    loading.value = true;
    error.value = null;

    try {
      const { error: deleteError } = await supabase
        .from("interactions")
        .delete()
        .eq("id", id)
        .eq("logged_by", userStore.user.id);

      if (deleteError) throw deleteError;

      // Update local state
      interactions.value = interactions.value.filter((i) => i.id !== id);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete interaction";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    interactions: computed(() => interactions.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchInteractions,
    getInteraction,
    createInteraction,
    updateInteraction,
    deleteInteraction,
    uploadAttachments,
    exportToCSV,
    downloadCSV,
  };
};
