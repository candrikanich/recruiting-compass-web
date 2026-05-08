import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { User } from "~/types/models";
import { useSupabase } from "~/composables/useSupabase";
import { clearAllFilterCaches } from "~/composables/usePageFilters";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("stores/user");

export interface UserState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
}

export const useUserStore = defineStore("user", () => {
  const user = ref<User | null>(null);
  const loading = ref(false);
  const isAuthenticated = ref(false);
  const isEmailVerified = ref(false);

  const currentUser = computed(() => user.value);
  const userRole = computed(() => user.value?.role);
  const isLoggedIn = computed(() => isAuthenticated.value);
  const emailVerified = computed(() => isEmailVerified.value);
  const isAthlete = computed(() => user.value?.role === "player");
  const isParent = computed(() => user.value?.role === "parent");
  const isAdmin = computed(() => user.value?.role === "admin");

  async function initializeUser() {
    const supabase = useSupabase();

    loading.value = true;

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        logger.error("[initializeUser] Error getting session:", sessionError);
      }

      if (session?.user) {
        isAuthenticated.value = true;

        isEmailVerified.value =
          session.user.email_confirmed_at !== null &&
          session.user.email_confirmed_at !== undefined;

        logger.debug(
          "[initializeUser] User authenticated:",
          session.user.email,
        );

        const { data: profile, error: fetchError } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (fetchError) {
          logger.error("[initializeUser] Unexpected fetch error:", fetchError);
        }

        if (profile) {
          user.value = profile;
          logger.debug("[initializeUser] Existing profile loaded");
        } else {
          logger.debug(
            "[initializeUser] No profile found, attempting creation",
          );
          const created = await createUserProfile(
            session.user.id,
            session.user.email || "",
            session.user.user_metadata?.full_name || "",
          );

          if (!created) {
            logger.warn(
              "[initializeUser] Failed to create profile for user:",
              session.user.id,
            );
            user.value = {
              id: session.user.id,
              email: session.user.email || "",
              full_name: session.user.user_metadata?.full_name || "",
              role: "player",
            };
          }
        }
      } else {
        user.value = null;
        isAuthenticated.value = false;
        logger.debug("[initializeUser] No active session");
      }
    } catch (error) {
      logger.error("[initializeUser] Unexpected error:", error);
      user.value = null;
      isAuthenticated.value = false;
    } finally {
      loading.value = false;
    }
  }

  async function createUserProfile(
    userId: string,
    email: string,
    fullName: string,
  ): Promise<boolean> {
    const supabase = useSupabase();

    try {
      logger.debug(
        "[createUserProfile] Attempting to create profile for:",
        email,
      );

      const { data: existing, error: checkError } = await supabase
        .from("users")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (existing) {
        logger.debug("[createUserProfile] Profile already exists, skipping");
        return true;
      }

      if (checkError) {
        throw new Error(
          `[createUserProfile] Check failed: ${checkError.message}`,
        );
      }

      const userData = [
        {
          id: userId,
          email,
          full_name: fullName || email.split("@")[0],
          role: "player",
        },
      ];

      const response = (await supabase
        .from("users")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(userData as any)
        .select()) as {
        data: User[] | null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: any;
      };

      const { error, data: _data } = response;

      if (error) {
        if (
          error.code === "23505" ||
          (error as { status?: number }).status === 409
        ) {
          logger.debug(
            "[createUserProfile] Profile exists (duplicate key), treating as success",
          );
          return true;
        }
        logger.error("[createUserProfile] Insert failed:", {
          code: error.code,
          message: error.message,
        });
        throw new Error(error.message ?? "Insert failed");
      }

      logger.debug("[createUserProfile] Profile created successfully");

      user.value = {
        id: userId,
        email,
        full_name: fullName || email.split("@")[0],
        role: "player",
      };

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.error("[createUserProfile] Failed:", message);
      return false;
    }
  }

  function setUser(newUser: User | null) {
    user.value = newUser;
    isAuthenticated.value = !!newUser;
  }

  function logout() {
    user.value = null;
    isAuthenticated.value = false;
    isEmailVerified.value = false;
    clearAllFilterCaches();
  }

  async function refreshVerificationStatus() {
    const supabase = useSupabase();

    try {
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser();

      if (error || !authUser) {
        logger.error("Error fetching verification status:", error);
        return;
      }

      isEmailVerified.value =
        authUser.email_confirmed_at !== null &&
        authUser.email_confirmed_at !== undefined;
    } catch (err) {
      logger.error("Error refreshing verification status:", err);
    }
  }

  function setProfilePhotoUrl(photoUrl: string | null) {
    if (user.value) {
      user.value.profile_photo_url = photoUrl;
    }
  }

  function updateProfileFields(
    fields: Partial<Pick<User, "full_name" | "phone" | "date_of_birth">>,
  ) {
    if (user.value) {
      user.value = { ...user.value, ...fields };
    }
  }

  return {
    user,
    loading,
    isAuthenticated,
    isEmailVerified,
    currentUser,
    userRole,
    isLoggedIn,
    emailVerified,
    isAthlete,
    isParent,
    isAdmin,
    initializeUser,
    createUserProfile,
    setUser,
    logout,
    refreshVerificationStatus,
    setProfilePhotoUrl,
    updateProfileFields,
  };
});
