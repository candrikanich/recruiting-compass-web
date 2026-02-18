import { ref, computed, shallowRef, inject, watch, type ComputedRef } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import { useActiveFamily } from "./useActiveFamily";
import { useFamilyContext } from "./useFamilyContext";
import { useToast } from "~/composables/useToast";
import type { Interaction, FollowUpReminder } from "~/types/models";
import type { Database } from "~/types/database";
import type { AuditLog } from "~/types/database-helpers";
import { interactionSchema } from "~/utils/validation/schemas";
import { sanitizeHtml } from "~/utils/validation/sanitize";

// Get Table types from Database
type InteractionsTable = Database["public"]["Tables"]["interactions"];
type FollowUpRemindersTable =
  Database["public"]["Tables"]["follow_up_reminders"];
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
type FollowUpReminderInsert = FollowUpRemindersTable["Insert"];
type _FollowUpReminderUpdate = FollowUpRemindersTable["Update"];

export interface NoteHistoryEntry {
  id: string;
  timestamp: string;
  editedBy: string;
  editedByName?: string;
  previousContent: string | null;
  currentContent: string | null;
}

/**
 * useInteractions composable
 * Manages all interaction (communication) data for the recruiting tracker
 *
 * FAMILY-BASED ACCESS CONTROL (v2.0):
 * - Interactions are owned by family units, not individual users
 * - Students see their own interactions (their family)
 * - Parents see all interactions in accessible families
 * - Queries filter by family_unit_id instead of user_id
 * - ONLY STUDENTS can create interactions (enforced at DB level)
 *
 * Key features:
 * - Fetch interactions with optional filters (school, coach, type, direction, sentiment)
 * - Client-side date range filtering for precise control
 * - CSV export functionality for reporting
 * - CRUD operations (add, update, delete interactions)
 * - Error handling and loading states
 * - Follow-up reminders and tracking
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
  noteHistory: ComputedRef<NoteHistoryEntry[]>;
  noteHistoryLoading: ComputedRef<boolean>;
  noteHistoryError: ComputedRef<string | null>;
  formattedNoteHistory: ComputedRef<
    Array<
      NoteHistoryEntry & { formattedTime: string; isCurrentVersion: boolean }
    >
  >;
  fetchNoteHistory: (schoolId: string) => Promise<void>;
  reminders: ComputedRef<FollowUpReminder[]>;
  remindersLoading: ComputedRef<boolean>;
  remindersError: ComputedRef<string | null>;
  activeReminders: ComputedRef<FollowUpReminder[]>;
  overdueReminders: ComputedRef<FollowUpReminder[]>;
  upcomingReminders: ComputedRef<FollowUpReminder[]>;
  completedReminders: ComputedRef<FollowUpReminder[]>;
  highPriorityReminders: ComputedRef<FollowUpReminder[]>;
  loadReminders: () => Promise<void>;
  createReminder: (
    title: string,
    dueDate: string,
    reminderType: FollowUpReminder["reminder_type"],
    priority?: FollowUpReminder["priority"],
    description?: string,
    schoolId?: string,
    coachId?: string,
    interactionId?: string,
  ) => Promise<FollowUpReminder | null>;
  completeReminder: (id: string) => Promise<boolean>;
  deleteReminder: (id: string) => Promise<boolean>;
  updateReminder: (
    id: string,
    updates: Partial<FollowUpReminder>,
  ) => Promise<boolean>;
  getRemindersFor: (
    entityType: "school" | "coach" | "interaction",
    entityId: string,
  ) => FollowUpReminder[];
  formatDueDate: (dueDate: string) => string;
  smartDelete: (id: string) => Promise<{ cascadeUsed: boolean }>;
} => {
  const supabase = useSupabase();
  const userStore = useUserStore();
  const injectedFamily =
    inject<ReturnType<typeof useActiveFamily>>("activeFamily");

  if (!injectedFamily) {
    if (import.meta.dev) {
      throw new Error(
        "[useInteractions] activeFamily was not provided. " +
          "Wrap the component tree with provide('activeFamily', useActiveFamily()) — " +
          "app.vue already does this for all pages.",
      );
    }
    console.warn(
      "[useInteractions] activeFamily injection missing — data may be stale when parent switches athletes.",
    );
  }

  const activeFamily = injectedFamily ?? useFamilyContext();
  const toast = useToast();

  const interactions = shallowRef<Interaction[]>([]);
  const loadingRef = ref(false);
  const errorRef = ref<string | null>(null);

  // Note history state (consolidated from useNotesHistory)
  const noteHistory = shallowRef<NoteHistoryEntry[]>([]);
  const noteHistoryLoadingRef = ref(false);
  const noteHistoryErrorRef = ref<string | null>(null);

  // Follow-up reminders state (consolidated from useFollowUpReminders)
  const reminders = shallowRef<FollowUpReminder[]>([]);
  const remindersLoadingRef = ref(false);
  const remindersErrorRef = ref<string | null>(null);

  // Computed proxies for return type compatibility
  const loading = computed(() => loadingRef.value);
  const error = computed(() => errorRef.value);
  const noteHistoryLoading = computed(() => noteHistoryLoadingRef.value);
  const noteHistoryError = computed(() => noteHistoryErrorRef.value);
  const remindersLoading = computed(() => remindersLoadingRef.value);
  const remindersError = computed(() => remindersErrorRef.value);

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

  // Reminder computed filters
  const activeReminders = computed(() => {
    return reminders.value.filter((r) => !r.is_completed);
  });

  const overdueReminders = computed(() => {
    const now = new Date();
    return activeReminders.value.filter((r) => new Date(r.due_date) < now);
  });

  const upcomingReminders = computed(() => {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return activeReminders.value.filter(
      (r) =>
        new Date(r.due_date) >= now && new Date(r.due_date) <= oneWeekFromNow,
    );
  });

  const completedReminders = computed(() => {
    return reminders.value.filter((r) => r.is_completed);
  });

  const highPriorityReminders = computed(() => {
    return activeReminders.value.filter((r) => r.priority === "high");
  });

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
      // 🚀 Quick Win: Select only needed columns (2-3x faster for list views)
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
      errorRef.value = message;
    } finally {
      loadingRef.value = false;
    }
  };

  // Export interactions to CSV
  const exportToCSV = (): string => {
    return exportInteractionsToCSV(interactions.value);
  };

  // Download CSV file
  const downloadCSV = () => {
    downloadInteractionsCSV(interactions.value);
  };

  const getInteraction = async (id: string): Promise<Interaction | null> => {
    loadingRef.value = true;
    errorRef.value = null;

    try {
      // 🚀 Quick Win: Fetch all columns for detail view
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

  // Validate and upload attachment files
  const uploadAttachments = async (
    files: File[],
    interactionId: string,
  ): Promise<string[]> => {
    // Validate all files first
    for (const file of files) {
      validateAttachmentFile(file);
    }

    // Upload validated files
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

      // Upload attachments if provided
      if (files && files.length > 0) {
        const uploadedPaths = await uploadAttachments(files, data.id);
        if (uploadedPaths.length > 0) {
          const { error: updateError } =
            await // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase.from("interactions") as any)
              .update({ attachments: uploadedPaths })
              .eq("id", data.id);
          if (updateError)
            console.error("Failed to update attachment paths:", updateError);
        }
      }

      // Create inbound interaction alert if enabled
      if (data.direction === "inbound" && userStore.user) {
        await createInboundInteractionAlert({
          interaction: data,
          userId: userStore.user.id,
          supabase,
        });
      }

      interactions.value.unshift(data);
      return data;
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
      // Sanitize content fields to prevent XSS
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

      // Update local state
      const index = interactions.value.findIndex((i) => i.id === id);
      if (index !== -1) {
        interactions.value[index] = data;
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

      // Update local state
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

  // Fetch note history from audit logs (consolidated from useNotesHistory)
  const fetchNoteHistory = async (schoolId: string): Promise<void> => {
    if (!userStore.user) return;

    noteHistoryLoadingRef.value = true;
    noteHistoryErrorRef.value = null;

    try {
      // Query audit logs for note updates on this school
      // 🚀 Quick Win: Select only needed columns + use new composite index
      const auditResponse = await supabase
        .from("audit_logs")
        .select("id, user_id, resource_id, old_values, new_values, created_at")
        .eq("user_id", userStore.user.id)
        .eq("resource_type", "school")
        .eq("resource_id", schoolId)
        .eq("action", "UPDATE")
        .order("created_at", { ascending: false });

      const { data, error: fetchError } = auditResponse as {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: any[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: any;
      };

      if (fetchError) throw fetchError;

      // Filter logs that contain note changes
      const noteEntries: NoteHistoryEntry[] = [];

      if (data && Array.isArray(data)) {
        for (const log of data) {
          const auditLog = log as unknown as AuditLog;

          // Check if this log entry includes a notes field change

          if (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (auditLog?.new_values as any)?.notes !== undefined ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (auditLog?.old_values as any)?.notes !== undefined
          ) {
            noteEntries.push({
              id: (auditLog?.id as string) || "",
              timestamp:
                (auditLog?.created_at as string) || new Date().toISOString(),
              editedBy: (auditLog?.user_id as string) || "Unknown",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              previousContent: (auditLog?.old_values as any)?.notes || null,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              currentContent: (auditLog?.new_values as any)?.notes || null,
            });
          }
        }
      }

      noteHistory.value = noteEntries;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch note history";
      noteHistoryErrorRef.value = message;
      noteHistory.value = [];
    } finally {
      noteHistoryLoadingRef.value = false;
    }
  };

  const formattedNoteHistory = computed(() => {
    return noteHistory.value.map((entry) => ({
      ...entry,
      formattedTime: new Date(entry.timestamp).toLocaleString(),
      isCurrentVersion: entry === noteHistory.value[0], // Most recent is current
    }));
  });

  // Follow-up reminder CRUD methods (migrated from useFollowUpReminders)
  const loadReminders = async () => {
    if (!userStore.user) return;

    remindersLoadingRef.value = true;
    remindersErrorRef.value = null;

    try {
      // 🚀 Quick Win: Select all columns + use new composite index (user_id, due_date, is_completed)
      const remindersResponse = await supabase
        .from("follow_up_reminders")
        .select("*")
        .eq("user_id", userStore.user.id)
        .order("due_date", { ascending: true });

      const { data, error: err } = remindersResponse as {
        data: FollowUpReminder[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: any;
      };

      if (err) throw err;
      reminders.value = data || [];
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load reminders";
      remindersErrorRef.value = message;
      console.error("Load reminders error:", err);
      toast.showToast("Failed to load reminders. Please try again.");
    } finally {
      remindersLoadingRef.value = false;
    }
  };

  const createReminder = async (
    title: string,
    dueDate: string,
    reminderType: FollowUpReminder["reminder_type"],
    priority: FollowUpReminder["priority"] = "medium",
    description?: string,
    schoolId?: string,
    coachId?: string,
    interactionId?: string,
  ): Promise<FollowUpReminder | null> => {
    if (!userStore.user) return null;

    remindersErrorRef.value = null;

    const dataOwnerUserId = activeFamily.getDataOwnerUserId();
    if (!dataOwnerUserId) {
      remindersErrorRef.value = "No user ID available";
      return null;
    }

    try {
      const newReminder: FollowUpReminderInsert = {
        user_id: dataOwnerUserId,
        title,
        description,
        due_date: dueDate,
        reminder_type: reminderType,
        priority,
        school_id: schoolId,
        coach_id: coachId,
        interaction_id: interactionId,
        is_completed: false,
      };

      const reminderResponse =
        await // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from("follow_up_reminders") as any)
          .insert([newReminder])
          .select()
          .single();

      const { data, error: err } = reminderResponse as {
        data: FollowUpReminder;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: any;
      };

      if (err) throw err;

      reminders.value = [data, ...reminders.value];
      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create reminder";
      remindersErrorRef.value = message;
      console.error("Create reminder error:", err);
      toast.showToast("Failed to create reminder. Please try again.");
      return null;
    }
  };

  const completeReminder = async (id: string): Promise<boolean> => {
    if (!userStore.user) return false;

    remindersErrorRef.value = null;

    try {
      const completeResponse =
        await // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from("follow_up_reminders") as any)
          .update({
            is_completed: true,
            completed_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("user_id", userStore.user.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = completeResponse as { error: any };

      if (err) throw err;

      const index = reminders.value.findIndex((r) => r.id === id);
      if (index !== -1) {
        reminders.value[index].is_completed = true;
        reminders.value[index].completed_at = new Date().toISOString();
      }

      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to complete reminder";

      remindersErrorRef.value = message;
      console.error("Complete reminder error:", err);
      toast.showToast("Failed to complete reminder. Please try again.");
      return false;
    }
  };

  const deleteReminder = async (id: string): Promise<boolean> => {
    if (!userStore.user) return false;

    remindersErrorRef.value = null;

    try {
      const deleteResponse = await supabase
        .from("follow_up_reminders")
        .delete()
        .eq("id", id)
        .eq("user_id", userStore.user.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = deleteResponse as { error: any };

      if (err) throw err;

      reminders.value = reminders.value.filter((r) => r.id !== id);
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete reminder";
      remindersErrorRef.value = message;
      console.error("Delete reminder error:", err);
      toast.showToast("Failed to delete reminder. Please try again.");

      return false;
    }
  };

  const updateReminder = async (
    id: string,
    updates: Partial<FollowUpReminder>,
  ): Promise<boolean> => {
    if (!userStore.user) return false;

    remindersErrorRef.value = null;

    try {
      const updateReminderResponse =
        await // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from("follow_up_reminders") as any)
          .update(updates)
          .eq("id", id)
          .eq("user_id", userStore.user.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = updateReminderResponse as { error: any };

      if (err) throw err;

      const index = reminders.value.findIndex((r) => r.id === id);
      if (index !== -1) {
        reminders.value[index] = { ...reminders.value[index], ...updates };
      }

      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update reminder";
      remindersErrorRef.value = message;
      console.error("Update reminder error:", err);
      toast.showToast("Failed to update reminder. Please try again.");
      return false;
    }
  };

  const getRemindersFor = (
    entityType: "school" | "coach" | "interaction",
    entityId: string,
  ): FollowUpReminder[] => {
    const key =
      entityType === "school"
        ? "school_id"
        : entityType === "coach"
          ? "coach_id"
          : "interaction_id";
    return reminders.value.filter(
      (r) => r[key as keyof FollowUpReminder] === entityId,
    );
  };

  const formatDueDate = (dueDate: string): string => {
    const date = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const oneWeekFromNow = new Date(today);
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

    const dateAtMidnight = new Date(date);
    dateAtMidnight.setHours(0, 0, 0, 0);

    if (dateAtMidnight.getTime() === today.getTime()) {
      return "Today";
    }
    if (dateAtMidnight.getTime() === tomorrow.getTime()) {
      return "Tomorrow";
    }
    if (dateAtMidnight < today) {
      const daysOverdue = Math.floor(
        (today.getTime() - dateAtMidnight.getTime()) / (24 * 60 * 60 * 1000),
      );
      return "Overdue by " + daysOverdue + " day(s)";
    }
    if (dateAtMidnight <= oneWeekFromNow) {
      const daysUntil = Math.floor(
        (dateAtMidnight.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
      );
      return "In " + daysUntil + " day(s)";
    }

    return date.toLocaleDateString();
  };

  const smartDelete = async (id: string): Promise<{ cascadeUsed: boolean }> => {
    try {
      await deleteInteraction(id);
      return { cascadeUsed: false };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete interaction";

      // Check if this is a FK constraint error
      if (
        message.includes("Cannot delete") ||
        message.includes("violates foreign key constraint") ||
        message.includes("still referenced")
      ) {
        // Try cascade delete via API endpoint
        const result = await fetch(`/api/interactions/${id}/cascade-delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmDelete: true }),
        });
        const cascadeResponse = (await result.json()) as Record<
          string,
          unknown
        >;
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
    // Interaction state and methods
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

    // Note history methods
    noteHistory: computed(() => noteHistory.value),
    noteHistoryLoading,
    noteHistoryError,
    formattedNoteHistory,
    fetchNoteHistory,

    // Reminder state and methods (migrated from useFollowUpReminders)
    reminders: computed(() => reminders.value),
    remindersLoading,
    remindersError,
    activeReminders,
    overdueReminders,
    upcomingReminders,
    completedReminders,
    highPriorityReminders,
    loadReminders,
    createReminder,
    completeReminder,
    deleteReminder,
    updateReminder,
    getRemindersFor,
    formatDueDate,
  };
};
