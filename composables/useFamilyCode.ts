import { ref, computed } from "vue";

export interface FamilyCodeData {
  familyId: string;
  familyCode: string;
  familyName: string;
  codeGeneratedAt: string;
}

export const useFamilyCode = () => {
  const myFamilyCode = ref<string | null>(null);
  const myFamilyId = ref<string | null>(null);
  const myFamilyName = ref<string | null>(null);
  const parentFamilies = ref<FamilyCodeData[]>([]);

  const loading = ref(false);
  const error = ref<string | null>(null);
  const successMessage = ref<string | null>(null);

  const userStore = useUserStore();
  const currentUserRole = computed(
    () => userStore.user?.role || "parent"
  );

  /**
   * Fetches family code for current user
   */
  const fetchMyCode = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await $fetch("/api/family/code/my-code");

      if (currentUserRole.value === "student") {
        myFamilyCode.value = response.familyCode;
        myFamilyId.value = response.familyId;
        myFamilyName.value = response.familyName;
      } else {
        parentFamilies.value = response.families || [];
      }
    } catch (e) {
      error.value =
        e instanceof Error ? e.message : "Failed to fetch code";
      console.error("fetchMyCode error:", e);
    } finally {
      loading.value = false;
    }
  };

  /**
   * Creates a new family (students only)
   */
  const createFamily = async () => {
    if (currentUserRole.value !== "student") {
      error.value = "Only students can create families";
      return false;
    }

    loading.value = true;
    error.value = null;
    successMessage.value = null;

    try {
      const response = await $fetch("/api/family/create", {
        method: "POST",
      });

      myFamilyCode.value = response.familyCode;
      myFamilyId.value = response.familyId;
      myFamilyName.value = response.familyName;
      successMessage.value = "Family created! Share your code with parents.";

      return true;
    } catch (err) {
      const errorMessage =
        (err as Record<string, unknown>)?.data?.message ||
        (err instanceof Error ? err.message : "Failed to create family");
      error.value = errorMessage as string;
      console.error("createFamily error:", err);
      return false;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Joins a family using a code (parents only)
   */
  const joinByCode = async (familyCode: string) => {
    if (currentUserRole.value !== "parent") {
      error.value = "Only parents can join families";
      return false;
    }

    loading.value = true;
    error.value = null;
    successMessage.value = null;

    try {
      const response = await $fetch("/api/family/code/join", {
        method: "POST",
        body: { familyCode: familyCode.trim().toUpperCase() },
      });

      successMessage.value = response.message;

      // Refresh parent's families list
      await fetchMyCode();

      return true;
    } catch (err) {
      const errorData = err as Record<string, unknown>;
      if (errorData.statusCode === 429) {
        error.value = "Too many attempts. Please wait 5 minutes.";
      } else if (errorData.statusCode === 404) {
        error.value = "Family code not found. Please check and try again.";
      } else if (errorData.statusCode === 400) {
        error.value =
          ((errorData.data as Record<string, unknown>)?.message as string) ||
          "Invalid request";
      } else {
        error.value =
          ((errorData.data as Record<string, unknown>)?.message as string) ||
          (err instanceof Error ? err.message : "Failed to join family");
      }
      console.error("joinByCode error:", err);
      return false;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Regenerates family code (students only)
   */
  const regenerateCode = async () => {
    if (!myFamilyId.value) {
      error.value = "No family to regenerate code for";
      return false;
    }

    loading.value = true;
    error.value = null;
    successMessage.value = null;

    try {
      const response = await $fetch("/api/family/code/regenerate", {
        method: "POST",
        body: { familyId: myFamilyId.value },
      });

      myFamilyCode.value = response.familyCode;
      successMessage.value = "New code generated successfully!";

      return true;
    } catch (err) {
      const errorMessage =
        ((err as Record<string, unknown>)?.data as Record<string, unknown>)
          ?.message ||
        (err instanceof Error ? err.message : "Failed to regenerate code");
      error.value = errorMessage as string;
      console.error("regenerateCode error:", err);
      return false;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Copies code to clipboard
   */
  const copyCodeToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      successMessage.value = "Code copied to clipboard!";
      setTimeout(() => {
        successMessage.value = null;
      }, 3000);
      return true;
    } catch {
      error.value = "Failed to copy code";
      return false;
    }
  };

  return {
    // State
    myFamilyCode,
    myFamilyId,
    myFamilyName,
    parentFamilies,
    loading,
    error,
    successMessage,
    currentUserRole,

    // Methods
    fetchMyCode,
    createFamily,
    joinByCode,
    regenerateCode,
    copyCodeToClipboard,
  };
};
