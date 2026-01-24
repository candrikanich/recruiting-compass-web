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
  },

  actions: {
    async initializeUser() {
      const supabase = useSupabase();

      this.loading = true;

      try {
        // Get current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          // For now, use Supabase auth user directly
          // Can optionally fetch extended profile from users table
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

          // Try to fetch full profile but don't fail if it doesn't exist
          try {
            const { data: profile } = await supabase
              .from("users")
              .select("*")
              .eq("id", session.user.id)
              .single();

            if (profile) {
              this.user = profile;
            } else {
              // Profile doesn't exist, create it
              await this.createUserProfile(
                session.user.id,
                session.user.email || "",
                session.user.user_metadata?.full_name || "",
              );
            }
          } catch (profileError) {
            console.log("Profile not found, creating one:", profileError);
            // Create user profile if it doesn't exist
            await this.createUserProfile(
              session.user.id,
              session.user.email || "",
              session.user.user_metadata?.full_name || "",
            );
          }
        } else {
          this.user = null;
          this.isAuthenticated = false;
        }
      } catch (error) {
        console.error("Failed to initialize user:", error);
        this.user = null;
        this.isAuthenticated = false;
      } finally {
        this.loading = false;
      }
    },

    async createUserProfile(userId: string, email: string, fullName: string) {
      const supabase = useSupabase();

      try {
        console.log("Creating user profile for:", userId, email);
        const { error, data } = await supabase
          .from("users")
          .insert([
            {
              id: userId,
              email,
              full_name: fullName || email.split("@")[0],
              role: "student",
            },
          ])
          .select();

        if (error) {
          console.error("Failed to create user profile:", error);
          return;
        }

        console.log("User profile created successfully:", data);

        // Update local state
        this.user = {
          id: userId,
          email,
          full_name: fullName || email.split("@")[0],
          role: "student", // Default role
        };
      } catch (err) {
        console.error("Exception creating user profile:", err);
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
  },
});
