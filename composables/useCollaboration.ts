import { ref, computed } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import type { SharedRecord, RecordComment, TeamMember } from "~/types/models";

export const useCollaboration = () => {
  const supabase = useSupabase();
  const userStore = useUserStore();

  const sharedRecords = ref<SharedRecord[]>([]);
  const recordComments = ref<RecordComment[]>([]);
  const teamMembers = ref<TeamMember[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const mySharedRecords = computed(() => {
    return sharedRecords.value.filter(
      (r) => r.owner_user_id === userStore.user?.id,
    );
  });

  const sharedWithMe = computed(() => {
    return sharedRecords.value.filter(
      (r) => r.shared_with_user_id === userStore.user?.id,
    );
  });

  const activeTeamMembers = computed(() => {
    return teamMembers.value.filter((m) => !m.deleted_at);
  });

  const loadSharedRecords = async () => {
    if (!userStore.user) return;

    isLoading.value = true;
    error.value = null;

    try {
      const { data, error: err } = await supabase
        .from("shared_records")
        .select("*")
        .or(
          `owner_user_id.eq.${userStore.user.id},shared_with_user_id.eq.${userStore.user.id}`,
        )
        .order("shared_at", { ascending: false });

      if (err) throw err;
      sharedRecords.value = data || [];
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to load shared records";
      console.error("Load shared records error:", err);
    } finally {
      isLoading.value = false;
    }
  };

  const shareRecord = async (
    entityType: SharedRecord["entity_type"],
    entityId: string,
    accessLevel: SharedRecord["access_level"] = "view",
    expiresAt?: string,
  ): Promise<SharedRecord | null> => {
    if (!userStore.user) return null;

    error.value = null;

    try {
      const newShare: Partial<SharedRecord> = {
        owner_user_id: userStore.user.id,
        entity_type: entityType,
        entity_id: entityId,
        access_level: accessLevel,
        shared_at: new Date().toISOString(),
        expires_at: expiresAt,
      };

      const { data, error: err } = await supabase
        .from("shared_records")
        .insert([newShare])
        .select()
        .single();

      if (err) throw err;

      sharedRecords.value = [data, ...sharedRecords.value];
      return data;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to share record";
      console.error("Share record error:", err);
      return null;
    }
  };

  const revokeAccess = async (id: string): Promise<boolean> => {
    if (!userStore.user) return false;

    error.value = null;

    try {
      const { error: err } = await supabase
        .from("shared_records")
        .delete()
        .eq("id", id)
        .eq("owner_user_id", userStore.user.id);

      if (err) throw err;

      sharedRecords.value = sharedRecords.value.filter((r) => r.id !== id);
      return true;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to revoke access";
      console.error("Revoke access error:", err);
      return false;
    }
  };

  const updateAccessLevel = async (
    id: string,
    accessLevel: SharedRecord["access_level"],
  ): Promise<boolean> => {
    if (!userStore.user) return false;

    error.value = null;

    try {
      const { error: err } = await supabase
        .from("shared_records")
        .update({ access_level: accessLevel })
        .eq("id", id)
        .eq("owner_user_id", userStore.user.id);

      if (err) throw err;

      const record = sharedRecords.value.find((r) => r.id === id);
      if (record) {
        record.access_level = accessLevel;
      }

      return true;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to update access level";
      console.error("Update access level error:", err);
      return false;
    }
  };

  const loadComments = async (
    entityType: RecordComment["entity_type"],
    entityId: string,
  ) => {
    isLoading.value = true;
    error.value = null;

    try {
      const { data, error: err } = await supabase
        .from("record_comments")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (err) throw err;
      recordComments.value = data || [];
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to load comments";
      console.error("Load comments error:", err);
    } finally {
      isLoading.value = false;
    }
  };

  const addComment = async (
    entityType: RecordComment["entity_type"],
    entityId: string,
    content: string,
    mentions?: string[],
  ): Promise<RecordComment | null> => {
    if (!userStore.user) return null;

    error.value = null;

    try {
      const newComment: Partial<RecordComment> = {
        user_id: userStore.user.id,
        entity_type: entityType,
        entity_id: entityId,
        content,
        mentions,
        created_at: new Date().toISOString(),
      };

      const { data, error: err } = await supabase
        .from("record_comments")
        .insert([newComment])
        .select()
        .single();

      if (err) throw err;

      recordComments.value = [...recordComments.value, data];
      return data;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to add comment";
      console.error("Add comment error:", err);
      return null;
    }
  };

  const deleteComment = async (id: string): Promise<boolean> => {
    if (!userStore.user) return false;

    error.value = null;

    try {
      const { error: err } = await supabase
        .from("record_comments")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", userStore.user.id);

      if (err) throw err;

      recordComments.value = recordComments.value.filter((c) => c.id !== id);
      return true;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to delete comment";
      console.error("Delete comment error:", err);
      return false;
    }
  };

  return {
    sharedRecords,
    recordComments,
    teamMembers,
    isLoading,
    error,
    mySharedRecords,
    sharedWithMe,
    activeTeamMembers,
    loadSharedRecords,
    shareRecord,
    revokeAccess,
    updateAccessLevel,
    loadComments,
    addComment,
    deleteComment,
  };
};
