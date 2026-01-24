import { ref, computed } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import type { AuditLog } from "~/types/database-helpers";

export interface NoteHistoryEntry {
  id: string;
  timestamp: string;
  editedBy: string;
  editedByName?: string;
  previousContent: string | null;
  currentContent: string | null;
}

/**
 * useNotesHistory composable
 * Fetches and formats note edit history from audit logs
 */
export const useNotesHistory = () => {
  const supabase = useSupabase();
  const userStore = useUserStore();

  const history = ref<NoteHistoryEntry[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchNoteHistory = async (schoolId: string): Promise<void> => {
    if (!userStore.user) return;

    loading.value = true;
    error.value = null;

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

      history.value = noteEntries;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch note history";
      error.value = message;
      history.value = [];
    } finally {
      loading.value = false;
    }
  };

  const formattedHistory = computed(() => {
    return history.value.map((entry) => ({
      ...entry,
      formattedTime: new Date(entry.timestamp).toLocaleString(),
      isCurrentVersion: entry === history.value[0], // Most recent is current
    }));
  });

  return {
    history: computed(() => history.value),
    formattedHistory,
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchNoteHistory,
  };
};
