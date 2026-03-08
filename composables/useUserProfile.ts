import { ref, computed } from "vue";
import { useUserStore } from "~/stores/user";
import { useAuthFetch } from "~/composables/useAuthFetch";

// Module-level singleton — persists across remounts within the same browser session
const emailChangePending = ref(false);

export function useUserProfile() {
  const store = useUserStore();
  const { $fetchAuth } = useAuthFetch();

  // Personal info section state
  const personalInfoLoading = ref(false);
  const personalInfoError = ref<string | null>(null);
  const personalInfoSaved = ref(false);

  // Password section state
  const passwordLoading = ref(false);
  const passwordError = ref<string | null>(null);
  const passwordSaved = ref(false);

  // Email section state
  const emailLoading = ref(false);
  const emailError = ref<string | null>(null);

  const isAthlete = computed(() => store.isAthlete);

  async function savePersonalInfo(fields: {
    full_name?: string;
    phone?: string | null;
    date_of_birth?: string | null;
  }): Promise<boolean> {
    personalInfoLoading.value = true;
    personalInfoError.value = null;
    personalInfoSaved.value = false;
    try {
      await $fetchAuth("/api/user/profile", { method: "PATCH", body: fields });
      store.updateProfileFields(fields);
      personalInfoSaved.value = true;
      return true;
    } catch {
      personalInfoError.value = "Failed to save. Please try again.";
      return false;
    } finally {
      personalInfoLoading.value = false;
    }
  }

  async function changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<boolean> {
    passwordLoading.value = true;
    passwordError.value = null;
    passwordSaved.value = false;
    try {
      await $fetchAuth("/api/auth/change-password", {
        method: "POST",
        body: { currentPassword, newPassword },
      });
      passwordSaved.value = true;
      return true;
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode;
      passwordError.value =
        status === 401
          ? "Current password is incorrect."
          : "Failed to change password.";
      return false;
    } finally {
      passwordLoading.value = false;
    }
  }

  async function changeEmail(
    newEmail: string,
    currentPassword: string,
  ): Promise<boolean> {
    emailLoading.value = true;
    emailError.value = null;
    emailChangePending.value = false;
    try {
      await $fetchAuth("/api/auth/change-email", {
        method: "POST",
        body: { newEmail, currentPassword },
      });
      emailChangePending.value = true;
      return true;
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode;
      emailError.value =
        status === 401
          ? "Current password is incorrect."
          : "Failed to update email.";
      return false;
    } finally {
      emailLoading.value = false;
    }
  }

  return {
    isAthlete,
    personalInfoLoading,
    personalInfoError,
    personalInfoSaved,
    savePersonalInfo,
    passwordLoading,
    passwordError,
    passwordSaved,
    changePassword,
    emailLoading,
    emailError,
    emailChangePending,
    changeEmail,
  };
}
