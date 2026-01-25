import { ref, readonly, onBeforeUnmount, getCurrentInstance } from "vue";
import type { User, Session } from "@supabase/supabase-js";
import { useSupabase } from "~/composables/useSupabase";
import type { SessionPreferences } from "~/types/session";

/**
 * Composable for authentication operations
 *
 * Provides login, logout, signup, and session management.
 * Does NOT auto-initialize—caller must invoke restoreSession() explicitly.
 * Use isInitialized guard to prevent redundant initialization.
 *
 * @example
 * const { restoreSession, login } = useAuth()
 * await restoreSession()  // Restore existing session
 * const result = await login('user@example.com', 'password')
 *
 * @returns Object with auth actions and readonly state
 */
interface _AuthActions {
  restoreSession: () => Promise<Session | null>;
  login: (
    email: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<{
    data: { user: User | null; session: Session | null };
    error: null;
  }>;
  logout: () => Promise<void>;
  signup: (
    email: string,
    password: string,
    fullName?: string,
    role?: string,
  ) => Promise<{
    data: { user: User | null; session: Session | null } | null;
    error: any;
  }>;
  setupAuthListener: (callback: (user: User | null) => void) => () => void;
}

export const useAuth = () => {
  const supabase = useSupabase();

  // State
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const isInitialized = ref(false); // Guard to prevent redundant initialization
  const session = ref<Session | null>(null);
  const subscriptions: (() => void)[] = [];

  /**
   * Restores session from Supabase
   * Guards against redundant calls with isInitialized flag
   */
  const restoreSession = async () => {
    // Guard: prevent redundant calls
    if (isInitialized.value) {
      return null;
    }

    loading.value = true;
    error.value = null;

    try {
      const {
        data: { session: sessionData },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (sessionData?.user) {
        session.value = sessionData;
        isInitialized.value = true;
        // Store initialization is handled by caller
        return sessionData;
      }

      session.value = null;
      isInitialized.value = true;
      return null;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to restore session";
      error.value = err instanceof Error ? err : new Error(message);
      console.error(message);
      return null;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Login with email and password
   * @param email User email
   * @param password User password
   * @param rememberMe Whether to extend session to 30 days (defaults to false for 1 day)
   */
  const login = async (email: string, password: string, rememberMe = false) => {
    loading.value = true;
    error.value = null;

    try {
      const trimmedEmail = email.trim();

      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

      if (signInError) {
        error.value = signInError;
        throw signInError;
      }

      // Store initialization is handled by caller
      if (data.session?.user) {
        session.value = data.session;

        // Store session preferences in localStorage
        if (typeof window !== "undefined") {
          const preferences: SessionPreferences = {
            rememberMe,
            lastActivity: Date.now(),
            expiresAt: rememberMe
              ? Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
              : Date.now() + 24 * 60 * 60 * 1000, // 1 day
          };
          localStorage.setItem(
            "session_preferences",
            JSON.stringify(preferences),
          );
        }
      }

      return { data, error: null };
    } catch (err: unknown) {
      const authError = err instanceof Error ? err : new Error("Login failed");
      error.value = authError;
      throw authError;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Logout current user
   */
  const logout = async () => {
    loading.value = true;
    error.value = null;

    try {
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        throw signOutError;
      }

      // Clear session (store logout is handled by caller)
      session.value = null;
      isInitialized.value = false;

      // Clear session preferences from localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("session_preferences");
        localStorage.removeItem("last_activity");
      }
    } catch (err: unknown) {
      const authError = err instanceof Error ? err : new Error("Logout failed");
      error.value = authError;
      throw authError;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Sign up new user with optional full name and role
   */
  const signup = async (
    email: string,
    password: string,
    fullName?: string,
    role?: string,
  ) => {
    loading.value = true;
    error.value = null;

    try {
      const trimmedEmail = email.trim();

      const signUpParams: {
        email: string;
        password: string;
        options?: {
          data: {
            full_name?: string;
            role?: string;
          };
        };
      } = {
        email: trimmedEmail,
        password,
      };

      // Add full name and role to user metadata
      if (fullName || role) {
        signUpParams.options = {
          data: {
            ...(fullName && { full_name: fullName }),
            ...(role && { role }),
          },
        };
      }

      const { data, error: signUpError } =
        await supabase.auth.signUp(signUpParams);

      if (signUpError) {
        error.value = signUpError;
        throw signUpError;
      }

      // Store initialization is handled by caller

      return data;
    } catch (err: unknown) {
      const authError = err instanceof Error ? err : new Error("Signup failed");
      error.value = authError;
      throw authError;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Set up auth state change listener
   * Returns unsubscribe function and tracks subscription for cleanup
   */
  const setupAuthListener = (callback: (user: User | null) => void) => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: string, authSession: Session | null) => {
        callback(authSession?.user || null);
      },
    );

    const unsubscribe = () => {
      subscription?.unsubscribe();
    };

    // Track for automatic cleanup
    subscriptions.push(unsubscribe);

    // Return unsubscribe function
    return unsubscribe;
  };

  // Cleanup all subscriptions on component unmount
  // Only register lifecycle hook if in component context
  if (typeof getCurrentInstance === "function" && getCurrentInstance()) {
    onBeforeUnmount(() => {
      subscriptions.forEach((unsub) => unsub());
    });
  }

  return {
    // Readonly state
    loading: readonly(loading),
    error: readonly(error),
    isInitialized: readonly(isInitialized),
    session: readonly(session),

    // Auth actions
    restoreSession,
    login,
    logout,
    signup,
    setupAuthListener,
  };
};
