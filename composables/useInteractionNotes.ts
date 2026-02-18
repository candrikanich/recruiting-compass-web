import { ref, computed, shallowRef, type ComputedRef } from "vue";
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

export const useInteractionNotes = () => {
  const supabase = useSupabase();
  const userStore = useUserStore();

  const noteHistory = shallowRef<NoteHistoryEntry[]>([]);
  const noteHistoryLoadingRef = ref(false);
  const noteHistoryErrorRef = ref<string | null>(null);

  const noteHistoryLoading: ComputedRef<boolean> = computed(
    () => noteHistoryLoadingRef.value,
  );
  const noteHistoryError: ComputedRef<string | null> = computed(
    () => noteHistoryErrorRef.value,
  );

  const formattedNoteHistory: ComputedRef<
    Array<NoteHistoryEntry & { formattedTime: string; isCurrentVersion: boolean }>
  > = computed(() =>
    noteHistory.value.map((entry) => ({
      ...entry,
      formattedTime: new Date(entry.timestamp).toLocaleString(),
      isCurrentVersion: entry === noteHistory.value[0],
    })),
  );

  const fetchNoteHistory = async (schoolId: string): Promise<void> => {
    if (!userStore.user) return;

    noteHistoryLoadingRef.value = true;
    noteHistoryErrorRef.value = null;

    try {
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

      const noteEntries: NoteHistoryEntry[] = [];

      if (data && Array.isArray(data)) {
        for (const log of data) {
          const auditLog = log as unknown as AuditLog;

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

  return {
    noteHistory: computed(() => noteHistory.value),
    noteHistoryLoading,
    noteHistoryError,
    formattedNoteHistory,
    fetchNoteHistory,
  };
};
