import { defineStore } from "pinia";
import type { User } from "~/types/models";
import { useSupabase } from "~/composables/useSupabase";

export interface UserState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
}

export const useUserStore = defineStore("user", {
  state: (): UserState => ({
    user: null,
    loading: false,
    isAuthenticated: false,
    isEmailVerified: false,
  }),

  getters: {
    currentUser: (state) => state.user,
    userRole: (state) => state.user?.role,
    isLoggedIn: (state) => state.isAuthenticated,
    emailVerified: (state) => state.isEmailVerified,
    isAthlete: (state) => state.user?.role === "student",
    isParent: (state) => state.user?.role === "parent",
    isAdmin: (state) => state.user?.role === "admin",
  },

  actions: {
    async initializeUser() {
      const supabase = useSupabase();

      this.loading = true;

      try {
        // Get current session with retry for post-login timing
        let session = null;
        let attempts = 0;
        const maxAttempts = 10;
        const retryDelay = 50;

        while (!session && attempts < maxAttempts) {
          const attemptNum = attempts + 1;
          const {
            data: { session: currentSession },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (sessionError) {
            console.error(
              `[initializeUser] Attempt ${attemptNum}: Error getting session:`,
              sessionError,
            );
          } else if (currentSession) {
            console.debug(
              `[initializeUser] Attempt ${attemptNum}: Session found!`,
            );
            session = currentSession;
            break;
          } else {
            console.debug(
              `[initializeUser] Attempt ${attemptNum}: No session yet`,
            );
          }

          if (!session && attempts < maxAttempts - 1) {
            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }
          attempts++;
        }

        if (session?.user) {
          // Set user from auth session first
          this.user = {
            id: session.user.id,
            email: session.user.email || "",
            full_name: session.user.user_metadata?.full_name || "",
            role: "student", // Default role
          };
          this.isAuthenticated = true;

          // Check email verification status
          this.isEmailVerified =
            session.user.email_confirmed_at !== null &&
            session.user.email_confirmed_at !== undefined;

          console.debug(
            "[initializeUser] User authenticated:",
            session.user.email,
          );

          // Try to fetch full profile from users table (includes is_admin)
          const { data: profile, error: fetchError } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .single();

          // Handle fetch errors (but not "not found")
          if (fetchError && fetchError.code !== "PGRST116") {
            // PGRST116 = "not found", which is expected if profile doesn't exist
            console.error(
              "[initializeUser] Unexpected fetch error:",
              fetchError,
            );
          }

          if (profile) {
            // Profile exists, use it
            this.user = profile;
            console.debug("[initializeUser] Existing profile loaded");
          } else {
            // Profile doesn't exist, try to create it
            console.debug(
              "[initializeUser] No profile found, attempting creation",
            );
            const created = await this.createUserProfile(
              session.user.id,
              session.user.email || "",
              session.user.user_metadata?.full_name || "",
            );

            if (!created) {
              // Creation failed but don't block - user is still authenticated
              console.warn(
                "[initializeUser] Failed to create profile for user:",
                session.user.id,
              );
            }
          }
        } else {
          this.user = null;
          this.isAuthenticated = false;
          console.debug("[initializeUser] No active session");
        }
      } catch (error) {
        console.error("[initializeUser] Unexpected error:", error);
        this.user = null;
        this.isAuthenticated = false;
      } finally {
        this.loading = false;
      }
    },

    async createUserProfile(
      userId: string,
      email: string,
      fullName: string,
    ): Promise<boolean> {
      const supabase = useSupabase();

      try {
        console.debug(
          "[createUserProfile] Attempting to create profile for:",
          email,
        );

        // First, check if profile already exists
        const { data: existing, error: checkError } = await supabase
          .from("users")
          .select("id")
          .eq("id", userId)
          .single();

        if (existing) {
          console.debug("[createUserProfile] Profile already exists, skipping");
          return true; // Already exists, treat as success
        }

        // Check for unexpected errors (not "not found")
        if (checkError && checkError.code !== "PGRST116") {
          throw new Error(
            `[createUserProfile] Check failed: ${checkError.message}`,
          );
        }

        // Profile doesn't exist, create it
        const userData = [
          {
            id: userId,
            email,
            full_name: fullName || email.split("@")[0],
            role: "student",
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
          // Check if it's a duplicate key error (email or id already exists)
          if (error.code === "23505") {
            console.debug(
              "[createUserProfile] Profile exists (duplicate key), treating as success",
            );
            return true; // It exists, treat as success
          }
          throw error;
        }

        console.debug("[createUserProfile] Profile created successfully");

        // Update local state
        this.user = {
          id: userId,
          email,
          full_name: fullName || email.split("@")[0],
          role: "student",
        };

        return true; // Success
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[createUserProfile] Failed:", message);
        return false; // Failure
      }
    },

    setUser(user: User | null) {
      this.user = user;
      this.isAuthenticated = !!user;
    },

    logout() {
      this.user = null;
      this.isAuthenticated = false;
      this.isEmailVerified = false;
      // Clear all filter caches on logout to prevent stale filters from showing after login
      localStorage.removeItem("schools-filters");
      localStorage.removeItem("coaches-filters");
      localStorage.removeItem("interactions-filters");
      localStorage.removeItem("offers-filters");
    },

    async refreshVerificationStatus() {
      const supabase = useSupabase();

      try {
        // Get current user from auth
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          console.error("Error fetching verification status:", error);
          return;
        }

        // Update email verification status
        this.isEmailVerified =
          user.email_confirmed_at !== null &&
          user.email_confirmed_at !== undefined;
      } catch (err) {
        console.error("Error refreshing verification status:", err);
      }
    },

    setProfilePhotoUrl(photoUrl: string | null) {
      if (this.user) {
        this.user.profile_photo_url = photoUrl;
      }
    },
  },
});
