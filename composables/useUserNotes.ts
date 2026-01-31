import { ref, readonly } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import type { Database } from "~/types/database";

type UserNote = Database["public"]["Tables"]["user_notes"]["Row"];
type EntityType = "school" | "coach" | "interaction";

/**
 * Composable for managing private user notes
 *
 * Each user has private notes per entity (school, coach, interaction).
 * Notes are not shared with family members.
 *
 * Usage:
 * const { getNote, saveNote, deleteNote } = useUserNotes();
 * const note = await getNote('school', schoolId);
 * await saveNote('school', schoolId, 'My notes about this school');
 *
 * Patterns:
 * - Display private notes in addition to shared notes
 * - Only current user can see their notes
 * - Notes stored separately from entity
 */
export const useUserNotes = () => {
  const supabase = useSupabase();
  const userStore = useUserStore();

  const notes = ref<Map<string, UserNote>>(new Map());
  const loading = ref(false);
  const error = ref<string | null>(null);

  const getKey = (entityType: EntityType, entityId: string): string => {
    return `${entityType}:${entityId}`;
  };

  /**
   * Get note for entity
   */
  const getNote = async (
    entityType: EntityType,
    entityId: string
  ): Promise<string | null> => {
    if (!userStore.user) return null;

    const key = getKey(entityType, entityId);
    const cached = notes.value.get(key);
    if (cached) {
      return cached.note_content;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from("user_notes")
        .select("*")
        .eq("user_id", userStore.user.id)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        // PGRST116 = no rows, which is OK
        throw fetchError;
      }

      if (data) {
        notes.value.set(key, data);
        return data.note_content;
      }

      return null;
    } catch (err: unknown) {
      console.error("[useUserNotes] Error fetching note:", err);
      return null;
    }
  };

  /**
   * Get all notes for entity type
   */
  const getNotesByType = async (
    entityType: EntityType
  ): Promise<Record<string, string>> => {
    if (!userStore.user) return {};

    try {
      const { data, error: fetchError } = await supabase
        .from("user_notes")
        .select("*")
        .eq("user_id", userStore.user.id)
        .eq("entity_type", entityType);

      if (fetchError) throw fetchError;

      const result: Record<string, string> = {};
      if (data) {
        for (const note of data) {
          notes.value.set(getKey(entityType, note.entity_id), note);
          result[note.entity_id] = note.note_content || "";
        }
      }

      return result;
    } catch (err: unknown) {
      console.error("[useUserNotes] Error fetching notes:", err);
      return {};
    }
  };

  /**
   * Save or update note
   */
  const saveNote = async (
    entityType: EntityType,
    entityId: string,
    noteContent: string
  ): Promise<boolean> => {
    if (!userStore.user) {
      error.value = "No authenticated user";
      return false;
    }

    loading.value = true;
    error.value = null;

    try {
      // Try to upsert: delete first (to handle empty content), then insert if not empty
      if (noteContent.trim()) {
        const { error: upsertError } = await supabase
          .from("user_notes")
          .upsert(
            {
              user_id: userStore.user.id,
              entity_type: entityType,
              entity_id: entityId,
              note_content: noteContent,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "user_id,entity_type,entity_id",
            }
          );

        if (upsertError) throw upsertError;

        // Update cache
        const key = getKey(entityType, entityId);
        if (notes.value.has(key)) {
          const note = notes.value.get(key)!;
          note.note_content = noteContent;
          note.updated_at = new Date().toISOString();
        } else {
          notes.value.set(key, {
            id: "", // Temporary, will be replaced on next fetch
            user_id: userStore.user.id,
            entity_type: entityType,
            entity_id: entityId,
            note_content: noteContent,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }

        return true;
      } else {
        // Delete if content is empty
        await deleteNote(entityType, entityId);
        return true;
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save note";
      error.value = message;
      console.error("[useUserNotes] Error saving note:", message);
      return false;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Delete note
   */
  const deleteNote = async (
    entityType: EntityType,
    entityId: string
  ): Promise<boolean> => {
    if (!userStore.user) return false;

    try {
      const { error: deleteError } = await supabase
        .from("user_notes")
        .delete()
        .eq("user_id", userStore.user.id)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId);

      if (deleteError) throw deleteError;

      // Remove from cache
      const key = getKey(entityType, entityId);
      notes.value.delete(key);

      return true;
    } catch (err: unknown) {
      console.error("[useUserNotes] Error deleting note:", err);
      return false;
    }
  };

  /**
   * Clear all cached notes
   */
  const clearCache = () => {
    notes.value.clear();
  };

  /**
   * Check if note exists
   */
  const hasNote = (entityType: EntityType, entityId: string): boolean => {
    const key = getKey(entityType, entityId);
    const note = notes.value.get(key);
    return note ? (note.note_content || "").length > 0 : false;
  };

  return {
    loading: readonly(loading),
    error: readonly(error),
    getNote,
    getNotesByType,
    saveNote,
    deleteNote,
    clearCache,
    hasNote,
  };
};
