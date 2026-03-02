import { ref, readonly, onBeforeUnmount, getCurrentInstance } from "vue";
import type { User, Session } from "@supabase/supabase-js";
import { useSupabase } from "~/composables/useSupabase";
import type { SessionPreferences } from "~/types/session";
import { createClientLogger } from "~/utils/logger";

const logger = createClientLogger("useAuth");

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
    error: { message: string; status?: number } | null;
  }>;
  setupAuthListener: (callback: (user: User | null) => void) => () => void;
}

export const useAuth = () => {
  const supabase = useSupabase();

  // State
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const isInitialized = ref(false); // Guard to prevent redundant initialization
  const initializationAttempt = ref(false); // Track if initialization is in progress
  const session = ref<Session | null>(null);
  const subscriptions: (() => void)[] = [];

  /**
   * Restores session from Supabase
   * Guards against redundant calls with isInitialized flag
   * Prevents concurrent initialization attempts
   */
  const restoreSession = async (): Promise<Session | null> => {
    // Guard: already initialized, return current session
    if (isInitialized.value) {
      logger.debug(
        "[useAuth] Session already initialized, returning cached session",
      );
      return session.value;
    }

    // Guard: initialization already in progress, wait for it
    if (initializationAttempt.value) {
      logger.debug("[useAuth] Session initialization in progress, waiting...");
      // Wait for initialization to complete
      while (initializationAttempt.value && !isInitialized.value) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return session.value;
    }

    initializationAttempt.value = true;
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
        logger.debug(
          "[useAuth] Session restored successfully for user:",
          sessionData.user.email,
        );
        // Store initialization is handled by caller
        return sessionData;
      }

      session.value = null;
      isInitialized.value = true;
      logger.debug("[useAuth] No active session found");
      return null;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to restore session";
      error.value = err instanceof Error ? err : new Error(message);
      isInitialized.value = true;
      logger.error("[useAuth] Session restoration failed:", message);
      return null;
    } finally {
      loading.value = false;
      initializationAttempt.value = false;
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
        logger.debug(
          "[useAuth] Login successful for user:",
          data.session.user.email,
        );

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
          logger.debug("[useAuth] Session preferences stored");
        }
      } else {
        logger.warn("[useAuth] Login returned but no session in data");
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
          data: Record<string, string | boolean>;
        };
      } = {
        email: trimmedEmail,
        password,
      };

      // Build user metadata
      const metadata: Record<string, string | boolean> = {};

      if (fullName) {
        metadata.full_name = fullName;
      }

      if (role) {
        metadata.role = role;
      }

      // Add metadata if any values present
      if (Object.keys(metadata).length > 0) {
        signUpParams.options = {
          data: metadata,
        };
      }

      const { data, error: signUpError } =
        await supabase.auth.signUp(signUpParams);

      if (signUpError) {
        error.value = signUpError;
        throw signUpError;
      }

      // Store initialization is handled by caller

      return { data, error: null };
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

  // ============================================================================
  // DEBUG FUNCTIONS (from useAuthDebug - dev-only)
  // ============================================================================

  interface AuthDebugState {
    authUserId: string | null;
    authEmail: string | null;
    sessionUserId: string | null;
    sessionEmail: string | null;
    storeUserId: string | null;
    storeEmail: string | null;
    storeAuthenticated: boolean;
    storeLoading: boolean;
    isConsistent: boolean;
    issues: string[];
  }

  const getAuthState = async (): Promise<AuthDebugState> => {
    const { useUserStore } = await import("~/stores/user");
    const userStore = useUserStore();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    const {
      data: { session: authSession },
    } = await supabase.auth.getSession();

    const state: AuthDebugState = {
      authUserId: authUser?.id || null,
      authEmail: authUser?.email || null,
      sessionUserId: authSession?.user?.id || null,
      sessionEmail: authSession?.user?.email || null,
      storeUserId: userStore.user?.id || null,
      storeEmail: userStore.user?.email || null,
      storeAuthenticated: userStore.isAuthenticated,
      storeLoading: userStore.loading,
      isConsistent: true,
      issues: [],
    };

    // Check for inconsistencies
    if (
      state.authUserId &&
      state.storeUserId &&
      state.authUserId !== state.storeUserId
    ) {
      state.issues.push(
        `Auth user ID (${state.authUserId}) doesn't match store user ID (${state.storeUserId})`,
      );
      state.isConsistent = false;
    }

    if (
      state.authEmail &&
      state.storeEmail &&
      state.authEmail !== state.storeEmail
    ) {
      state.issues.push(
        `Auth email (${state.authEmail}) doesn't match store email (${state.storeEmail})`,
      );
      state.isConsistent = false;
    }

    if (
      state.sessionUserId &&
      state.storeUserId &&
      state.sessionUserId !== state.storeUserId
    ) {
      state.issues.push(
        `Session user ID (${state.sessionUserId}) doesn't match store user ID (${state.storeUserId})`,
      );
      state.isConsistent = false;
    }

    if (state.authUserId && !state.storeUserId) {
      state.issues.push("User is authenticated but store is empty");
      state.isConsistent = false;
    }

    if (!state.authUserId && state.storeUserId) {
      state.issues.push("Store has user ID but auth is empty");
      state.isConsistent = false;
    }

    return state;
  };

  const logAuthState = async () => {
    const state = await getAuthState();

    if (import.meta.dev) {
      console.group(
        `%c[Auth Debug] ${state.isConsistent ? "✅ CONSISTENT" : "❌ ISSUES DETECTED"}`,
        `color: ${state.isConsistent ? "green" : "red"}; font-weight: bold;`,
      );

      console.table({
        "Auth User ID": state.authUserId || "(empty)",
        "Auth Email": state.authEmail || "(empty)",
        "Session User ID": state.sessionUserId || "(empty)",
        "Session Email": state.sessionEmail || "(empty)",
        "Store User ID": state.storeUserId || "(empty)",
        "Store Email": state.storeEmail || "(empty)",
        "Store Authenticated": state.storeAuthenticated,
        "Store Loading": state.storeLoading,
      });

      if (state.issues.length > 0) {
        console.group(
          "%c⚠️ Issues Detected",
          "color: orange; font-weight: bold;",
        );
        state.issues.forEach((issue) => {
          console.warn(`• ${issue}`);
        });
        console.groupEnd();
      }

      console.groupEnd();
    }

    return state;
  };

  const compareAuthStates = async (
    state1: AuthDebugState,
    state2: AuthDebugState,
  ) => {
    const changes: Record<
      string,
      { before: string | null; after: string | null }
    > = {};

    if (state1.authUserId !== state2.authUserId) {
      changes.authUserId = {
        before: state1.authUserId,
        after: state2.authUserId,
      };
    }
    if (state1.authEmail !== state2.authEmail) {
      changes.authEmail = { before: state1.authEmail, after: state2.authEmail };
    }
    if (state1.storeUserId !== state2.storeUserId) {
      changes.storeUserId = {
        before: state1.storeUserId,
        after: state2.storeUserId,
      };
    }
    if (state1.storeEmail !== state2.storeEmail) {
      changes.storeEmail = {
        before: state1.storeEmail,
        after: state2.storeEmail,
      };
    }

    if (Object.keys(changes).length === 0) {
      if (import.meta.dev) {
        console.log(
          "%c✅ No auth state changes detected",
          "color: green; font-weight: bold;",
        );
      }
      return;
    }

    if (import.meta.dev) {
      console.group(
        "%c⚠️ Auth State Changes Detected",
        "color: orange; font-weight: bold;",
      );
      console.table(changes);
      console.groupEnd();
    }

    return changes;
  };

  const verifyUserIdStability = async () => {
    if (import.meta.dev) {
      console.log(
        "%c🔍 Starting User ID Stability Test",
        "color: blue; font-weight: bold; font-size: 1.2em;",
      );
    }

    const measurements = [];

    const state1 = await getAuthState();
    measurements.push({ step: "Initial", ...state1 });
    if (import.meta.dev) {
      console.log("Measurement 1 (Initial):", state1);
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
    const state2 = await getAuthState();
    measurements.push({ step: "After 100ms", ...state2 });
    if (import.meta.dev) {
      console.log("Measurement 2 (After 100ms):", state2);
    }

    await supabase.auth.getSession();
    const state3 = await getAuthState();
    measurements.push({ step: "After getSession()", ...state3 });
    if (import.meta.dev) {
      console.log("Measurement 3 (After getSession):", state3);
    }

    const areStable =
      state1.authUserId === state2.authUserId &&
      state2.authUserId === state3.authUserId &&
      state1.storeUserId === state2.storeUserId &&
      state2.storeUserId === state3.storeUserId;

    if (import.meta.dev) {
      console.group("%c📊 Stability Analysis", "color: blue; font-weight: bold;");
      if (areStable) {
        console.log(
          "%c✅ User IDs are STABLE across all operations",
          "color: green; font-weight: bold;",
        );
      } else {
        console.error(
          "%c❌ User IDs CHANGED during test - this is a bug!",
          "color: red; font-weight: bold;",
        );
        console.table(measurements);
      }
      console.groupEnd();
    }

    return { measurements, areStable };
  };

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

    // Dev-only debug exports (only in development mode)
    ...(process.env.NODE_ENV === "development" && {
      _debug: {
        getAuthState,
        logAuthState,
        compareAuthStates,
        verifyUserIdStability,
      },
    }),
  };
};
