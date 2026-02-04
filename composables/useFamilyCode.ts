import { ref, computed } from "vue";
import { useFamilyContext } from "~/composables/useFamilyContext";

export interface FamilyCodeData {
  familyId: string;
  familyCode: string;
  familyName: string;
  codeGeneratedAt: string;
}

export const useFamilyCode = () => {
  const userStore = useUserStore();
  const supabase = useSupabase();

  const myFamilyCode = ref<string | null>(null);
  const myFamilyId = ref<string | null>(null);
  const myFamilyName = ref<string | null>(null);
  const parentFamilies = ref<FamilyCodeData[]>([]);

  const loading = ref(false);
  const error = ref<string | null>(null);
  const successMessage = ref<string | null>(null);
  const currentUserRole = computed(
    () => (userStore.user?.role as string) || "parent",
  );

  /**
   * Fetches family code for current user using Supabase
   */
  const fetchMyCode = async () => {
    loading.value = true;
    error.value = null;

    try {
      if (!userStore.user?.id) {
        error.value = "User not authenticated";
        return;
      }

      if (currentUserRole.value === "student") {
        // Students: Get their family code
        const familyResponse = await supabase
          .from("family_units")
          .select("id, family_code, family_name, code_generated_at")
          .eq("student_user_id", userStore.user.id)
          .maybeSingle();
        const { data: family, error: fetchError } = familyResponse as {
          data: {
            id: string;
            family_code: string | null;
            family_name: string | null;
            code_generated_at: string | null;
          } | null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          error: any;
        };

        if (fetchError) {
          error.value = fetchError?.message || "Failed to fetch family";
          return;
        }

        myFamilyCode.value = family?.family_code || null;
        myFamilyId.value = family?.id || null;
        myFamilyName.value = family?.family_name || null;
      } else {
        // Parents: Get codes for families they belong to
        const membershipsResponse = await supabase
          .from("family_members")
          .select(
            `
            family_unit_id,
            family_units!inner(id, family_code, family_name, code_generated_at)
          `,
          )
          .eq("user_id", userStore.user.id)
          .eq("role", "parent");
        const { data: memberships, error: fetchError } =
          membershipsResponse as {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: any[] | null;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            error: any;
          };

        if (fetchError) {
          error.value = fetchError?.message || "Failed to fetch families";
          return;
        }

        type MembershipRow = {
          family_units: {
            id: string;
            family_code: string | null;
            family_name: string | null;
            code_generated_at: string | null;
          };
        };

        parentFamilies.value =
          memberships?.map((m: MembershipRow) => ({
            familyId: m.family_units.id,
            familyCode: m.family_units.family_code || "",
            familyName: m.family_units.family_name || "",
            codeGeneratedAt: m.family_units.code_generated_at || "",
          })) || [];
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to fetch code";
      console.error("fetchMyCode error:", e);
    } finally {
      loading.value = false;
    }
  };

  /**
   * Creates a new family (students only) - calls API endpoint with auth
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
      const { $fetchAuth } = useAuthFetch();

      // Call API endpoint which handles code generation
      const response = (await $fetchAuth("/api/family/create", {
        method: "POST",
      })) as {
        success: boolean;
        familyCode: string;
        familyId: string;
        familyName: string;
      };

      myFamilyCode.value = response.familyCode;
      myFamilyId.value = response.familyId;
      myFamilyName.value = response.familyName;
      successMessage.value = "Family created! Share your code with parents.";

      return true;
    } catch (err) {
      const errorData = err as Record<string, unknown>;
      const errorMessage =
        (errorData?.data as Record<string, unknown> | undefined)?.message ||
        (err instanceof Error ? err.message : "Failed to create family");
      error.value = String(errorMessage);
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
      const { $fetchAuth } = useAuthFetch();

      const response = (await $fetchAuth("/api/family/code/join", {
        method: "POST",
        body: { familyCode: familyCode.trim().toUpperCase() },
      })) as { message: string };

      successMessage.value = response?.message || "Successfully joined family";

      // Refresh parent's families list
      await fetchMyCode();

      // Refetch activeFamily context so dropdown updates
      const activeFamily = useFamilyContext();
      await activeFamily.refetchFamilies();

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
      const { $fetchAuth } = useAuthFetch();

      const response = (await $fetchAuth("/api/family/code/regenerate", {
        method: "POST",
        body: { familyId: myFamilyId.value },
      })) as { familyCode: string };

      myFamilyCode.value = response?.familyCode || "";
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

  /**
   * Removes a family member (students only)
   */
  const removeFamilyMember = async (memberId: string) => {
    loading.value = true;
    error.value = null;
    successMessage.value = null;

    try {
      const { $fetchAuth } = useAuthFetch();
      await $fetchAuth(`/api/family/members/${memberId}`, {
        method: "DELETE",
      });
      successMessage.value = "Family member removed successfully";
      await fetchMyCode();
      return true;
    } catch (err) {
      const errorData = err as Record<string, unknown>;
      const message =
        ((errorData.data as Record<string, unknown>)?.message as string) ||
        (err instanceof Error ? err.message : "Failed to remove member");
      error.value = message;
      console.error("removeFamilyMember error:", err);
      return false;
    } finally {
      loading.value = false;
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
    removeFamilyMember,
  };
};
