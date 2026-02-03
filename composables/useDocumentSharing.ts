import { ref } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import type { Document } from "~/types/models";

/**
 * Composable for document sharing operations
 *
 * ⚠️ DEPRECATED: This composable is deprecated as of Phase 4
 * Use useDocumentsConsolidated() instead for new code
 *
 * Migration guide: See docs/phase-4/DEPRECATION_AUDIT.md
 * Timeline: Will be removed in Phase 5
 *
 * Handles sharing documents with schools and managing access.
 * For new code, use useDocumentsConsolidated instead.
 *
 * @deprecated Use useDocumentsConsolidated() instead
 *
 * @example
 * // OLD (deprecated)
 * const { shareDocument, revokeSharing } = useDocumentSharing()
 *
 * // NEW (preferred)
 * const { shareDocument, revokeSharing } = useDocumentsConsolidated()
 *
 * @returns Object with sharing methods and state
 */
export const useDocumentSharing = () => {
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[DEPRECATED] useDocumentSharing is deprecated as of Phase 4. " +
        "Use useDocumentsConsolidated() instead.\n" +
        "Migration guide: See DEPRECATION_AUDIT.md",
    );
  }

  const supabase = useSupabase();
  let userStore: ReturnType<typeof useUserStore> | undefined;
  const getUserStore = () => {
    if (!userStore) {
      userStore = useUserStore();
    }
    return userStore;
  };

  // State
  const isSharing = ref(false);
  const error = ref<string | null>(null);

  /**
   * Share a document with specific schools
   */
  const shareDocument = async (
    documentId: string,
    schoolIds: string[],
  ): Promise<Document | null> => {
    const store = getUserStore();
    if (!store.user) throw new Error("User not authenticated");

    isSharing.value = true;
    error.value = null;

    try {
      const response = await supabase
        .from("documents")
        .update({ shared_with_schools: schoolIds })
        .eq("id", documentId)
        .select()
        .single();
      const { data, error: updateError } = response as {
        data: Document;
        error: any;
      };

      if (updateError) throw updateError;

      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to share document";
      error.value = message;
      throw err;
    } finally {
      isSharing.value = false;
    }
  };

  /**
   * Revoke school access to a document
   */
  const revokeSharing = async (
    documentId: string,
    schoolIdToRemove: string,
  ): Promise<Document | null> => {
    const store = getUserStore();
    if (!store.user) throw new Error("User not authenticated");

    isSharing.value = true;
    error.value = null;

    try {
      const response = await supabase
        .from("documents")
        .select("shared_with_schools")
        .eq("id", documentId)
        .single();
      const { data: doc, error: fetchError } = response as {
        data: { shared_with_schools: string[] | null } | null;
        error: any;
      };

      if (fetchError) throw fetchError;
      if (!doc) throw new Error("Document not found");

      const updatedSchools = (doc.shared_with_schools || []).filter(
        (id: string) => id !== schoolIdToRemove,
      );

      const updateResponse = await supabase
        .from("documents")
        .update({ shared_with_schools: updatedSchools })
        .eq("id", documentId)
        .select()
        .single();
      const { data, error: updateError } = updateResponse as {
        data: Document;
        error: any;
      };

      if (updateError) throw updateError;

      return data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to remove school access";
      error.value = message;
      throw err;
    } finally {
      isSharing.value = false;
    }
  };

  return {
    isSharing,
    error,
    shareDocument,
    revokeSharing,
  };
};
