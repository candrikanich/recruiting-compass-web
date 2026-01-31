import { ref, computed, readonly, shallowRef, inject, type ComputedRef } from "vue";
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
import { exportInteractionsToCSV, downloadInteractionsCSV } from "~/utils/interactions/exportCSV";
import { validateAttachmentFile, uploadInteractionAttachments } from "~/utils/interactions/attachments";
import { createInboundInteractionAlert } from "~/utils/interactions/inboundAlerts";

// Type aliases for Supabase casting
type InteractionInsert = Database["public"]["Tables"]["interactions"]["Insert"];
type InteractionUpdate = Database["public"]["Tables"]["interactions"]["Update"];
type FollowUpReminderInsert =
  Database["public"]["Tables"]["follow_up_reminders"]["Insert"];
type FollowUpReminderUpdate =
  Database["public"]["Tables"]["follow_up_reminders"]["Update"];

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

export const useInteractions = (): {
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
  fetchMyInteractions: (filters?: Omit<InteractionFilters, "loggedBy">) => Promise<void>;
  fetchAthleteInteractions: (
    athleteUserId: string,
    filters?: Omit<InteractionFilters, "loggedBy">,
  ) => Promise<void>;
  noteHistory: ComputedRef<NoteHistoryEntry[]>;
  noteHistoryLoading: ComputedRef<boolean>;
  noteHistoryError: ComputedRef<string | null>;
  formattedNoteHistory: ComputedRef<Array<NoteHistoryEntry & { formattedTime: string; isCurrentVersion: boolean }>>;
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
} => {
  const supabase = useSupabase();
  const userStore = useUserStore();
  // Try to get the provided family context (from page), fall back to singleton
  const injectedFamily = inject<ReturnType<typeof useActiveFamily>>("activeFamily");
  const activeFamily = injectedFamily || useFamilyContext();
  const toast = useToast();

  if (!injectedFamily) {
    console.warn(
      "[useInteractions] activeFamily injection failed, using singleton fallback. " +
      "This may cause data sync issues when parent switches athletes."
    );
  }

  const interactions = shallowRef<Interaction[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Note history state (consolidated from useNotesHistory)
  const noteHistory = shallowRef<NoteHistoryEntry[]>([]);
  const noteHistoryLoading = ref(false);
  const noteHistoryError = ref<string | null>(null);

  // Follow-up reminders state (consolidated from useFollowUpReminders)
  const reminders = shallowRef<FollowUpReminder[]>([]);
  const remindersLoading = ref(false);
  const remindersError = ref<string | null>(null);

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
      error.value = "No family context";
      return;
    }

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
    return exportInteractionsToCSV(interactions.value);
  };

  // Download CSV file
  const downloadCSV = () => {
    downloadInteractionsCSV(interactions.value);
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
    if (userStore.user.role !== "student") {
      throw new Error("Only students can create interactions");
    }
    if (!activeFamily.activeFamilyId.value) {
      throw new Error("No family context available");
    }

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
            family_unit_id: activeFamily.activeFamilyId.value,
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

    noteHistoryLoading.value = true;
    noteHistoryError.value = null;

    try {
      // Query audit logs for note updates on this school
      const { data, error: fetchError } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("user_id", userStore.user.id)
        .eq("resource_type", "school")
        .eq("resource_id", schoolId)
        .eq("action", "UPDATE")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Filter logs that contain note changes
      const noteEntries: NoteHistoryEntry[] = [];

      if (data) {
        for (const log of data) {
          const auditLog = log as AuditLog;

          // Check if this log entry includes a notes field change
          if (
            auditLog.new_values?.notes !== undefined ||
            auditLog.old_values?.notes !== undefined
          ) {
            noteEntries.push({
              id: auditLog.id,
              timestamp: auditLog.created_at || new Date().toISOString(),
              editedBy: auditLog.user_id || "Unknown",
              previousContent: auditLog.old_values?.notes || null,
              currentContent: auditLog.new_values?.notes || null,
            });
          }
        }
      }

      noteHistory.value = noteEntries;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch note history";
      noteHistoryError.value = message;
      noteHistory.value = [];
    } finally {
      noteHistoryLoading.value = false;
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

    remindersLoading.value = true;
    remindersError.value = null;

    try {
      const { data, error: err } = await supabase
        .from("follow_up_reminders")
        .select("*")
        .eq("user_id", userStore.user.id)
        .order("due_date", { ascending: true });

      if (err) throw err;
      reminders.value = data || [];
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load reminders";
      remindersError.value = message;
      console.error("Load reminders error:", err);
      toast.error("Failed to load reminders. Please try again.");
    } finally {
      remindersLoading.value = false;
    }
  };

  const createReminder = async (
    title: string,
    dueDate: string,
    reminderType: FollowUpReminder["reminder_type"],
    _priority: FollowUpReminder["priority"] = "medium",
    description?: string,
    schoolId?: string,
    coachId?: string,
    interactionId?: string,
  ): Promise<FollowUpReminder | null> => {
    if (!userStore.user) return null;

    remindersError.value = null;

    try {
      const newReminder: FollowUpReminderInsert = {
        user_id: activeFamily.getDataOwnerUserId(),
        notes: description,
        reminder_date: dueDate,
        reminder_type: reminderType as "email" | "sms" | "phone_call" | null,
        school_id: schoolId,
        coach_id: coachId,
        interaction_id: interactionId,
        is_completed: false,
      };

      const { data, error: err } = await supabase
        .from("follow_up_reminders")
        .insert([newReminder] as FollowUpReminderInsert[])
        .select()
        .single();

      if (err) throw err;

      reminders.value = [data, ...reminders.value];
      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create reminder";
      remindersError.value = message;
      console.error("Create reminder error:", err);
      toast.error("Failed to create reminder. Please try again.");
      return null;
    }
  };

  const completeReminder = async (id: string): Promise<boolean> => {
    if (!userStore.user) return false;

    remindersError.value = null;

    try {
      const { error: err } = await supabase
        .from("follow_up_reminders")
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
        } as FollowUpReminderUpdate)
        .eq("id", id)
        .eq("user_id", userStore.user.id);

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
      remindersError.value = message;
      console.error("Complete reminder error:", err);
      toast.error("Failed to complete reminder. Please try again.");
      return false;
    }
  };

  const deleteReminder = async (id: string): Promise<boolean> => {
    if (!userStore.user) return false;

    remindersError.value = null;

    try {
      const { error: err } = await supabase
        .from("follow_up_reminders")
        .delete()
        .eq("id", id)
        .eq("user_id", userStore.user.id);

      if (err) throw err;

      reminders.value = reminders.value.filter((r) => r.id !== id);
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete reminder";
      remindersError.value = message;
      console.error("Delete reminder error:", err);
      toast.error("Failed to delete reminder. Please try again.");
      return false;
    }
  };

  const updateReminder = async (
    id: string,
    updates: Partial<FollowUpReminder>,
  ): Promise<boolean> => {
    if (!userStore.user) return false;

    remindersError.value = null;

    try {
      const { error: err } = await supabase
        .from("follow_up_reminders")
        .update(updates as FollowUpReminderUpdate)
        .eq("id", id)
        .eq("user_id", userStore.user.id);

      if (err) throw err;

      const index = reminders.value.findIndex((r) => r.id === id);
      if (index !== -1) {
        reminders.value[index] = { ...reminders.value[index], ...updates };
      }

      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update reminder";
      remindersError.value = message;
      console.error("Update reminder error:", err);
      toast.error("Failed to update reminder. Please try again.");
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

  return {
    // Interaction state and methods
    interactions: readonly(interactions),
    loading: readonly(loading),
    error: readonly(error),
    fetchInteractions,
    getInteraction,
    createInteraction,
    updateInteraction,
    deleteInteraction,
    uploadAttachments,
    exportToCSV,
    downloadCSV,
    fetchMyInteractions,
    fetchAthleteInteractions,

    // Note history methods
    noteHistory: readonly(noteHistory),
    noteHistoryLoading: readonly(noteHistoryLoading),
    noteHistoryError: readonly(noteHistoryError),
    formattedNoteHistory,
    fetchNoteHistory,

    // Reminder state and methods (migrated from useFollowUpReminders)
    reminders: readonly(reminders),
    remindersLoading: readonly(remindersLoading),
    remindersError: readonly(remindersError),
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
