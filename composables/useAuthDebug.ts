/**
 * Debug composable for diagnosing authentication and session issues
 *
 * Provides utilities to inspect auth state across:
 * - Supabase auth session
 * - Supabase auth user
 * - User store state
 *
 * @example
 * const { logAuthState, compareAuthStates } = useAuthDebug()
 * logAuthState() // Log current auth state to console
 *
 * @returns Object with debugging utilities
 */

import { useSupabase } from "~/composables/useSupabase";
import { useUserStore } from "~/stores/user";

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

export const useAuthDebug = () => {
  /**
   * Get comprehensive auth state snapshot
   */
  const getAuthState = async (): Promise<AuthDebugState> => {
    const supabase = useSupabase();
    const userStore = useUserStore();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const state: AuthDebugState = {
      authUserId: authUser?.id || null,
      authEmail: authUser?.email || null,
      sessionUserId: session?.user?.id || null,
      sessionEmail: session?.user?.email || null,
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

  /**
   * Log auth state to console in readable format
   */
  const logAuthState = async () => {
    const state = await getAuthState();

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

    return state;
  };

  /**
   * Compare auth state at two points in time
   * Useful for detecting when user_id changes
   */
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
      console.log(
        "%c✅ No auth state changes detected",
        "color: green; font-weight: bold;",
      );
      return;
    }

    console.group(
      "%c⚠️ Auth State Changes Detected",
      "color: orange; font-weight: bold;",
    );
    console.table(changes);
    console.groupEnd();

    return changes;
  };

  /**
   * Verify that user_id is stable across operations
   * Run this in browser console during testing
   */
  const verifyUserIdStability = async () => {
    console.log(
      "%c🔍 Starting User ID Stability Test",
      "color: blue; font-weight: bold; font-size: 1.2em;",
    );

    const measurements = [];

    // Measurement 1: Initial state
    const state1 = await getAuthState();
    measurements.push({ step: "Initial", ...state1 });
    console.log("Measurement 1 (Initial):", state1);

    // Measurement 2: After small delay
    await new Promise((resolve) => setTimeout(resolve, 100));
    const state2 = await getAuthState();
    measurements.push({ step: "After 100ms", ...state2 });
    console.log("Measurement 2 (After 100ms):", state2);

    // Measurement 3: After page refresh simulation
    const supabase = useSupabase();
    await supabase.auth.getSession();
    const state3 = await getAuthState();
    measurements.push({ step: "After getSession()", ...state3 });
    console.log("Measurement 3 (After getSession):", state3);

    // Compare all measurements
    console.group("%c📊 Stability Analysis", "color: blue; font-weight: bold;");
    const areStable =
      state1.authUserId === state2.authUserId &&
      state2.authUserId === state3.authUserId &&
      state1.storeUserId === state2.storeUserId &&
      state2.storeUserId === state3.storeUserId;

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

    return { measurements, areStable };
  };

  return {
    getAuthState,
    logAuthState,
    compareAuthStates,
    verifyUserIdStability,
  };
};
